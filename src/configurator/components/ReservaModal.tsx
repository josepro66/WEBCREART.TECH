/**
 * ReservaModal.tsx
 * ─────────────────────────────────────────────────────────────────
 * Modal de 2 pasos:
 *  Paso 1 — Resumen visual de la configuración + info del anticipo
 *  Paso 2 — Botones de PayPal (pago real $50 USD)
 *
 * El guardado en Firestore ocurre DENTRO de PaypalAnticipo,
 * SOLO si el pago fue capturado exitosamente por PayPal.
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PaypalAnticipo from './PaypalAnticipo';
import { useAuth } from '../../auth/AuthContext';
import { PRODUCT_IDENTITY, type ProductId } from '../productIdentity';

// ─── Paleta de colores ────────────────────────────────────────────

const COLOR_HEX: Record<string, string> = {
  'Verde':    '#7CBA40',
  'Amarillo': '#F3E600',
  'Azul':     '#325EB7',
  'Blanco':   '#F5F5F5',
  'Naranja':  '#F47119',
  'Morado':   '#7B217E',
  'Rojo':     '#E52421',
  'Negro':    '#1C1C1C',
  'Rosa':     '#FF007F',
  'Gris':     '#808080',
};

const PRODUCT_PRICES: Record<string, string> = {
  beato16: '$1.000.000 COP',
  mixo:    '$850.000 COP',
  beato8:  '$750.000 COP',
  fado:    '$650.000 COP',
  loopo:   '$500.000 COP',
  knobo:   '$450.000 COP',
};

const PRODUCT_LABELS: Record<string, string> = {
  beato16: 'BEATO 16',
  mixo:    'MIXO',
  beato8:  'BEATO 8',
  fado:    'FADO',
  loopo:   'LOOPO',
  knobo:   'KNOBO',
  wavo:    'WAVO',
};

// Etiquetas humanas por grupo de color (cada configurador tiene sus grupos)
const GROUP_LABELS: Record<string, { plural: string; singular: string }> = {
  buttons: { plural: 'Botones',  singular: 'Botón' },
  knobs:   { plural: 'Perillas', singular: 'Perilla' },
  teclas:  { plural: 'Teclas',   singular: 'Tecla' },
  keys:    { plural: 'Teclas',   singular: 'Tecla' },
  faders:  { plural: 'Faders',   singular: 'Fader' },
};

// ─── Tipos ────────────────────────────────────────────────────────

/**
 * Colores elegidos: `chasis` + cualquier grupo de {nombre → color}.
 * Cada configurador aporta los grupos que su hardware tiene
 * (buttons/knobs/teclas/faders/keys). `type` se ignora.
 */
export interface ChosenColors {
  chasis: string;
  [group: string]: string | Record<string, string> | undefined;
}

interface Usuario {
  nombre: string;
  email: string;
}

interface ReservaModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Se llama tras pago + guardado exitosos (recibe el ID de Firestore) */
  onPagoExitoso?: (reservaId: string) => void;
  productType: string;
  chosenColors: ChosenColors;
  /** Opcional: si no se pasa, se toma del usuario autenticado (useAuth). */
  currentUser?: Usuario;
}

type Paso = 'resumen' | 'pago';

// ─── Sub-componente: fila de color ────────────────────────────────

const ColorRow: React.FC<{ label: string; colorName: string; index: number }> = ({
  label, colorName, index,
}) => {
  const hex     = COLOR_HEX[colorName] ?? '#444';
  const isLight = ['Blanco', 'Amarillo'].includes(colorName);

  return (
    <motion.li
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.055, duration: 0.3 }}
      className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
    >
      <span className="text-gray-400 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-white text-sm font-semibold">{colorName}</span>
        <span
          className="w-5 h-5 rounded-full border-2 flex-shrink-0"
          style={{
            backgroundColor: hex,
            borderColor: isLight ? '#555' : hex,
            boxShadow: `0 0 8px ${hex}80`,
          }}
        />
      </div>
    </motion.li>
  );
};

// ─── Modal principal ──────────────────────────────────────────────

