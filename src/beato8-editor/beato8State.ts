/**
 * beato8State.ts — Estado y mapeo del editor MIDI del BEATO8.
 *
 * 4 knobs + 8 pads arcade con LED, 3 bancos A/B/C, canal 4.
 */

export type Bank = 'A' | 'B' | 'C'
export const BANKS: Bank[] = ['A', 'B', 'C']

export type Beato8ControlId =
  | 'k0' | 'k1' | 'k2' | 'k3'
  | 'p0' | 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7'

export const BEATO8_KNOB_IDS: Beato8ControlId[] = ['k0', 'k1', 'k2', 'k3']
export const BEATO8_PAD_IDS: Beato8ControlId[] = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']
export const ALL_BEATO8_CONTROL_IDS: Beato8ControlId[] = [...BEATO8_KNOB_IDS, ...BEATO8_PAD_IDS]

export const BEATO8_MESH_TO_CONTROL: Record<string, Beato8ControlId> = {
  Knob1: 'k0', Knob2: 'k1', Knob3: 'k2', Knob4: 'k3',
  Boton1: 'p0', Boton2: 'p1', Boton3: 'p2', Boton4: 'p3',
  Boton5: 'p4', Boton6: 'p5', Boton7: 'p6', Boton8: 'p7',
}

export const BEATO8_CHANNEL = 4

export const BEATO8_KNOB_CC_BY_BANK: Record<Bank, number[]> = {
  A: [14, 15, 16, 17],
  B: [22, 23, 24, 25],
  C: [102, 103, 104, 105],
}

export const BEATO8_PAD_NOTE_BY_BANK: Record<Bank, number[]> = {
  A: [36, 37, 38, 39, 40, 41, 42, 43],
  B: [44, 45, 46, 47, 48, 49, 50, 51],
  C: [52, 53, 54, 55, 56, 57, 58, 59],
}

export const BEATO8_BANK_CC: Record<Bank, number> = { A: 116, B: 117, C: 118 }
export const BEATO8_TOUCH_SELECT_CC = 110

export function isBeato8Pad(id: Beato8ControlId): boolean { return id.startsWith('p') }

export interface Behavior {
  id: string; name: string; desc: string; icon: string; info: string
}

export const BEATO8_KNOB_BEHAVIORS: Behavior[] = [
  { id: 'directo', name: 'Directo', desc: 'Sigue tu mano 1:1', icon: '→', info: 'El control hace exactamente lo que tu mano hace.' },
  { id: 'inercia', name: 'Inercia', desc: 'Suaviza y rebota', icon: '∿', info: 'El sonido cambia suavemente.' },
  { id: 'espejo', name: 'Espejo', desc: 'Se mueve al contrario', icon: '⇄', info: 'Funciona al reves.' },
  { id: 'random', name: 'Paso aleatorio', desc: 'Salta a valores cercanos', icon: '⚂', info: 'Cada movimiento salta a un punto distinto.' },
  { id: 'oscila', name: 'Oscilacion libre', desc: 'Sigue moviendose solo', icon: '~', info: 'El control se mueve solo.' },
]

export const BEATO8_PAD_BEHAVIORS: Behavior[] = [
  { id: 'directo', name: 'Directo', desc: 'Nota al presionar/soltar', icon: '→', info: 'Suena cuando lo aprietas y para cuando sueltas.' },
  { id: 'retrigger', name: 'Retrigger', desc: 'Repite mientras presionas', icon: '⟳', info: 'La nota se repite sola mientras mantienes.' },
  { id: 'rafaga', name: 'Rafaga', desc: 'Notas al azar', icon: '⚂', info: 'Lanza notas aleatorias.' },
]

export const BEATO8_PARAM_LABELS: Record<string, string> = {
  inercia: 'Velocidad de inercia', espejo: 'Cantidad de inversion',
  random: 'Rango de salto', oscila: 'Velocidad de oscilacion',
  retrigger: 'Velocidad de repeticion', rafaga: 'Densidad',
}

export const BEATO8_BEHAVIOR_IDS: Record<string, number> = {
  directo: 0, inercia: 1, espejo: 2, random: 3, oscila: 4, retrigger: 5, rafaga: 6,
}

export interface Beato8ControlConfig {
  type: 'cc' | 'note'
  num: number
  chan: number
  mode: 'momentary' | 'toggle'
  behavior: string
  param: number
  velMin: number
  velMax: number
  label: string
}

export type Beato8ControlState = Record<Beato8ControlId, Record<Bank, Beato8ControlConfig>>

export const BEATO8_LABELS: Record<Beato8ControlId, string> = {
  k0: 'Knob 1', k1: 'Knob 2', k2: 'Knob 3', k3: 'Knob 4',
  p0: 'Pad 1', p1: 'Pad 2', p2: 'Pad 3', p3: 'Pad 4',
  p4: 'Pad 5', p5: 'Pad 6', p6: 'Pad 7', p7: 'Pad 8',
}

export function beato8LabelFor(id: Beato8ControlId): string { return BEATO8_LABELS[id] ?? id }

export function makeBeato8InitialState(): Beato8ControlState {
  const state = {} as Beato8ControlState
  BEATO8_KNOB_IDS.forEach((id, i) => {
    state[id] = {} as Record<Bank, Beato8ControlConfig>
    for (const b of BANKS) {
      state[id][b] = {
        type: 'cc', num: BEATO8_KNOB_CC_BY_BANK[b][i], chan: BEATO8_CHANNEL,
        mode: 'momentary', behavior: 'directo', param: 50,
        velMin: 0, velMax: 127, label: BEATO8_LABELS[id],
      }
    }
  })
  BEATO8_PAD_IDS.forEach((id, i) => {
    state[id] = {} as Record<Bank, Beato8ControlConfig>
    for (const b of BANKS) {
      state[id][b] = {
        type: 'note', num: BEATO8_PAD_NOTE_BY_BANK[b][i], chan: BEATO8_CHANNEL,
        mode: 'momentary', behavior: 'directo', param: 50,
        velMin: 127, velMax: 127, label: BEATO8_LABELS[id],
      }
    }
  })
  return state
}
