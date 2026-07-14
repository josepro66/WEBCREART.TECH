/**
 * midiState.ts — Modelo de datos del editor MIDI del BEATO16.
 *
 * Portado a TS del HTML standalone (creart-beato16-fixed.html). Solo el
 * estado y los catálogos; el renderizado 3D y los eventos viven en
 * otros archivos.
 */

export type Bank = 'A' | 'B' | 'C'
export const BANKS: Bank[] = ['A', 'B', 'C']

/** Identificadores lógicos de cada control. Coinciden con los IDs del HTML. */
export type ControlId =
  | 'k0' | 'k1' | 'k2' | 'k3'         // 4 knobs
  | 'f0'                                // 1 fader
  | 'c0' | 'c1' | 'c2' | 'c3'           // bank A, B, C, shift
  | 'p0' | 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7'
  | 'p8' | 'p9' | 'p10' | 'p11' | 'p12' | 'p13' | 'p14' | 'p15'

export const ALL_CONTROL_IDS: ControlId[] = [
  'k0', 'k1', 'k2', 'k3',
  'f0',
  'c0', 'c1', 'c2', 'c3',
  'p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7',
  'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15',
]

/**
 * Mapeo nombre-de-malla-en-GLB → id-lógico. Es la pieza clave que conecta
 * el modelo 3D del configurador con la lógica MIDI del editor. Verificado
 * inspeccionando BEATO16.glb (ver Beato16Configurator.tsx).
 *
 * Los knobs y faders en el GLB tienen dos partes (_1 cuerpo, _2 anillo);
 * ambas mapean al mismo id lógico para que al hacer clic en cualquiera
 * se seleccione el knob completo.
 */
export const MESH_TO_CONTROL: Record<string, ControlId> = {
  // Botones animados (nuevo GLB: minúsculas, sin sufijo .001)
  boton1: 'p0',  boton2: 'p1',  boton3: 'p2',  boton4: 'p3',
  boton5: 'p4',  boton6: 'p5',  boton7: 'p6',  boton8: 'p7',
  boton9: 'p8',  boton10: 'p9', boton11: 'p10', boton12: 'p11',
  boton13: 'p12', boton14: 'p13', boton15: 'p14', boton16: 'p15',
  oton4: 'p3',   // typo en el GLB exportado (falta la 'b')
  // Tapas (aros de borde) — mismo control que su botón
  tapa1: 'p0',  tapa2: 'p1',  tapa3: 'p2',  tapa4: 'p3',
  tapa5: 'p4',  tapa6: 'p5',  tapa7: 'p6',  tapa8: 'p7',
  tapa9: 'p8',  tapa10: 'p9', tapa11: 'p10', tapa12: 'p11',
  tapa13: 'p12', tapa14: 'p13', tapa15: 'p14', tapa16: 'p15',
  // Knobs
  knob1: 'k0', knob2: 'k1', knob3: 'k2', knob4: 'k3',
  // Fader
  fader1: 'f0',
  // Teclas A/B/C/Shift
  tecla1: 'c0', tecla2: 'c1', tecla3: 'c2', tecla4: 'c3',
}

// ── Catálogos ─────────────────────────────────────────────────────

export interface Behavior {
  id: string
  name: string
  desc: string
  icon: string
  info: string          // texto de ayuda mostrado en modo info
}

export const KNOB_BEHAVIORS: Behavior[] = [
  { id: 'directo', name: 'Directo', desc: 'Sigue tu mano 1:1', icon: '→', info: 'El knob hace exactamente lo que\ntu mano hace. Sin efectos ni trucos.\nLo que giras es lo que suena.' },
  { id: 'inercia', name: 'Inercia', desc: 'Suaviza y rebota', icon: '∿', info: 'El sonido cambia suavemente,\ncomo si tuviera peso. Ideal para\ntransiciones elegantes y naturales.' },
  { id: 'espejo', name: 'Espejo', desc: 'Se mueve al contrario', icon: '⇄', info: 'Funciona al revés: si subes el knob\nel sonido baja, y viceversa.\nÚtil para efectos invertidos.' },
  { id: 'random', name: 'Paso aleatorio', desc: 'Salta a valores cercanos', icon: '⚂', info: 'Cada movimiento salta a un punto\ndistinto cercano. Crea variaciones\nespontáneas e impredecibles.' },
  { id: 'oscila', name: 'Oscilación libre', desc: 'Sigue moviéndose solo', icon: '~', info: 'El control se mueve solo sin que\ntoques nada. Crea un efecto\nautomático de variación continua.' },
]

