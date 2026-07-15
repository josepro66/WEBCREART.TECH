/**
 * ReservaModal.tsx
 * ─────────────────────────────────────────────────────────────────
 * Modal de compra con 3 modos:
 *  1. Separar Cupo — anticipo con slider (sin envío, recogida en Bogotá)
 *  2. Quiero mi [Producto] — compra completa + envío mundial
 *  3. Completar Pago — pagar saldo de una reserva existente
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PaypalAnticipo from './PaypalAnticipo';
import { useAuth } from '../../auth/AuthContext';
import { PRODUCT_IDENTITY, type ProductId } from '../productIdentity';
import { cotizarEnvio, type ShippingRate } from '../services/reservaService';

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

const PRODUCT_PRICES_COP: Record<string, number> = {
  beato16: 1000000,
  mixo:    850000,
  beato8:  750000,
  fado:    650000,
  loopo:   500000,
  knobo:   450000,
  wavo:    2000000,
};

const PRODUCT_LABELS: Record<string, string> = {
  beato16: 'BEATO 16', mixo: 'MIXO', beato8: 'BEATO 8',
  fado: 'FADO', loopo: 'LOOPO', knobo: 'KNOBO', wavo: 'WAVO',
};

const GROUP_LABELS: Record<string, { plural: string; singular: string }> = {
  buttons: { plural: 'Botones',  singular: 'Botón' },
  knobs:   { plural: 'Perillas', singular: 'Perilla' },
  teclas:  { plural: 'Teclas',   singular: 'Tecla' },
  keys:    { plural: 'Teclas',   singular: 'Tecla' },
  faders:  { plural: 'Faders',   singular: 'Fader' },
};

const COUNTRIES = [
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'JP', name: 'Japón', flag: '🇯🇵' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'KR', name: 'Corea del Sur', flag: '🇰🇷' },
  { code: 'NL', name: 'Países Bajos', flag: '🇳🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
];

// ─── Tipos ────────────────────────────────────────────────────────

export interface ChosenColors {
  chasis: string;
  [group: string]: string | Record<string, string> | undefined;
}

interface Usuario { nombre: string; email: string; }

interface ReservaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPagoExitoso?: (reservaId: string) => void;
  productType: string;
  chosenColors: ChosenColors;
  currentUser?: Usuario;
}

type CheckoutMode = 'cupo' | 'comprar' | 'completar';
type Paso = 'opciones' | 'pago';

// ─── Sub-componente: fila de color ────────────────────────────────

const ColorRow: React.FC<{ label: string; colorName: string; index: number }> = ({
  label, colorName, index,
}) => {
  const hex = COLOR_HEX[colorName] ?? '#444';
  const isLight = ['Blanco', 'Amarillo'].includes(colorName);

  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + index * 0.04, duration: 0.25 }}
      className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
    >
      <span className="text-gray-400 text-xs">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-white text-xs font-semibold">{colorName}</span>
        <span
          className="w-4 h-4 rounded-full border-2 flex-shrink-0"
          style={{
            backgroundColor: hex,
            borderColor: isLight ? '#555' : hex,
            boxShadow: `0 0 6px ${hex}60`,
          }}
        />
      </div>
    </motion.li>
  );
};

// ─── Sub-componente: Slider de anticipo ───────────────────────────

const DepositSlider: React.FC<{
  priceUsd: number;
  value: number;
  onChange: (v: number) => void;
}> = ({ priceUsd, value, onChange }) => {
  const min = 50;
  const max = priceUsd;
  const pct = Math.round((value / max) * 100);
  const remaining = max - value;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Tu anticipo</p>
          <p className="text-2xl font-black text-white">${value} <span className="text-sm text-gray-400 font-normal">USD</span></p>
        </div>
        <div
          className="text-right px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)' }}
        >
          <span className="text-lg font-bold text-neon-cyan">{pct}%</span>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative w-full h-10 flex items-center">
        <div className="absolute inset-x-0 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${((value - min) / (max - min)) * 100}%`,
              background: 'linear-gradient(90deg, #00E5FF, #a259ff)',
              boxShadow: '0 0 12px rgba(0,229,255,0.4)',
            }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-x-0 w-full h-10 opacity-0 cursor-pointer"
          style={{ zIndex: 2 }}
        />
        {/* Thumb visual */}
        <div
          className="absolute w-6 h-6 rounded-full border-2 border-white shadow-lg pointer-events-none"
          style={{
            left: `calc(${((value - min) / (max - min)) * 100}% - 12px)`,
            background: 'linear-gradient(135deg, #00E5FF, #a259ff)',
            boxShadow: '0 0 16px rgba(0,229,255,0.5), 0 2px 8px rgba(0,0,0,0.4)',
            transition: 'left 0.1s ease',
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[10px] text-gray-600 font-mono">
        <span>${min} mín</span>
        <span>${max} total</span>
      </div>

      {/* Breakdown */}
      <div
        className="rounded-xl p-3 space-y-2"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Pagas ahora</span>
          <span className="text-white font-bold">${value} USD</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Resta al entregar</span>
          <span className="text-gray-300 font-semibold">${remaining} USD</span>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Recoges en Bogotá D.C</span>
          <span className="text-emerald-400 font-semibold">Sin envío</span>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-componente: Selector de envío ────────────────────────────

const ShippingSelector: React.FC<{
  priceUsd: number;
  selectedCountry: string;
  onCountryChange: (code: string) => void;
  selectedRate: ShippingRate | null;
  onRateChange: (rate: ShippingRate | null) => void;
  productLabel: string;
  productType: string;
}> = ({ priceUsd, selectedCountry, onCountryChange, selectedRate, onRateChange, productLabel, productType }) => {
  const country = COUNTRIES.find(c => c.code === selectedCountry);
  const isLocal = selectedCountry === 'CO';

  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async (code: string) => {
    if (code === 'CO') { setRates([]); setError(null); return; }
    setLoading(true);
    setError(null);
    onRateChange(null);
    try {
      const result = await cotizarEnvio(productType, code);
      setRates(result.rates);
      if (result.rates.length > 0) onRateChange(result.rates[0]);
    } catch {
      setError('No se pudieron cargar las tarifas. Intenta de nuevo.');
      setRates([]);
    } finally {
      setLoading(false);
    }
  }, [productType, onRateChange]);

  useEffect(() => {
    if (!isLocal && selectedCountry) fetchRates(selectedCountry);
  }, [selectedCountry, isLocal, fetchRates]);

  const shippingCost = isLocal ? 0 : (selectedRate?.price ?? 0);
  const total = priceUsd + shippingCost;

  return (
    <div className="space-y-3">
      {/* Country picker */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">País de envío</p>
        <div className="relative">
          <select
            value={selectedCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            className="w-full appearance-none rounded-xl px-4 py-3 text-sm text-white font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code} style={{ background: '#111827' }}>
                {c.flag}  {c.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            ▾
          </div>
        </div>
      </div>

      {/* Shipping options */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
            Opciones de envío a {country?.name ?? '—'}
          </span>
        </div>

        {isLocal ? (
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">📦</span>
                <div>
                  <p className="text-sm text-white font-semibold">Recogida en Bogotá</p>
                  <p className="text-xs text-gray-500">Coordinamos la entrega</p>
                </div>
              </div>
              <span className="text-emerald-400 text-sm font-bold">Gratis</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">🚚</span>
                <div>
                  <p className="text-sm text-white font-semibold">Envío nacional</p>
                  <p className="text-xs text-gray-500">Servientrega · 2-4 días</p>
                </div>
              </div>
              <span className="text-gray-300 text-sm font-bold">~$8 USD</span>
            </div>
          </div>
        ) : loading ? (
          <div className="p-6 flex flex-col items-center gap-3">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#00E5FF', borderTopColor: 'transparent' }}
            />
            <p className="text-xs text-gray-500">Calculando tarifas de envío...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-xs text-red-400 mb-2">{error}</p>
            <button
              onClick={() => fetchRates(selectedCountry)}
              className="text-xs text-cyan-400 hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : rates.length > 0 ? (
          <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
            {rates.map((rate) => (
              <button
                key={rate.objectId}
                onClick={() => onRateChange(rate)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg transition-all text-left"
                style={{
                  background: selectedRate?.objectId === rate.objectId ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)',
                  border: selectedRate?.objectId === rate.objectId ? '1px solid rgba(0,229,255,0.25)' : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-400 text-sm">📦</span>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-semibold truncate">{rate.carrier}</p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {rate.service}
                      {rate.days ? ` · ${rate.days} días` : ''}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ml-2 ${selectedRate?.objectId === rate.objectId ? 'text-neon-cyan' : 'text-gray-300'}`}>
                  ${rate.price.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4">
            <div className="flex flex-col items-center justify-center py-4 gap-3">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <span className="text-xl">🌎</span>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-300 font-medium mb-1">
                  Envío internacional disponible
                </p>
                <p className="text-xs text-gray-500 max-w-[250px]">
                  Selecciona un país para ver las tarifas de DHL, FedEx, UPS y más.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Price breakdown */}
      <div
        className="rounded-xl p-3 space-y-2"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{productLabel}</span>
          <span className="text-white font-bold">${priceUsd} USD</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Envío {isLocal ? '(Colombia)' : `(${country?.name})`}</span>
          <span className="text-gray-300 font-semibold">
            {isLocal ? 'Gratis / ~$8' : shippingCost > 0 ? `$${shippingCost.toFixed(2)}` : 'Selecciona opción'}
          </span>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex justify-between text-sm">
          <span className="text-white font-bold">Total estimado</span>
          <span className="text-neon-cyan font-black text-lg">
            ${total.toFixed(2)}
            {!isLocal && shippingCost === 0 && <span className="text-xs text-gray-400 font-normal"> + envío</span>}
          </span>
        </div>
      </div>
    </div>
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
  const [mode, setMode] = useState<CheckoutMode>('cupo');
  const [paso, setPaso] = useState<Paso>('opciones');
  const [depositAmount, setDepositAmount] = useState(50);
  const [selectedCountry, setSelectedCountry] = useState('CO');
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [reservaCode, setReservaCode] = useState('');

  const { user: fbUser } = useAuth();
  const usuario: Usuario = currentUser ?? {
    nombre: fbUser?.displayName || fbUser?.email?.split('@')[0] || 'Cliente',
    email: fbUser?.email || '',
  };

  const handleClose = () => {
    setPaso('opciones');
    onClose();
  };

  const handlePagoExitoso = (reservaId: string) => {
    handleClose();
    onPagoExitoso?.(reservaId);
  };

  // ── Grupos de color ─────────────────────────────────────────────
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
  const identity = PRODUCT_IDENTITY[productType as ProductId];
  const priceUsd = identity?.priceUsd ?? 0;
  const priceCop = PRODUCT_PRICES_COP[productType] ?? 0;
  const priceCopFormatted = priceCop > 0
    ? `$${priceCop.toLocaleString('es-CO')} COP`
    : `US$${priceUsd}`;

  const GROUP_TO_SERVICE: Record<string, string> = {
    buttons: 'botones', knobs: 'perillas', teclas: 'teclas', keys: 'teclas', faders: 'faders',
  };
  const coloresParaServicio: Record<string, string | Record<string, string>> = {
    chasis: chosenColors.chasis,
  };
  for (const { key, values } of colorGroups) {
    coloresParaServicio[GROUP_TO_SERVICE[key] ?? key] = values;
  }

  // Amount to charge depending on mode
  const paymentAmount = mode === 'cupo' ? depositAmount : priceUsd;
  const paymentDesc = mode === 'cupo'
    ? `Anticipo ${Math.round((depositAmount / priceUsd) * 100)}% — ${productLabel}`
    : mode === 'comprar'
      ? `Compra completa — ${productLabel}`
      : `Saldo pendiente — ${productLabel}`;

  // ── Mode config ─────────────────────────────────────────────────
  const MODES: { id: CheckoutMode; icon: string; title: string; subtitle: string }[] = [
    { id: 'cupo', icon: '⚡', title: 'Separar Cupo', subtitle: 'Anticipo + recoges en Bogotá' },
    { id: 'comprar', icon: '📦', title: `Quiero mi ${productLabel}`, subtitle: 'Compra + envío mundial' },
    { id: 'completar', icon: '✅', title: 'Completar Pago', subtitle: 'Pagar saldo de reserva' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md"
            onClick={handleClose}
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto relative w-full max-w-lg rounded-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(145deg, #0d1117 0%, #111827 60%, #0a0f1a 100%)',
                border: '1px solid rgba(0,229,255,0.15)',
                boxShadow: '0 0 0 1px rgba(0,229,255,0.06), 0 0 40px rgba(0,229,255,0.08), 0 25px 60px rgba(0,0,0,0.7)',
              }}
            >
              {/* Accent line */}
              <div
                className="h-[2px] w-full sticky top-0 z-10"
                style={{ background: 'linear-gradient(90deg, #00E5FF, #a259ff, #00E5FF)' }}
              />

              {/* Close */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-cyan-400 hover:bg-white/5 transition-all text-xl z-10"
              >
                ×
              </button>

              <div className="px-5 pt-4 pb-6">

                {/* Header */}
                <div className="mb-4">
                  <p className="text-[10px] font-bold tracking-[0.25em] text-cyan-400 uppercase mb-1">
                    {paso === 'opciones' ? 'Tu configuración' : 'Confirmar pago'}
                  </p>
                  <h2
                    className="text-2xl font-black tracking-wide"
                    style={{
                      background: 'linear-gradient(90deg, #00E5FF, #a259ff)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {productLabel}
                  </h2>
                  <p className="text-gray-500 text-xs mt-0.5">{priceCopFormatted} · US${priceUsd}</p>
                </div>

                <AnimatePresence mode="wait">
                  {paso === 'opciones' ? (
                    <motion.div
                      key="opciones"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {/* Config summary (collapsible) */}
                      <details className="group">
                        <summary className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 hover:text-gray-300 transition-colors">
                          <span className="transition-transform group-open:rotate-90">▸</span>
                          Ver configuración de colores ({colorItems.length})
                        </summary>
                        <div
                          className="mt-2 rounded-xl p-3"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                          <ul className="space-y-0">
                            {colorItems.length > 0 ? (
                              colorItems.map((item, i) => (
                                <ColorRow key={`${item.label}-${i}`} label={item.label} colorName={item.colorName} index={i} />
                              ))
                            ) : (
                              <li className="text-gray-500 text-xs py-2 text-center">Sin colores personalizados</li>
                            )}
                          </ul>
                        </div>
                      </details>

                      {/* ── 3 Mode cards ─────────────────────────── */}
                      <div className="grid grid-cols-3 gap-2">
                        {MODES.map(m => (
                          <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 transition-all duration-200 text-center"
                            style={{
                              background: mode === m.id ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)',
                              border: mode === m.id ? '1px solid rgba(0,229,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
                              boxShadow: mode === m.id ? '0 0 20px rgba(0,229,255,0.08)' : 'none',
                            }}
                          >
                            <span className="text-lg">{m.icon}</span>
                            <span className={`text-[11px] font-bold leading-tight ${mode === m.id ? 'text-white' : 'text-gray-400'}`}>
                              {m.title}
                            </span>
                            <span className="text-[9px] text-gray-600 leading-tight">{m.subtitle}</span>
                          </button>
                        ))}
                      </div>

                      {/* ── Tab content ──────────────────────────── */}
                      <AnimatePresence mode="wait">
                        {mode === 'cupo' && (
                          <motion.div
                            key="cupo"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            <DepositSlider
                              priceUsd={priceUsd}
                              value={depositAmount}
                              onChange={setDepositAmount}
                            />
                          </motion.div>
                        )}

                        {mode === 'comprar' && (
                          <motion.div
                            key="comprar"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ShippingSelector
                              priceUsd={priceUsd}
                              selectedCountry={selectedCountry}
                              onCountryChange={setSelectedCountry}
                              selectedRate={selectedRate}
                              onRateChange={setSelectedRate}
                              productLabel={productLabel}
                              productType={productType}
                            />
                          </motion.div>
                        )}

                        {mode === 'completar' && (
                          <motion.div
                            key="completar"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Código de reserva</p>
                              <input
                                type="text"
                                value={reservaCode}
                                onChange={(e) => setReservaCode(e.target.value)}
                                placeholder="Ej: ABC123xyz..."
                                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                                style={{
                                  background: 'rgba(255,255,255,0.04)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                }}
                              />
                              <p className="text-[10px] text-gray-600 mt-1.5">
                                Ingresa el código que recibiste al separar tu cupo. Lo encuentras en el correo de confirmación.
                              </p>
                            </div>

                            <div
                              className="rounded-xl p-4 flex flex-col items-center gap-3"
                              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                            >
                              {reservaCode.length > 5 ? (
                                <>
                                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                                    <span className="text-lg">🔍</span>
                                  </div>
                                  <p className="text-xs text-gray-400 text-center">
                                    La consulta de saldo estará disponible próximamente.
                                    Por ahora, contáctanos a <a href="mailto:info@crearttech.com" className="text-cyan-400 hover:underline">info@crearttech.com</a> con tu código de reserva.
                                  </p>
                                </>
                              ) : (
                                <>
                                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                    <span className="text-lg text-gray-600">🎫</span>
                                  </div>
                                  <p className="text-xs text-gray-500 text-center">
                                    Ingresa tu código de reserva para consultar el saldo pendiente y completar el pago.
                                  </p>
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ── CTA button ───────────────────────────── */}
                      {mode !== 'completar' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setPaso('pago')}
                          className="w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase relative overflow-hidden"
                          style={{
                            background: mode === 'cupo'
                              ? 'linear-gradient(90deg, #00E5FF, #a259ff)'
                              : 'linear-gradient(90deg, #a259ff, #00E5FF)',
                            color: '#fff',
                            boxShadow: '0 0 20px rgba(0,229,255,0.3), 0 0 40px rgba(162,89,255,0.1)',
                          }}
                        >
                          <motion.span
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)',
                            }}
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
                          />
                          <span className="relative z-10">
                            {mode === 'cupo'
                              ? `Separar Cupo — Pagar $${depositAmount} USD`
                              : `Comprar — Pagar $${priceUsd} USD`}
                          </span>
                        </motion.button>
                      )}

                      <p className="text-center text-[10px] text-gray-600">
                        🔒 Pago 100% seguro vía PayPal · Tu configuración queda guardada
                      </p>
                    </motion.div>
                  ) : (
                    /* ── PASO 2: PAYPAL ────────────────────────── */
                    <motion.div
                      key="pago"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <PaypalAnticipo
                        productType={productType}
                        colores={coloresParaServicio}
                        currentUser={usuario}
                        onSuccess={handlePagoExitoso}
                        onError={() => {}}
                        amount={paymentAmount}
                        orderDescription={paymentDesc}
                        shippingRequired={mode === 'comprar'}
                      />

                      <button
                        onClick={() => setPaso('opciones')}
                        className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        ← Volver a opciones
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
