/**
 * fadoControlState.ts — Estado y mapeo del editor MIDI del FADO.
 *
 * El Fado es un controlador de 8 faders. Cada fader manda CC (Control Change)
 * en un canal configurable, con rango min/max. Soporta 3 bancos (A/B/C)
 * y 5 comportamientos (directo, inercia, espejo, random, oscila).
 */

export type Bank = 'A' | 'B' | 'C'
export const BANKS: Bank[] = ['A', 'B', 'C']

export type FadoControlId =
  | 'fader1' | 'fader2' | 'fader3' | 'fader4'
  | 'fader5' | 'fader6' | 'fader7' | 'fader8'

export const ALL_FADO_CONTROL_IDS: FadoControlId[] = [
  'fader1', 'fader2', 'fader3', 'fader4',
  'fader5', 'fader6', 'fader7', 'fader8',
]

/** Mapeo de nombre-de-malla GLB -> id logico. */
export const MESH_TO_FADO_CONTROL: Record<string, FadoControlId> = {
  fader1_1: 'fader1', fader2_1: 'fader2', fader3_1: 'fader3', fader4_1: 'fader4',
  fader5_1: 'fader5', fader6_1: 'fader6', fader7_1: 'fader7', fader8_1: 'fader8',
  // Alternativas por si el GLB cambia
  fader1: 'fader1', fader2: 'fader2', fader3: 'fader3', fader4: 'fader4',
  fader5: 'fader5', fader6: 'fader6', fader7: 'fader7', fader8: 'fader8',
}

// ── Constantes de hardware ──────────────────────────────────────
// CCs por banco del firmware FADO_8.ino
export const FADO_CCS_BY_BANK: Record<Bank, number[]> = {
  A: [14, 15, 16, 17, 18, 19, 20, 21],
  B: [22, 23, 24, 25, 26, 27, 28, 29],
  C: [102, 103, 104, 105, 106, 107, 108, 109],
}

// Canal propio del Fado. v3 (FADO_8.ino): movido de 4→6 para no compartir
// canal con los pads del Beato (que quedaron unificados en canal 4).
export const FADO_CHANNEL = 6

/** CC que el hardware envia para notificar cambio de banco. */
export const FADO_BANK_CC: Record<Bank, number> = { A: 116, B: 117, C: 118 }

/** CC 110 = fader touch select (hardware envia d2 = indice del fader tocado). */
export const FADO_TOUCH_SELECT_CC = 110

/** CC 119 = master fader 7 special. */
export const FADO_MASTER_CC = 119

// ── Comportamientos ─────────────────────────────────────────────

export interface Behavior {
  id: string
  name: string
  desc: string
  icon: string
  info: string
}

export const FADER_BEHAVIORS: Behavior[] = [
  { id: 'directo', name: 'Directo', desc: 'Sigue tu mano 1:1', icon: '→', info: 'El fader hace exactamente lo que\ntu mano hace. Sin efectos ni trucos.\nLo que mueves es lo que suena.' },
  { id: 'inercia', name: 'Inercia', desc: 'Suaviza y rebota', icon: '∿', info: 'El sonido cambia suavemente,\ncomo si tuviera peso. Ideal para\ntransiciones elegantes y naturales.' },
  { id: 'espejo', name: 'Espejo', desc: 'Se mueve al contrario', icon: '⇄', info: 'Funciona al reves: si subes el fader\nel sonido baja, y viceversa.\nUtil para efectos invertidos.' },
  { id: 'random', name: 'Paso aleatorio', desc: 'Salta a valores cercanos', icon: '⚂', info: 'Cada movimiento salta a un punto\ndistinto cercano. Crea variaciones\nespontaneas e impredecibles.' },
  { id: 'oscila', name: 'Oscilacion libre', desc: 'Sigue moviendose solo', icon: '~', info: 'El control se mueve solo sin que\ntoques nada. Crea un efecto\nautomatico de variacion continua.' },
]

export const PARAM_LABELS: Record<string, string> = {
  inercia: 'Velocidad de inercia',
  espejo: 'Cantidad de inversion',
  random: 'Rango de salto',
  oscila: 'Velocidad de oscilacion',
}

// ── Estado por control ──────────────────────────────────────────

export interface FadoControlConfig {
  /** Solo CC o Pitch Bend para faders. */
  type: 'cc' | 'pb'
  /** Numero CC (0-127). Ignorado si type='pb'. */
  num: number
  /** Canal MIDI 1-16 (display, igual que DAWs). */
  chan: number
  /** Modo momentaneo (faders siempre momentary, pero se mantiene por consistencia). */
  mode: 'momentary'
  /** Comportamiento activo. */
  behavior: string
  /** Parametro del comportamiento (0-100). */
  param: number
  /** Valor minimo de salida (0-127). */
  min: number
  /** Valor maximo de salida (0-127). */
  max: number
  /** Etiqueta corta del usuario (ej. "Master", "Cutoff"). */
  label: string
}

export type FadoControlState = Record<FadoControlId, Record<Bank, FadoControlConfig>>

// CCs de fabrica del FADO (banco A)
export const FADO_FACTORY_CCS = [14, 15, 16, 17, 18, 19, 20, 21]

/** Defaults de fabrica: 3 bancos, cada uno con CCs distintos, canal 4. */
export function makeFadoInitialState(): FadoControlState {
  const state = {} as FadoControlState
  ALL_FADO_CONTROL_IDS.forEach((id, i) => {
    state[id] = {} as Record<Bank, FadoControlConfig>
    for (const b of BANKS) {
      state[id][b] = {
        type: 'cc',
        num: FADO_CCS_BY_BANK[b][i],
        chan: FADO_CHANNEL,
        mode: 'momentary',
        behavior: 'directo',
        param: 50,
        min: 0,
        max: 127,
        label: `Fader ${i + 1}`,
      }
    }
  })
  return state
}

export function fadoLabelFor(id: FadoControlId): string {
  const i = parseInt(id.replace('fader', ''))
  return `Fader ${i}`
}

export function fadoShortLabel(id: FadoControlId): string {
  return `F${id.replace('fader', '')}`
}
