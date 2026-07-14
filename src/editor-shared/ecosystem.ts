/**
 * ecosystem.ts — Identidad visual del ecosistema de editores Creart.
 *
 * Paleta e identidad propia (no la del Beato ni la del WAVO) que comparten
 * la barra/menú único y las franjas compactas de cada dispositivo, para que
 * todo se sienta como un solo ecosistema.
 */

export const ECO = {
  // Superficies (grafito industrial, neutro — sin tintes morados)
  void: '#08090B',
  surface: '#0E1013',
  elevated: '#15181D',
  line: '#232830',
  hair: 'rgba(255,255,255,0.06)',

  // Plano técnico (rejillas del banco de pruebas)
  grid: 'rgba(120,140,165,0.055)',
  gridStrong: 'rgba(120,140,165,0.10)',

  // Panel derecho: sólido, sin transparencia que reste contraste
  panel: 'rgba(12,13,16,0.94)',

  // Texto
  text: '#E9EAEC',
  dim: '#8A919E',

  // Acento firma Creart: naranja de señal industrial → magenta
  accent: '#FF6A3D',
  accent2: '#FF3D77',
  accentSoft: 'rgba(255,106,61,0.12)',
  accentGrad: 'linear-gradient(120deg, #FF6A3D 0%, #FF3D77 100%)',

  // Estados
  ok: '#5BE8A8',
  warn: '#FF5A52',

  fontMono: "'JetBrains Mono', monospace",
  fontDisplay: "'Orbitron', 'Space Grotesk', sans-serif",
  fontBody: "'Inter', sans-serif",
} as const

/** Color identitario de cada dispositivo dentro del ecosistema (el "dot"). */
export const DEVICE_TINT: Record<string, string> = {
  beato16: '#C8FF4D',
  wavo: '#B07CFF',
  fado: '#B07CFF',
  mixo: '#FF9F43',
  knobo: '#FF3D77',
  beato8: '#FF5252',
}

/** Keyframes + estilos compartidos del ecosistema. Inyectar una vez. */
export const ECO_KEYFRAMES = `
  @keyframes eco-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(255,106,61,0.45); }
    70%  { box-shadow: 0 0 0 7px rgba(255,106,61,0); }
    100% { box-shadow: 0 0 0 0 rgba(255,106,61,0); }
  }
  /* Puertos del bus del ecosistema: latido suave */
  @keyframes eco-port-pulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1);   opacity: 0.85; }
    50%      { transform: translate(-50%, -50%) scale(1.4); opacity: 1;    }
  }
  /* Pulso de datos que recorre el riel del ecosistema (dentro de un
     contenedor que abarca el riel, left % = % del riel) */
  @keyframes eco-bus-flow {
    0%   { left: 0%;   opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: 1; }
    100% { left: 100%; opacity: 0; }
  }
  /* Scrollbar del menú con el acento coral del ecosistema */
  .eco-panel-scroll ::-webkit-scrollbar { width: 9px; height: 9px; }
  .eco-panel-scroll ::-webkit-scrollbar-track { background: transparent; }
  .eco-panel-scroll ::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #FF6A3D, #FF3D77);
    border-radius: 6px; border: 2px solid transparent; background-clip: padding-box;
  }
  .eco-panel-scroll ::-webkit-scrollbar-thumb:hover { background: #FF6A3D; }
  /* Rack grid: cada celda (módulo) con borde sutil y hover */
  .eco-rack-grid > * {
    border: 1px solid rgba(35,40,48,0.6);
    position: relative;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .eco-rack-grid > *:hover {
    border-color: rgba(255,106,61,0.25);
    box-shadow: inset 0 0 30px -12px rgba(255,106,61,0.08);
  }
`
