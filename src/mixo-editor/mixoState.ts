/**
 * mixoState.ts — Estado y mapeo del editor MIDI del MIXO.
 *
 * Portado 1:1 de Control Studio.html (MIXO.ino): 4 knobs + 4 faders (8
 * encoders) + 4 pads con LED, 3 bancos A/B/C, canal propio 5, comportamientos
 * y rango velMin/velMax. El orden de serialización binaria debe coincidir
 * byte a byte con el firmware: por banco → 8 encoders (knobs, luego faders),
 * luego 4 pads.
 */

export type Bank = 'A' | 'B' | 'C'
export const BANKS: Bank[] = ['A', 'B', 'C']

export type MixoControlId =
  | 'k0' | 'k1' | 'k2' | 'k3'   // 4 knobs
  | 'f0' | 'f1' | 'f2' | 'f3'   // 4 faders
  | 'p0' | 'p1' | 'p2' | 'p3'   // 4 pads (LED)

/** Orden firmware de encoders (8): 4 knobs + 4 faders. */
export const MIXO_ENCODER_IDS: MixoControlId[] = ['k0', 'k1', 'k2', 'k3', 'f0', 'f1', 'f2', 'f3']
export const MIXO_PAD_IDS: MixoControlId[] = ['p0', 'p1', 'p2', 'p3']
export const ALL_MIXO_CONTROL_IDS: MixoControlId[] = [...MIXO_ENCODER_IDS, ...MIXO_PAD_IDS]

/** Nombre-de-malla GLB → id lógico. Verificado con gltf-transform inspect. */
export const MIXO_MESH_TO_CONTROL: Record<string, MixoControlId> = {
  fader1: 'f0', fader2: 'f1', fader3: 'f2', fader4: 'f3',
  knob1: 'k0', knob2: 'k1', knob3: 'k2', knob4: 'k3',
  boton1: 'p0', boton2: 'p1', boton3: 'p2', boton4: 'p3',
  // Tapas (bezel/aro): parte del control del pad para clic + highlight,
  // pero NO se hunden ni se iluminan como el LED (ver isTapa en MixoScene).
  tapa1: 'p0', tapa2: 'p1', tapa3: 'p2', tapa4: 'p3',
}

// ── Constantes de hardware (espejo de MIXO.ino) ─────────────────────────────
/** Canal 4 en firmware (0-indexed) → 5 en el editor (1-indexed). */
export const MIXO_CHANNEL = 5

/** CCs de fábrica por banco para los 8 encoders (4 knobs + 4 faders). */
export const MIXO_ENC_CC_BY_BANK: Record<Bank, number[]> = {
  A: [14, 15, 16, 17, 18, 19, 20, 21],
  B: [22, 23, 24, 25, 26, 27, 28, 29],
  C: [102, 103, 104, 105, 106, 107, 108, 109],
}

/** Notas de fábrica por banco para los 4 pads. */
export const MIXO_PAD_NOTE_BY_BANK: Record<Bank, number[]> = {
  A: [36, 37, 38, 39],
  B: [40, 41, 42, 43],
  C: [44, 45, 46, 47],
}

/** CC que el hardware envía para notificar cambio de banco. */
export const MIXO_BANK_CC: Record<Bank, number> = { A: 116, B: 117, C: 118 }
/** CC 110 = touch select (d2 = índice de encoder 0-7). */
export const MIXO_TOUCH_SELECT_CC = 110
/** CC 119 = fader 4 (mf3) en modo selector de banco. */
export const MIXO_MASTER_CC = 119

// ── Comportamientos ─────────────────────────────────────────────────────────
export interface Behavior {
  id: string
  name: string
  desc: string
  icon: string
  info: string
}

/** Comportamientos de encoders (knobs/faders). Igual que Fado/Beato. */
export const MIXO_ENCODER_BEHAVIORS: Behavior[] = [
  { id: 'directo', name: 'Directo', desc: 'Sigue tu mano 1:1', icon: '→', info: 'El control hace exactamente lo que\ntu mano hace. Sin efectos ni trucos.' },
  { id: 'inercia', name: 'Inercia', desc: 'Suaviza y rebota', icon: '∿', info: 'El sonido cambia suavemente,\ncomo si tuviera peso.' },
  { id: 'espejo', name: 'Espejo', desc: 'Se mueve al contrario', icon: '⇄', info: 'Funciona al reves: si subes\nel sonido baja, y viceversa.' },
  { id: 'random', name: 'Paso aleatorio', desc: 'Salta a valores cercanos', icon: '⚂', info: 'Cada movimiento salta a un punto\ndistinto cercano.' },
  { id: 'oscila', name: 'Oscilacion libre', desc: 'Sigue moviendose solo', icon: '~', info: 'El control se mueve solo sin que\ntoques nada.' },
]

