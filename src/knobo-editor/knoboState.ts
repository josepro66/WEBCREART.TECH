/**
 * knoboState.ts — Estado y mapeo del editor MIDI del KNOBO.
 *
 * 8 knobs encoders, 3 bancos A/B/C, canal 7.
 * El orden de serialización binaria debe coincidir byte a byte con el firmware.
 */

export type Bank = 'A' | 'B' | 'C'
export const BANKS: Bank[] = ['A', 'B', 'C']

export type KnoboControlId =
  | 'k0' | 'k1' | 'k2' | 'k3'
  | 'k4' | 'k5' | 'k6' | 'k7'

export const ALL_KNOBO_CONTROL_IDS: KnoboControlId[] = [
  'k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7',
]

export const KNOBO_MESH_TO_CONTROL: Record<string, KnoboControlId> = {
  knob_1: 'k0', knob_2: 'k1', knob_3: 'k2', knob_4: 'k3',
  knob_5: 'k4', knob_6: 'k5', knob_7: 'k6', knob_8: 'k7',
}

export const KNOBO_CHANNEL = 7

export const KNOBO_CC_BY_BANK: Record<Bank, number[]> = {
  A: [14, 15, 16, 17, 18, 19, 20, 21],
  B: [22, 23, 24, 25, 26, 27, 28, 29],
  C: [102, 103, 104, 105, 106, 107, 108, 109],
}

export const KNOBO_BANK_CC: Record<Bank, number> = { A: 116, B: 117, C: 118 }
export const KNOBO_TOUCH_SELECT_CC = 110

export interface Behavior {
  id: string
  name: string
  desc: string
  icon: string
  info: string
}

export const KNOBO_BEHAVIORS: Behavior[] = [
  { id: 'directo', name: 'Directo', desc: 'Sigue tu mano 1:1', icon: '→', info: 'El control hace exactamente lo que\ntu mano hace. Sin efectos ni trucos.' },
  { id: 'inercia', name: 'Inercia', desc: 'Suaviza y rebota', icon: '∿', info: 'El sonido cambia suavemente,\ncomo si tuviera peso.' },
  { id: 'espejo', name: 'Espejo', desc: 'Se mueve al contrario', icon: '⇄', info: 'Funciona al reves: si subes\nel sonido baja, y viceversa.' },
  { id: 'random', name: 'Paso aleatorio', desc: 'Salta a valores cercanos', icon: '⚂', info: 'Cada movimiento salta a un punto\ndistinto cercano.' },
  { id: 'oscila', name: 'Oscilacion libre', desc: 'Sigue moviendose solo', icon: '~', info: 'El control se mueve solo sin que\ntoques nada.' },
]

export const KNOBO_PARAM_LABELS: Record<string, string> = {
  inercia: 'Velocidad de inercia',
  espejo: 'Cantidad de inversion',
  random: 'Rango de salto',
  oscila: 'Velocidad de oscilacion',
}

export const KNOBO_BEHAVIOR_IDS: Record<string, number> = {
  directo: 0, inercia: 1, espejo: 2, random: 3, oscila: 4,
}

export interface KnoboControlConfig {
  type: 'cc' | 'pb'
  num: number
  chan: number
  mode: 'momentary' | 'toggle'
  behavior: string
  param: number
  min: number
  max: number
  label: string
}

export type KnoboControlState = Record<KnoboControlId, Record<Bank, KnoboControlConfig>>

export const KNOBO_LABELS: Record<KnoboControlId, string> = {
  k0: 'Knob 1', k1: 'Knob 2', k2: 'Knob 3', k3: 'Knob 4',
  k4: 'Knob 5', k5: 'Knob 6', k6: 'Knob 7', k7: 'Knob 8',
}

export function knoboLabelFor(id: KnoboControlId): string {
  return KNOBO_LABELS[id] ?? id
}

export function makeKnoboInitialState(): KnoboControlState {
  const state = {} as KnoboControlState
  ALL_KNOBO_CONTROL_IDS.forEach((id, i) => {
    state[id] = {} as Record<Bank, KnoboControlConfig>
    for (const b of BANKS) {
      state[id][b] = {
        type: 'cc',
        num: KNOBO_CC_BY_BANK[b][i],
        chan: KNOBO_CHANNEL,
        mode: 'momentary',
        behavior: 'directo',
        param: 50,
        min: 0,
        max: 127,
        label: KNOBO_LABELS[id],
      }
    }
  })
  return state
}
