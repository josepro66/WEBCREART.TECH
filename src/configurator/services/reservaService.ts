/**
 * reservaService.ts
 * ─────────────────────────────────────────────────────────────────
 * Servicio para guardar reservas de controladores MIDI en Firestore.
 *
 * Estructura del documento (colección "reservas"):
 * ─────────────────────────────────────────────────────────────────
 * reservas/{reservaId}
 * {
 *   cliente: {
 *     nombre: string,
 *     email:  string,
 *   },
 *   controlador: {
 *     modelo: string,            // "beato8" | "mixo" | ...
 *     colores: {
 *       chasis:   string,
 *       botones:  Record<string, string>,
 *       perillas: Record<string, string>,
 *     }
 *   },
 *   pago: {
 *     estado:          "anticipo_pagado",
 *     montoAnticipo:   50,
 *     monedaAnticipo:  "USD",
 *     paypalOrderId:   string,   // ID de la orden de PayPal (data.orderID)
 *     paypalCaptureId: string,   // ID de la captura (capture.id) — prueba real del pago
 *     pagadoEn:        Timestamp,
 *   },
 *   meta: {
 *     creadoEn:      Timestamp,
 *     actualizadoEn: Timestamp,
 *     version:       number,
 *   }
 * }
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig';

// ─── Tipos ────────────────────────────────────────────────────────

export interface ClienteInfo {
  nombre: string;
  email: string;
}

/**
 * Colores de la configuración: `chasis` + los grupos que tenga el
 * hardware (botones, perillas, teclas, faders...). La Cloud Function
 * valida en el servidor que solo sean strings/mapas planos con límites.
 */
export type ColoresConfig = Record<string, string | Record<string, string>>;

/** Datos del pago confirmado por PayPal */
export interface PagoInfo {
  paypalOrderId: string;   // data.orderID del onApprove
  paypalCaptureId: string; // capture.purchase_units[0].payments.captures[0].id
}

export interface ReservaPayload {
  cliente: ClienteInfo;
  modelo: string;
  colores: ColoresConfig;
  pagoInfo: PagoInfo;      // Solo se llama con datos reales tras captura exitosa
}

export interface ReservaGuardada {
  id: string;
  payload: ReservaPayload;
}

// ─── Errores de la Cloud Function → mensajes amigables ────────────

const FUNCTION_ERRORS: Record<string, string> = {
  'unauthenticated':      'Tu sesión expiró. Por favor vuelve a iniciar sesión.',
  'permission-denied':    'No tienes permisos para guardar la reserva.',
  'failed-precondition':  'No pudimos verificar tu pago con PayPal. Tu pago fue procesado correctamente — contáctanos con tu ID de orden.',
  'not-found':            'No encontramos la orden de pago. Contáctanos con tu ID de orden de PayPal.',
  'unavailable':          'Sin conexión con el servidor de pagos. Verifica tu internet e intenta de nuevo.',
  'invalid-argument':     'Datos de la reserva inválidos. Revisa tu configuración e intenta de nuevo.',
};

// ─── Función principal ────────────────────────────────────────────

/**
 * Registra la reserva llamando a la Cloud Function `crearReservaVerificada`,
 * que verifica el pago con la API de PayPal del lado del servidor ANTES de
 * escribir en Firestore. El cliente ya NO escribe la reserva directamente.
 */
export async function guardarReserva(
  payload: ReservaPayload
): Promise<ReservaGuardada> {

  // Validaciones de entrada
  if (!payload.cliente.email?.includes('@')) {
    throw new Error('El email del cliente no es válido.');
  }
  if (!payload.modelo) {
    throw new Error('El modelo del controlador es requerido.');
  }
  if (!payload.pagoInfo?.paypalOrderId) {
    throw new Error('Datos de pago incompletos. No se puede registrar la reserva sin la orden de PayPal.');
  }

  try {
    const crearReservaVerificada = httpsCallable<
      { orderID: string; modelo: string; colores: ColoresConfig },
      { reservaId: string; yaExistia: boolean }
    >(functions, 'crearReservaVerificada');

    const result = await crearReservaVerificada({
      orderID: payload.pagoInfo.paypalOrderId,
      modelo: payload.modelo.toLowerCase(),
      colores: payload.colores,
    });

    return { id: result.data.reservaId, payload };
  } catch (err) {
    const code = (err as { code?: string })?.code?.replace('functions/', '') || '';
    const mensajeAmigable =
      FUNCTION_ERRORS[code] ??
      'Ocurrió un error al registrar tu reserva. Si tu pago fue procesado, contáctanos con tu ID de orden de PayPal.';
    throw new Error(mensajeAmigable);
  }
}