/** Comportamientos de pads. */
export const MIXO_PAD_BEHAVIORS: Behavior[] = [
  { id: 'directo', name: 'Directo', desc: 'Nota al presionar/soltar', icon: '→', info: 'Funciona normal: suena cuando\nlo aprietas y para cuando sueltas.' },
  { id: 'retrigger', name: 'Retrigger', desc: 'Repite mientras presionas', icon: '⟳', info: 'Mientras mantienes el pad apretado\nla nota se repite sola.' },
  { id: 'rafaga', name: 'Rafaga aleatoria', desc: 'Dispara notas al azar', icon: '⚂', info: 'Lanza notas de forma aleatoria\nmientras lo mantienes apretado.' },
]

export const MIXO_PARAM_LABELS: Record<string, string> = {
  inercia: 'Velocidad de inercia', espejo: 'Cantidad de inversion', random: 'Rango de salto',
  oscila: 'Velocidad de oscilacion', retrigger: 'Velocidad de repeticion', rafaga: 'Densidad',
}

/** IDs de comportamiento transmitidos al firmware (espejo de BEHAVIOR_IDS). */
export const MIXO_BEHAVIOR_IDS: Record<string, number> = {
  directo: 0, inercia: 1, espejo: 2, random: 3, oscila: 4, retrigger: 5, rafaga: 6,
}

// ── Estado por control ──────────────────────────────────────────────────────
export interface MixoControlConfig {
  type: 'cc' | 'note'
  num: number
  chan: number
  mode: 'momentary' | 'toggle'
  behavior: string
  param: number
  /** Rango de salida / velocidad (0-127). */
  velMin: number
  velMax: number
  label: string
}

export type MixoControlState = Record<MixoControlId, Record<Bank, MixoControlConfig>>

export const MIXO_LABELS: Record<MixoControlId, string> = {
  k0: 'Knob 1', k1: 'Knob 2', k2: 'Knob 3', k3: 'Knob 4',
  f0: 'Fader 1', f1: 'Fader 2', f2: 'Fader 3', f3: 'Fader 4',
  p0: 'Pad 1', p1: 'Pad 2', p2: 'Pad 3', p3: 'Pad 4',
}

export function mixoLabelFor(id: MixoControlId): string {
  return MIXO_LABELS[id] ?? id
}

export function mixoShortLabel(id: MixoControlId): string {
  if (id.startsWith('k')) return `K${+id.slice(1) + 1}`
  if (id.startsWith('f')) return `F${+id.slice(1) + 1}`
  return `P${+id.slice(1) + 1}`
}

export function isMixoPad(id: MixoControlId): boolean {
  return id.startsWith('p')
}

/** Defaults de fábrica: 3 bancos, canal 5, CCs/notas por zona libre MIDI. */
export function makeMixoInitialState(): MixoControlState {
  const state = {} as MixoControlState
  MIXO_ENCODER_IDS.forEach((id, i) => {
    state[id] = {} as Record<Bank, MixoControlConfig>
    for (const b of BANKS) {
      state[id][b] = {
        type: 'cc', num: MIXO_ENC_CC_BY_BANK[b][i], chan: MIXO_CHANNEL,
        mode: 'momentary', behavior: 'directo', param: 50,
        velMin: 0, velMax: 127, label: MIXO_LABELS[id],
      }
    }
  })
  MIXO_PAD_IDS.forEach((id, i) => {
    state[id] = {} as Record<Bank, MixoControlConfig>
    for (const b of BANKS) {
      state[id][b] = {
        type: 'note', num: MIXO_PAD_NOTE_BY_BANK[b][i], chan: MIXO_CHANNEL,
        mode: 'momentary', behavior: 'directo', param: 50,
        velMin: 127, velMax: 127, label: MIXO_LABELS[id],
      }
    }
  })
  return state
}
