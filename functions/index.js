/**
 * Cloud Functions — CREART.TECH
 * ──────────────────────────────────────────────────────────────────
 * crearReservaVerificada
 *
 * Verifica del lado del servidor que un pago de PayPal sea REAL antes
 * de guardar la reserva en Firestore. El cliente nunca escribe en la
 * colección "reservas" directamente — solo esta función (con permisos
 * de admin) puede hacerlo.
 *
 * Flujo:
 *  1. El frontend captura el pago con el SDK de PayPal y obtiene orderID.
 *  2. Llama a esta función con { orderID, modelo, colores }.
 *  3. La función pide a la API de PayPal los datos reales de esa orden.
 *  4. Comprueba: estado COMPLETED + monto 50.00 USD + captura válida.
 *  5. Solo si todo cuadra, escribe la reserva (Admin SDK ignora reglas).
 *
 * Secretos requeridos (firebase functions:secrets:set):
 *  - PAYPAL_CLIENT_ID
 *  - PAYPAL_SECRET
 *  - PAYPAL_MODE   ("live" | "sandbox")  → opcional, default "sandbox"
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

initializeApp();
const db = getFirestore();

// ── Constantes de negocio ─────────────────────────────────────────
const MONTO_ANTICIPO = '50.00';
const MONEDA = 'USD';
const MODELOS_VALIDOS = ['beato', 'beato8', 'beato16', 'knobo', 'mixo', 'loopo', 'fado', 'wavo'];

const PAYPAL_HOSTS = {
  live: 'https://api-m.paypal.com',
  sandbox: 'https://api-m.sandbox.paypal.com',
};

// Límites anti-abuso para la configuración de colores que envía el cliente.
// Evita que un atacante autenticado infle documentos de Firestore con basura.
const MAX_COLOR_KEYS = 200;
const MAX_KEY_LEN = 60;
const MAX_VALUE_LEN = 60;

/**
 * Valida la estructura de `colores` en profundidad.
 * Acepta: { chasis: "#fff", botones: {b1:"#000",...}, perillas: {...} }
 * — solo strings u objetos planos de strings, con límites de tamaño.
 */
function validarColores(colores) {
  if (!colores || typeof colores !== 'object' || Array.isArray(colores)) return false;
  let totalKeys = 0;
  for (const [k, v] of Object.entries(colores)) {
    if (typeof k !== 'string' || k.length > MAX_KEY_LEN) return false;
    totalKeys++;
    if (typeof v === 'string') {
      if (v.length > MAX_VALUE_LEN) return false;
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v)) {
        if (typeof k2 !== 'string' || k2.length > MAX_KEY_LEN) return false;
        if (typeof v2 !== 'string' || v2.length > MAX_VALUE_LEN) return false;
        totalKeys++;
        if (totalKeys > MAX_COLOR_KEYS) return false;
      }
    } else {
      return false;
    }
    if (totalKeys > MAX_COLOR_KEYS) return false;
  }
  return true;
}

// ── Helpers PayPal ────────────────────────────────────────────────

function paypalBase() {
  const mode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
  return PAYPAL_HOSTS[mode] || PAYPAL_HOSTS.sandbox;
}

async function getPaypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) {
    throw new HttpsError('failed-precondition', 'Credenciales de PayPal no configuradas en el servidor.');
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new HttpsError('unavailable', 'No se pudo autenticar con PayPal.');
  }
  const data = await res.json();
  return data.access_token;
}

