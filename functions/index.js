/**
 * Cloud Functions — CREART.TECH
 * ──────────────────────────────────────────────────────────────────
 * crearReservaVerificada  — Verifica pago PayPal y crea la reserva
 * cotizarEnvio            — Consulta tarifas de envío vía Shippo
 * enviarCorreoReserva     — Notifica al dueño por email
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { Shippo } from 'shippo';

initializeApp();
const db = getFirestore();

// ── Constantes de negocio ─────────────────────────────────────────
const MONTO_MINIMO_USD = 50;
const MONEDA = 'USD';
const MODELOS_VALIDOS = ['beato', 'beato8', 'beato16', 'knobo', 'mixo', 'loopo', 'fado', 'wavo'];

// Precios de los productos en USD
const PRECIOS_USD = {
  beato8: 189, beato16: 249, knobo: 149, mixo: 199,
  loopo: 169, fado: 179, wavo: 329,
};

// Pesos y dimensiones estimados de cada producto (para cotización de envío)
const PRODUCT_PARCELS = {
  beato8:  { length: 30, width: 22, height: 8,  weight: 0.7,  massUnit: 'kg', distanceUnit: 'cm' },
  beato16: { length: 35, width: 25, height: 8,  weight: 0.9,  massUnit: 'kg', distanceUnit: 'cm' },
  knobo:   { length: 28, width: 18, height: 7,  weight: 0.5,  massUnit: 'kg', distanceUnit: 'cm' },
  mixo:    { length: 32, width: 22, height: 9,  weight: 0.8,  massUnit: 'kg', distanceUnit: 'cm' },
  loopo:   { length: 30, width: 20, height: 7,  weight: 0.6,  massUnit: 'kg', distanceUnit: 'cm' },
  fado:    { length: 35, width: 15, height: 7,  weight: 0.6,  massUnit: 'kg', distanceUnit: 'cm' },
  wavo:    { length: 40, width: 28, height: 10, weight: 1.2,  massUnit: 'kg', distanceUnit: 'cm' },
};

const PAYPAL_HOSTS = {
  live: 'https://api-m.paypal.com',
  sandbox: 'https://api-m.sandbox.paypal.com',
};

const MAX_COLOR_KEYS = 200;
const MAX_KEY_LEN = 60;
const MAX_VALUE_LEN = 60;

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

// ══════════════════════════════════════════════════════════════════
// crearReservaVerificada — Acepta montos variables ($50 a precio completo)
// ══════════════════════════════════════════════════════════════════

export const crearReservaVerificada = onCall(
  {
    secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_SECRET', 'PAYPAL_MODE'],
    region: 'us-central1',
    enforceAppCheck: false, // TODO-LAUNCH: cambiar a true
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión para reservar.');
    }
    const uid = request.auth.uid;
    const email = request.auth.token.email || '';
    const nombre = request.auth.token.name || email.split('@')[0] || 'Cliente';

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

    // Idempotencia
    const existing = await db.collection('reservas')
      .where('pago.paypalOrderId', '==', orderID)
      .limit(1)
      .get();
    if (!existing.empty) {
      return { reservaId: existing.docs[0].id, yaExistia: true };
    }

    // Verificar pago con PayPal
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

    // Validar monto: mínimo $50, máximo = precio del producto
    const montoPagado = parseFloat(amount?.value || '0');
    const precioProducto = PRECIOS_USD[modelo] || 999;
    if (amount?.currency_code !== MONEDA) {
      throw new HttpsError('failed-precondition', `Moneda incorrecta (recibido: ${amount?.currency_code}).`);
    }
    if (montoPagado < MONTO_MINIMO_USD) {
      throw new HttpsError('failed-precondition', `Monto mínimo: $${MONTO_MINIMO_USD} USD (recibido: $${montoPagado}).`);
    }
    if (montoPagado > precioProducto + 200) {
      // +200 margin for shipping costs included
      throw new HttpsError('failed-precondition', `Monto excede el precio del producto.`);
    }

    const esCompraCompleta = montoPagado >= precioProducto;
    const estadoPago = esCompraCompleta ? 'pagado_completo' : 'anticipo_pagado';

    const docRef = await db.collection('reservas').add({
      cliente: { nombre, email, uid },
      controlador: {
        modelo: String(modelo).toLowerCase(),
        colores,
      },
      pago: {
        estado: estadoPago,
        montoPagado,
        montoTotal: precioProducto,
        saldoPendiente: Math.max(0, precioProducto - montoPagado),
        moneda: MONEDA,
        paypalOrderId: orderID,
        paypalCaptureId: capture.id,
        pagadoEn: FieldValue.serverTimestamp(),
        verificadoServidor: true,
        modoPaypal: paypalBase() === PAYPAL_HOSTS.live ? 'live' : 'sandbox',
      },
      meta: {
        creadoEn: FieldValue.serverTimestamp(),
        actualizadoEn: FieldValue.serverTimestamp(),
        version: 3,
      },
    });

    return { reservaId: docRef.id, yaExistia: false };
  }
);

// ══════════════════════════════════════════════════════════════════
// cotizarEnvio — Devuelve tarifas de envío de múltiples carriers
// ══════════════════════════════════════════════════════════════════

export const cotizarEnvio = onCall(
  {
    region: 'us-central1',
    enforceAppCheck: false, // TODO-LAUNCH: cambiar a true
  },
  async (request) => {
    const apiKey = process.env.SHIPPO_API_KEY;
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'Shippo API no configurada.');
    }

    const { modelo, countryCode } = request.data || {};

    if (!MODELOS_VALIDOS.includes(String(modelo))) {
      throw new HttpsError('invalid-argument', 'Modelo inválido.');
    }
    if (!countryCode || typeof countryCode !== 'string' || countryCode.length !== 2) {
      throw new HttpsError('invalid-argument', 'Código de país inválido (ISO 2 letras).');
    }

    const parcel = PRODUCT_PARCELS[modelo];
    if (!parcel) {
      throw new HttpsError('invalid-argument', 'No hay dimensiones configuradas para este producto.');
    }

    const shippo = new Shippo({ apiKeyHeader: apiKey });

    const shipment = await shippo.shipments.create({
      addressFrom: {
        name: 'CREART.TECH',
        company: 'CREART.TECH',
        street1: 'Bogotá',
        city: 'Bogotá',
        state: 'Cundinamarca',
        zip: '110111',
        country: 'CO',
        phone: '+57 316 7460914',
        email: 'creart.tech.col@gmail.com',
      },
      addressTo: {
        name: 'Cliente',
        country: countryCode.toUpperCase(),
        // Shippo solo necesita el país para cotizar tarifas internacionales
        city: '',
        zip: '',
      },
      parcels: [{
        length: String(parcel.length),
        width: String(parcel.width),
        height: String(parcel.height),
        distanceUnit: parcel.distanceUnit,
        weight: String(parcel.weight),
        massUnit: parcel.massUnit,
      }],
      async: false,
    });

    // Filtrar y mapear tarifas relevantes
    const rates = (shipment.rates || [])
      .filter(r => r.amount && parseFloat(r.amount) > 0)
      .map(r => ({
        carrier: r.provider || 'Carrier',
        service: r.servicelevel?.name || r.servicelevel?.token || 'Standard',
        price: parseFloat(r.amount),
        currency: r.currency || 'USD',
        days: r.estimatedDays || r.durationTerms || null,
        objectId: r.objectId,
      }))
      .sort((a, b) => a.price - b.price);

    return {
      rates,
      fromCountry: 'CO',
      toCountry: countryCode.toUpperCase(),
      modelo,
    };
  }
);

// ══════════════════════════════════════════════════════════════════
// enviarCorreoReserva — Notificación al dueño por cada reserva nueva
// ══════════════════════════════════════════════════════════════════

function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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

    let seccionesColores = '';
    if (colores.chasis) {
      seccionesColores += `<tr><td style="padding:3px 10px;color:#555">Chasis</td><td style="padding:3px 10px"><strong>${esc(colores.chasis)}</strong></td></tr>`;
    }
    for (const [grupo, valores] of Object.entries(colores)) {
      if (grupo === 'chasis' || typeof valores !== 'object') continue;
      seccionesColores += `<tr><td colspan="2" style="padding:8px 10px 3px;color:#0a7;text-transform:uppercase;font-size:12px;letter-spacing:1px">${esc(grupo)}</td></tr>`;
      seccionesColores += filasColores(valores);
    }

    const montoPagado = pago.montoPagado || pago.montoAnticipo || 50;
    const saldo = pago.saldoPendiente ?? 0;

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
            <tr><td style="padding:3px 10px;color:#555">Monto pagado</td><td style="padding:3px 10px"><strong>$${esc(montoPagado)} ${esc(pago.moneda || pago.monedaAnticipo || 'USD')}</strong> (${esLive ? 'LIVE' : 'sandbox'})</td></tr>
            <tr><td style="padding:3px 10px;color:#555">Estado</td><td style="padding:3px 10px"><strong>${esc(pago.estado)}</strong></td></tr>
            ${saldo > 0 ? `<tr><td style="padding:3px 10px;color:#555">Saldo pendiente</td><td style="padding:3px 10px;color:#e53e3e"><strong>$${esc(saldo)} USD</strong></td></tr>` : ''}
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