const ReservaModal: React.FC<ReservaModalProps> = ({
  isOpen,
  onClose,
  onPagoExitoso,
  productType,
  chosenColors,
  currentUser,
}) => {
  const [paso, setPaso] = useState<Paso>('resumen');

  // Usuario: prop explícita o el autenticado en Firebase (los configuradores
  // viven detrás del login, así que aquí siempre hay sesión).
  const { user: fbUser } = useAuth();
  const usuario: Usuario = currentUser ?? {
    nombre: fbUser?.displayName || fbUser?.email?.split('@')[0] || 'Cliente',
    email:  fbUser?.email || '',
  };

  // Volver al resumen al cerrar
  const handleClose = () => {
    setPaso('resumen');
    onClose();
  };

  // Éxito: pago capturado + Firestore guardado
  const handlePagoExitoso = (reservaId: string) => {
    handleClose();
    onPagoExitoso?.(reservaId);
  };

  // ── Grupos de color presentes en esta configuración ───────────
  const colorGroups = useMemo(() => {
    const groups: { key: string; values: Record<string, string> }[] = [];
    for (const [key, value] of Object.entries(chosenColors)) {
      if (key === 'chasis' || key === 'type') continue;
      if (value && typeof value === 'object' && Object.keys(value).length > 0) {
        groups.push({ key, values: value as Record<string, string> });
      }
    }
    return groups;
  }, [chosenColors]);

  // ── Filas del resumen visual ──────────────────────────────────
  const colorItems = useMemo(() => {
    const items: { label: string; colorName: string }[] = [];

    if (chosenColors.chasis) {
      items.push({ label: 'Chasis', colorName: chosenColors.chasis });
    }

    for (const { key, values } of colorGroups) {
      const labels = GROUP_LABELS[key] ?? { plural: key, singular: key };
      const unique = [...new Set(Object.values(values))];
      unique.length === 1
        ? items.push({ label: labels.plural, colorName: unique[0] })
        : unique.forEach((c, i) => items.push({ label: `${labels.singular} ${i + 1}`, colorName: c }));
    }

    return items;
  }, [chosenColors.chasis, colorGroups]);

  const productLabel = PRODUCT_LABELS[productType] ?? productType.toUpperCase();
  const identityPrice = PRODUCT_IDENTITY[productType as ProductId]?.priceUsd;
  const productPrice =
    PRODUCT_PRICES[productType] ?? (identityPrice ? `US$${identityPrice}` : '—');

  // ── Colores para el servicio de reserva (nombres en español) ──
  const GROUP_TO_SERVICE: Record<string, string> = {
    buttons: 'botones', knobs: 'perillas', teclas: 'teclas', keys: 'teclas', faders: 'faders',
  };
  const coloresParaServicio: Record<string, string | Record<string, string>> = {
    chasis: chosenColors.chasis,
  };
  for (const { key, values } of colorGroups) {
    coloresParaServicio[GROUP_TO_SERVICE[key] ?? key] = values;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto relative w-full max-w-md rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(145deg, #0d1117 0%, #111827 60%, #0a0f1a 100%)',
                border: '1px solid rgba(0,255,255,0.2)',
                boxShadow: '0 0 0 1px rgba(0,255,255,0.06), 0 0 40px rgba(0,255,255,0.08), 0 25px 60px rgba(0,0,0,0.7)',
              }}
            >
              {/* Línea de acento superior */}
              <div
                className="h-[2px] w-full sticky top-0 z-10"
                style={{ background: 'linear-gradient(90deg, #a259ff, #00ffff, #ff00c8)' }}
              />

              {/* Botón cerrar */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-cyan-400 hover:bg-white/5 transition-all text-xl z-10"
              >
                ×
              </button>

              {/* Indicador de paso */}
              <div className="flex items-center gap-2 px-6 pt-5 pb-0">
                {(['resumen', 'pago'] as Paso[]).map((p, i) => (
                  <React.Fragment key={p}>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                        style={{
                          background: paso === p || (p === 'resumen')
                            ? 'linear-gradient(135deg, #a259ff, #00ffff)'
                            : 'rgba(255,255,255,0.1)',
                          color: '#fff',
                          opacity: p === 'pago' && paso === 'resumen' ? 0.4 : 1,
                        }}
                      >
                        {i + 1}
                      </div>
                      <span
                        className="text-xs font-medium transition-colors duration-300"
                        style={{ color: paso === p ? '#00ffff' : '#4b5563' }}
                      >
                        {p === 'resumen' ? 'Resumen' : 'Pago'}
                      </span>
                    </div>
                    {i === 0 && (
                      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="px-6 pt-4 pb-8 space-y-5">

                {/* ── PASO 1: RESUMEN ─────────────────────────── */}
                <AnimatePresence mode="wait">
                  {paso === 'resumen' && (
                    <motion.div
                      key="resumen"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-5"
                    >
                      {/* Encabezado */}
                      <div>
                        <p className="text-xs font-bold tracking-[0.25em] text-cyan-400 uppercase mb-1">
                          Resumen de Reserva
                        </p>
                        <h2
                          className="text-3xl font-black tracking-widest"
                          style={{
                            background: 'linear-gradient(90deg, #00ffff, #a259ff)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          {productLabel}
                        </h2>
                      </div>

                      {/* Colores */}
                      <div
                        className="rounded-xl p-4"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">
                          Configuración seleccionada
                        </p>
                        <ul className="space-y-0.5">
                          {colorItems.length > 0 ? (
                            colorItems.map((item, i) => (
                              <ColorRow key={`${item.label}-${i}`} label={item.label} colorName={item.colorName} index={i} />
                            ))
                          ) : (
                            <li className="text-gray-500 text-sm py-2 text-center">Sin colores personalizados</li>
                          )}
                        </ul>
                      </div>

                      {/* Precio total */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Precio total del controlador</span>
                        <span className="text-white font-bold">{productPrice}</span>
                      </div>

                      {/* Bloque anticipo */}
                      <div
                        className="rounded-xl p-4 relative overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, rgba(162,89,255,0.12) 0%, rgba(0,255,255,0.06) 100%)',
                          border: '1px solid rgba(162,89,255,0.3)',
                        }}
                      >
                        <div
                          className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
                          style={{ background: 'radial-gradient(circle, rgba(162,89,255,0.2) 0%, transparent 70%)' }}
                        />
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">⚡</span>
                          <div>
                            <p className="text-white font-bold text-sm mb-1">
                              Anticipo para iniciar fabricación:{' '}
                              <span style={{
                                background: 'linear-gradient(90deg, #a259ff, #00ffff)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                              }}>
                                $50 USD
                              </span>
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                              Se cobra un anticipo de <strong className="text-gray-200">$50 USD</strong> para
                              reservar tu cupo e iniciar la fabricación. El saldo restante se paga al entregar.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* CTA → paso 2 */}
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setPaso('pago')}
                        className="w-full py-4 rounded-xl font-black text-base tracking-widest uppercase relative overflow-hidden"
                        style={{
                          background: 'linear-gradient(90deg, #a259ff, #00c8ff)',
                          color: '#fff',
                          boxShadow: '0 0 20px rgba(162,89,255,0.5), 0 0 40px rgba(0,200,255,0.15)',
                        }}
                      >
                        <motion.span
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.22) 50%, transparent 60%)',
                          }}
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
                        />
                        <span className="relative z-10">Separar Cupo — Pagar $50 USD</span>
                      </motion.button>

                      <p className="text-center text-xs text-gray-600">
                        🔒 Pago 100% seguro · Tu configuración queda guardada
                      </p>
                    </motion.div>
                  )}

                  {/* ── PASO 2: PAYPAL ────────────────────────── */}
                  {paso === 'pago' && (
                    <motion.div
                      key="pago"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {/* Encabezado del paso 2 */}
                      <div>
                        <p className="text-xs font-bold tracking-[0.25em] text-cyan-400 uppercase mb-1">
                          Confirmar pago
                        </p>
                        <h2
                          className="text-2xl font-black"
                          style={{
                            background: 'linear-gradient(90deg, #00ffff, #a259ff)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          Anticipo — $50 USD
                        </h2>
                        <p className="text-gray-500 text-xs mt-1">
                          Controlador {productLabel} · {colorItems[0]?.colorName ?? '—'}
                        </p>
                      </div>

                      {/* Botones de PayPal */}
                      <PaypalAnticipo
                        productType={productType}
                        colores={coloresParaServicio}
                        currentUser={usuario}
                        onSuccess={handlePagoExitoso}
                        onError={() => {/* el hook ya muestra el Swal de error */}}
                      />

                      {/* Volver al resumen */}
                      <button
                        onClick={() => setPaso('resumen')}
                        className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        ← Volver al resumen
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReservaModal;
