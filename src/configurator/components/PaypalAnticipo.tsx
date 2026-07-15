/**
 * PaypalAnticipo.tsx
 * ─────────────────────────────────────────────────────────────────
 * Componente de pago via PayPal — acepta montos variables.
 *
 * Flujo seguro:
 *  1. createOrder  → SDK de PayPal crea la orden con el monto indicado
 *  2. onApprove    → SDK captura el pago (dinero real/sandbox debitado)
 *  3. Solo si captura OK → llama a guardarReserva() en Firestore
 *  4. onSuccess()  → notifica al padre con el ID de reserva
 */

import React, { useState } from 'react';
import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js';
import { motion, AnimatePresence } from 'framer-motion';
import { useReserva } from '../hooks/useReserva';
import type { ColoresConfig, ClienteInfo } from '../services/reservaService';

interface PaypalAnticipoProps {
  productType: string;
  colores: ColoresConfig;
  currentUser: ClienteInfo;
  onSuccess: (reservaId: string) => void;
  onError?: (msg: string) => void;
  /** Monto a cobrar en USD (default: 50) */
  amount?: number;
  /** Descripción para la orden de PayPal */
  orderDescription?: string;
  /** Si es true, PayPal pide dirección de envío */
  shippingRequired?: boolean;
}

const BotonesPayPal: React.FC<PaypalAnticipoProps> = ({
  productType,
  colores,
  currentUser,
  onSuccess,
  onError,
  amount = 50,
  orderDescription,
  shippingRequired = false,
}) => {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [procesando, setProcesando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const { ejecutarReserva } = useReserva();
  const montoStr = amount.toFixed(2);
  const desc = orderDescription ?? `Anticipo — Controlador MIDI ${productType.toUpperCase()} personalizado`;

  const handleCreateOrder = (_data: Record<string, unknown>, actions: any): Promise<string> => {
    setErrorLocal(null);
    return actions.order.create({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: 'USD', value: montoStr },
          description: desc,
          custom_id: `${currentUser.email}|${productType}|${Date.now()}`,
        },
      ],
      application_context: {
        brand_name: 'Creart.Tech',
        locale: 'es-CO',
        user_action: 'PAY_NOW',
        shipping_preference: shippingRequired ? 'GET_FROM_FILE' : 'NO_SHIPPING',
      },
    });
  };

  const handleApprove = async (data: { orderID: string }, actions: any): Promise<void> => {
    setProcesando(true);
    setErrorLocal(null);

    try {
      const captureResult = await actions.order.capture();
      const captureId: string =
        captureResult?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? '';

      if (!captureId) {
        throw new Error('PayPal no devolvió un ID de captura válido.');
      }

      const reserva = await ejecutarReserva({
        cliente: currentUser,
        modelo: productType,
        colores,
        pagoInfo: {
          paypalOrderId: data.orderID,
          paypalCaptureId: captureId,
        },
      });

      if (reserva) {
        onSuccess(reserva.id);
      }
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : 'Error al procesar el pago. Intenta de nuevo.';
      setErrorLocal(msg);
      onError?.(msg);
    } finally {
      setProcesando(false);
    }
  };

  const handleCancel = () => {
    setErrorLocal('Cancelaste el pago. Puedes intentarlo de nuevo cuando quieras.');
  };

  const handleError = (err: Record<string, unknown>) => {
    console.error('PayPal SDK error:', err);
    const msg = 'Ocurrió un error con PayPal. Verifica tu conexión e intenta de nuevo.';
    setErrorLocal(msg);
    onError?.(msg);
  };

  return (
    <div className="w-full space-y-4">
      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Cargo a realizar</p>
          <p className="text-white font-bold text-lg">{desc.length > 40 ? desc.slice(0, 40) + '…' : desc}</p>
          <p className="text-gray-500 text-xs mt-0.5">
            Controlador {productType.toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <p
            className="text-3xl font-black"
            style={{
              background: 'linear-gradient(90deg, #00ffff, #a259ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ${amount}
          </p>
          <p className="text-gray-500 text-xs">USD</p>
        </div>
      </div>

      {isPending && (
        <div className="w-full h-12 rounded-lg animate-pulse bg-white/5" />
      )}

      {isRejected && (
        <p className="text-red-400 text-sm text-center py-3">
          No se pudo cargar PayPal. Verifica tu conexión e intenta de nuevo.
        </p>
      )}

      <AnimatePresence>
        {procesando && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-3 py-3"
          >
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#a259ff', borderTopColor: 'transparent' }}
            />
            <span className="text-gray-300 text-sm">Procesando pago seguro...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!isPending && !isRejected && !procesando && (
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'black',
            shape: 'rect',
            label: 'pay',
            height: 48,
          }}
          disabled={procesando}
          createOrder={handleCreateOrder}
          onApprove={handleApprove}
          onCancel={handleCancel}
          onError={handleError}
        />
      )}

      <AnimatePresence>
        {errorLocal && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm px-2"
            style={{ color: errorLocal.includes('Cancelaste') ? '#fbbf24' : '#f87171' }}
          >
            {errorLocal}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="text-center text-xs text-gray-600">
        🔒 Pago procesado directamente por PayPal · Creart.Tech no almacena datos de tu tarjeta
      </p>
    </div>
  );
};

const PaypalAnticipo: React.FC<PaypalAnticipoProps> = (props) => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID ?? 'sb';

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: 'USD',
        intent: 'capture',
        locale: 'es_CO',
        components: 'buttons',
      }}
    >
      <BotonesPayPal {...props} />
    </PayPalScriptProvider>
  );
};

export default PaypalAnticipo;