export const PAD_BEHAVIORS: Behavior[] = [
  { id: 'directo', name: 'Directo', desc: 'Nota al presionar/soltar', icon: '→', info: 'Funciona normal: suena cuando\nlo aprietas y para cuando sueltas.\nComo cualquier pad de batería.' },
  { id: 'retrigger', name: 'Retrigger', desc: 'Repite la nota mientras presionas', icon: '⟳', info: 'Mientras mantienes el pad apretado\nla nota se repite sola muy rápido.\nAjusta la velocidad con el slider.' },
  { id: 'rafaga', name: 'Ráfaga aleatoria', desc: 'Dispara notas al azar', icon: '⚂', info: 'Lanza notas de forma aleatoria\nmientras lo mantienes apretado.\nCrea efectos creativos e inesperados.' },
]

export const PARAM_LABELS: Record<string, string> = {
  inercia: 'Velocidad de inercia',
  espejo: 'Cantidad de inversión',
  random: 'Rango de salto',
  oscila: 'Velocidad de oscilación',
  retrigger: 'Velocidad de repetición',
  rafaga: 'Densidad',
}

// ── Estado por control ────────────────────────────────────────────

export interface ControlConfig {
  type: 'note' | 'cc' | 'pc' | 'pb'
  num: number
  chan: number          // 1-16 (display, igual que los DAWs; -1 al enviar)
  mode: 'momentary' | 'toggle'
  behavior: string
  param: number
  velMin: number        // pads: velocity mín; knobs/fader: CC range mín
  velMax: number        // pads: velocity máx; knobs/fader: CC range máx
  velRandom: boolean    // pads only: randomize velocity between min/max
  pcLabel: string       // pads with type=pc: preset name label
}

export type ControlState = Record<ControlId, Record<Bank, ControlConfig>>

export function isPad(id: ControlId): boolean {
  return id.startsWith('p') || id === 'c3'
}

export function labelFor(id: ControlId): string {
  if (id.startsWith('k')) return `Knob ${parseInt(id.slice(1)) + 1}`
  if (id.startsWith('f')) return 'Fader'
  if (id === 'c0') return 'Banco A'
  if (id === 'c1') return 'Banco B'
  if (id === 'c2') return 'Banco C'
  if (id === 'c3') return 'Shift'
  if (id.startsWith('p')) return `Pad ${parseInt(id.slice(1)) + 1}`
  return id
}

export function behaviorsFor(id: ControlId): Behavior[] {
  return isPad(id) ? PAD_BEHAVIORS : KNOB_BEHAVIORS
}

/**
 * Estado inicial por control y banco, con los valores de fábrica del Beato 16
 * (verificados con MIDI Monitor: pads en canal 3, knobs/fader/shift en canal 9).
 */
export function makeInitialState(): ControlState {
  const state = {} as ControlState
  for (const id of ALL_CONTROL_IDS) {
    state[id] = {} as Record<Bank, ControlConfig>
    for (const b of BANKS) {
      const padIndex = id.startsWith('p') ? parseInt(id.slice(1)) : 0
      const knobIndex = id.startsWith('k') ? parseInt(id.slice(1)) : 0
      const bankOffset = b === 'B' ? 16 : b === 'C' ? 32 : 0
      const bankKnobOffset = b === 'B' ? 10 : b === 'C' ? 20 : 0

      // Canal 1-16 (igual que los DAWs). Al enviar MIDI / serializar al
      // firmware se resta 1 para obtener el índice 0-15. v4 (Beato16_v4.ino):
      // Beato unificado en canal 4 — pads=Notes, knobs/fader/shift=CC en el
      // mismo canal; no chocan porque son tipos distintos.
      let num = 36
      const chan = 4
      if (id.startsWith('p')) {
        num = 36 + padIndex + bankOffset
      } else if (id.startsWith('k')) {
        num = 30 + knobIndex + bankKnobOffset
      } else if (id.startsWith('f')) {
        num = 34 + bankKnobOffset
      } else if (id === 'c3') {
        num = 63
      }

      const padLike = isPad(id)
      state[id][b] = {
        type: padLike ? 'note' : 'cc',
        num,
        chan,
        mode: 'momentary',
        behavior: padLike ? PAD_BEHAVIORS[0].id : KNOB_BEHAVIORS[0].id,
        param: 50,
        velMin: padLike ? 127 : 0,
        velMax: 127,
        velRandom: false,
        pcLabel: '',
      }
    }
  }
  return state
}
