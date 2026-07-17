/**
 * ReserveCtaBar — Barra de acción inferior compartida por todos los configuradores.
 *
 * Botones:
 *   1. "Enviar diseño" — abre flujo email clásico
 *   2. "Comprar" — abre ReservaModal (3 opciones de compra)
 */

import React from 'react'
import { PRODUCT_IDENTITY, type ProductId } from '../productIdentity'

interface Props {
  product: ProductId
  onSendConfig: () => void
  onReserve?: () => void
  priceLabel?: string
}

const ReserveCtaBar: React.FC<Props> = ({ product, onSendConfig, onReserve, priceLabel }) => {
  const id = PRODUCT_IDENTITY[product]
  const showReserve = typeof onReserve === 'function'

  return (
    <div
      className="creart-cta-bar"
      style={{
        position: 'fixed',
        left: '50%',
        top: 18,
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Precio */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingRight: 6 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.18em',
            color: 'rgba(242,241,237,0.55)',
            textTransform: 'uppercase',
          }}
        >
          desde
        </span>
        <span
          style={{
            fontFamily: "'Orbitron', 'Space Grotesk', sans-serif",
            fontSize: 15,
            fontWeight: 800,
            color: id.accent,
            lineHeight: 1,
            textShadow: 'none',
          }}
        >
          {priceLabel || `US$${id.priceUsd}`}
        </span>
      </div>

      {/* Divisor */}
      <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.08)' }} />

      {/* Enviar diseño */}
      <button
        onClick={onSendConfig}
        style={{
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#F2F1ED',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '10px 14px',
          borderRadius: 999,
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${id.accent}80`
          e.currentTarget.style.color = id.accent
          e.currentTarget.style.background = `${id.accent}10`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
          e.currentTarget.style.color = '#F2F1ED'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        Enviar diseño
      </button>

      {/* Comprar — abre modal con las 3 opciones */}
      {showReserve && (
        <button
          onClick={onReserve}
          className="creart-cta-primary"
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: id.gradient,
            border: 'none',
            color: '#0E0E10',
            fontFamily: "'Orbitron', 'Space Grotesk', sans-serif",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '12px 22px',
            borderRadius: 999,
            cursor: 'pointer',
            boxShadow: `0 8px 24px -4px ${id.glow}, 0 0 0 1px ${id.accent}60`,
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)'
            e.currentTarget.style.boxShadow = `0 14px 32px -4px ${id.glow}, 0 0 0 1px ${id.accent}90`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)'
            e.currentTarget.style.boxShadow = `0 8px 24px -4px ${id.glow}, 0 0 0 1px ${id.accent}60`
          }}
        >
          <span style={{ fontSize: 14 }}>⚡</span>
          Comprar
          <span
            aria-hidden
            className="creart-cta-shine"
            style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '60%',
              height: '100%',
              background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.32) 50%, transparent 70%)',
              animation: 'creart-cta-shine 2.6s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        </button>
      )}

      <style>{`
        @keyframes creart-cta-shine {
          0%   { left: -100%; }
          55%  { left: 110%; }
          100% { left: 110%; }
        }
        @media (max-width: 640px) {
          .creart-cta-bar { gap: 6px !important; padding: 6px 8px 6px 12px !important; top: 10px !important; }
          .creart-cta-primary { font-size: 11px !important; padding: 10px 14px !important; }
        }
      `}</style>
    </div>
  )
}

export default ReserveCtaBar