async function getPaypalOrder(orderID, accessToken) {
  const res = await fetch(`${paypalBase()}/v2/checkout/orders/${encodeURIComponent(orderID)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) {
    throw new HttpsError('not-found', 'La orden de PayPal no existe.');
  }
  if (!res.ok) {
    throw new HttpsError('unavailable', 'No se pudo consultar la orden en PayPal.');
  }
  return res.json();
}

// ── Función principal ─────────────────────────────────────────────

export const crearReservaVerificada = onCall(
  {
    secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_SECRET', 'PAYPAL_MODE'],
    region: 'us-central1',
    // ── TODO-LAUNCH: App Check ──────────────────────────────────
    // Cuando actives App Check en la consola de Firebase (reCAPTCHA
    // Enterprise para web) cambia esto a `true` para que SOLO tu app
    // pueda invocar la función (bloquea bots/scripts directos):
    enforceAppCheck: false,
  },
  async (request) => {
    // 1. Exigir usuario autenticado
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión para reservar.');
    }
    const uid = request.auth.uid;
    const email = request.auth.token.email || '';
    const nombre = request.auth.token.name || email.split('@')[0] || 'Cliente';

    // 2. Validar entrada
    const { orderID, modelo, colores } = request.data || {};
    if (!orderID || typeof orderID !== 'string') {
      throw new HttpsError('invalid-argument', 'Falta el ID de la orden de PayPal.');
    }
    if (!MODELOS_VALIDOS.includes(String(modelo))) {
      throw new HttpsError('invalid-argument', 'Modelo de controlador inválido.');
    }
    if (!validarColores(colores)) {
      throw new HttpsError('invalid-argument', 'Configuración de colores inválida.');
    }

    // 3. Idempotencia: si ya existe una reserva con este orderID, no duplicar
    const existing = await db.collection('reservas')
      .where('pago.paypalOrderId', '==', orderID)
      .limit(1)
      .get();
    if (!existing.empty) {
      return { reservaId: existing.docs[0].id, yaExistia: true };
    }

    // 4. Verificar el pago con PayPal (server-side, fuente de verdad)
    const accessToken = await getPaypalAccessToken();
    const order = await getPaypalOrder(orderID, accessToken);

    if (order.status !== 'COMPLETED') {
      throw new HttpsError('failed-precondition', `El pago no está completado (estado: ${order.status}).`);
    }

    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    const amount = capture?.amount;
    if (!capture || capture.status !== 'COMPLETED') {
      throw new HttpsError('failed-precondition', 'No se encontró una captura válida del pago.');
    }
    if (amount?.value !== MONTO_ANTICIPO || amount?.currency_code !== MONEDA) {
      throw new HttpsError(
        'failed-precondition',
        `El monto pagado no coincide (recibido: ${amount?.value} ${amount?.currency_code}).`
      );
    }

    // 5. Pago verificado → guardar reserva con Admin SDK
    const docRef = await db.collection('reservas').add({
      cliente: { nombre, email, uid },
      controlador: {
        modelo: String(modelo).toLowerCase(),
        colores,
      },
      pago: {
        estado: 'anticipo_pagado',
        montoAnticipo: 50,
        monedaAnticipo: MONEDA,
        paypalOrderId: orderID,
        paypalCaptureId: capture.id,
        pagadoEn: FieldValue.serverTimestamp(),
        verificadoServidor: true,
        // Distingue pagos de prueba (sandbox) de pagos reales (live)
        // para que ningún pedido de prueba se confunda con uno real.
        modoPaypal: paypalBase() === PAYPAL_HOSTS.live ? 'live' : 'sandbox',
      },
      meta: {
        creadoEn: FieldValue.serverTimestamp(),
        actualizadoEn: FieldValue.serverTimestamp(),
        version: 2,
      },
    });

    return { reservaId: docRef.id, yaExistia: false };
  }
);

// ══════════════════════════════════════════════════════════════════
// enviarCorreoReserva — Notificación al dueño por cada reserva nueva
// ──────────────────────────────────────────────────────────────────
// Trigger de Firestore: se dispara cuando `crearReservaVerificada`
// escribe un documento en `reservas/`. Está desacoplado del pago a
// propósito: si el correo falla, la reserva YA está guardada y el
// pago YA está verificado — solo se pierde la notificación (y queda
// registrada en los logs para reintentarla a mano).
//
// Secretos requeridos (firebase functions:secrets:set):
//  - EMAIL_USER  → cuenta Gmail que envía (ej. creart.tech.col@gmail.com)
//  - EMAIL_PASS  → App Password de Gmail (NO la contraseña normal;
//                  se genera en myaccount.google.com/apppasswords)
//  - EMAIL_TO    → destinatario de los avisos (puede ser el mismo)
// ══════════════════════════════════════════════════════════════════

/** Escapa texto para incrustarlo en HTML (evita inyección en el correo). */
function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Filas HTML para un grupo de colores {nombre → color}. */
function filasColores(grupo) {
  if (!grupo || typeof grupo !== 'object') return '';
  return Object.entries(grupo)
    .map(([k, v]) => `<tr><td style="padding:3px 10px;color:#555">${esc(k)}</td><td style="padding:3px 10px"><strong>${esc(v)}</strong></td></tr>`)
    .join('');
}

export const enviarCorreoReserva = onDocumentCreated(
  {
    document: 'reservas/{reservaId}',
    secrets: ['EMAIL_USER', 'EMAIL_PASS', 'EMAIL_TO'],
    region: 'us-central1',
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const to = process.env.EMAIL_TO || user;
    if (!user || !pass) {
      console.error('[correo] EMAIL_USER / EMAIL_PASS no configurados — reserva sin notificar:', event.params.reservaId);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    });

    const { cliente = {}, controlador = {}, pago = {} } = data;
    const colores = controlador.colores || {};
    const esLive = pago.modoPaypal === 'live';

    // Secciones de color: chasis + cada grupo presente
    let seccionesColores = '';
    if (colores.chasis) {
      seccionesColores += `<tr><td style="padding:3px 10px;color:#555">Chasis</td><td style="padding:3px 10px"><strong>${esc(colores.chasis)}</strong></td></tr>`;
    }
    for (const [grupo, valores] of Object.entries(colores)) {
      if (grupo === 'chasis' || typeof valores !== 'object') continue;
      seccionesColores += `<tr><td colspan="2" style="padding:8px 10px 3px;color:#0a7;text-transform:uppercase;font-size:12px;letter-spacing:1px">${esc(grupo)}</td></tr>`;
      seccionesColores += filasColores(valores);
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden">
        <div style="background:#0E0E10;padding:18px 24px">
          <h2 style="color:#00E5FF;margin:0;font-size:18px">⚡ Nueva reserva — CREART.TECH</h2>
          ${esLive ? '' : '<p style="color:#FFB020;margin:6px 0 0;font-size:12px;font-weight:bold">⚠ PAGO SANDBOX (prueba, no es dinero real)</p>'}
        </div>
        <div style="padding:20px 24px">
          <h3 style="margin:0 0 4px;font-size:22px">${esc(String(controlador.modelo || '').toUpperCase())}</h3>
          <p style="margin:0 0 16px;color:#777;font-size:13px">Reserva <code>${esc(event.params.reservaId)}</code></p>

          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
            <tr><td style="padding:3px 10px;color:#555">Cliente</td><td style="padding:3px 10px"><strong>${esc(cliente.nombre)}</strong></td></tr>
            <tr><td style="padding:3px 10px;color:#555">Email</td><td style="padding:3px 10px"><a href="mailto:${esc(cliente.email)}">${esc(cliente.email)}</a></td></tr>
            <tr><td style="padding:3px 10px;color:#555">Anticipo</td><td style="padding:3px 10px"><strong>$${esc(pago.montoAnticipo)} ${esc(pago.monedaAnticipo)}</strong> (${esLive ? 'LIVE' : 'sandbox'})</td></tr>
            <tr><td style="padding:3px 10px;color:#555">PayPal Order</td><td style="padding:3px 10px"><code>${esc(pago.paypalOrderId)}</code></td></tr>
            <tr><td style="padding:3px 10px;color:#555">PayPal Capture</td><td style="padding:3px 10px"><code>${esc(pago.paypalCaptureId)}</code></td></tr>
          </table>

          <h4 style="margin:0 0 6px;font-size:14px;color:#333">Configuración pedida</h4>
          <table style="width:100%;border-collapse:collapse;font-size:14px;background:#fafafa;border-radius:8px">
            ${seccionesColores || '<tr><td style="padding:8px 10px;color:#999">Sin colores personalizados</td></tr>'}
          </table>
        </div>
      </div>`;

    await transporter.sendMail({
      from: `"CREART.TECH Reservas" <${user}>`,
      to,
      replyTo: cliente.email || undefined,
      subject: `${esLive ? '⚡' : '🧪'} Reserva ${String(controlador.modelo || '').toUpperCase()} — ${cliente.nombre || 'Cliente'}`,
      html,
    });

    console.log('[correo] Notificación enviada para reserva', event.params.reservaId);
  }
);
