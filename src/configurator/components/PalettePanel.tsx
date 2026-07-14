import React from 'react';

export interface PaletteColor {
  hex: string;
}

interface PalettePanelProps {
  title: string;
  subtitle?: string;
  colors: Record<string, PaletteColor>;
  onSelect: (name: string, color: PaletteColor) => void;
  selectedCount?: number;
}

/**
 * Panel de paleta de colores con el diseño del configurador Wavo:
 * título cian en mayúsculas + subtítulo, cuadrícula de tarjetas con
 * círculo de color y nombre, y aviso de piezas seleccionadas.
 * Compartido por todos los configuradores.
 */
const PalettePanel: React.FC<PalettePanelProps> = ({
  title,
  subtitle,
  colors,
  onSelect,
  selectedCount = 0,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0 }}>
    <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
      <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '15px', color: '#00FFFF' }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#9ca3af' }}>
          {subtitle}
        </p>
      )}
    </div>

    {/* Cuadrícula de colores */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
      {Object.entries(colors).map(([name, colorData]) => (
        <div
          key={name}
          onClick={() => onSelect(name, colorData)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            padding: '8px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.border = '1px solid rgba(0,255,255,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)';
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: colorData.hex,
              border: colorData.hex === '#F5F5F5' || colorData.hex === '#FFFFFF' ? '2px solid #888' : 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#e5e7eb' }}>{name}</span>
        </div>
      ))}
    </div>

    {/* Ayuda visual de selección */}
    {selectedCount > 0 && (
      <div style={{ marginTop: 'auto', padding: '12px', background: 'rgba(0, 255, 255, 0.1)', border: '1px solid rgba(0, 255, 255, 0.3)', borderRadius: '6px' }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#00FFFF', fontWeight: 'bold' }}>
          Piezas seleccionadas: {selectedCount}
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#e5e7eb' }}>
          Haz clic en un color de arriba para aplicarlo a la selección.
        </p>
      </div>
    )}
  </div>
);

/** Subtítulo estándar según la vista activa (mismo texto que el Wavo). */
export const paletteSubtitle = (view: string): string =>
  view === 'chasis'
    ? 'Elige un color para aplicar al chasis.'
    : 'Haz clic en una pieza del modelo para seleccionarla, o elige un color para aplicarlo a todas las piezas de esta sección.';

export default PalettePanel;
