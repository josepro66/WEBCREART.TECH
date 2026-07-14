/**
 * wavoControlState.ts — Control ID system for the WAVO interactive 3D editor.
 * Mesh names confirmed from Blender: encoder1-4, boton1-12, tecla1-4.
 */

import { CC } from './wavoState'

// ── Control identifiers ─────────────────────────────────────────────

export type EncoderControlId = 'enc1' | 'enc2' | 'enc3' | 'enc4'
export type KeyControlId =
  | 'key1' | 'key2' | 'key3' | 'key4' | 'key5' | 'key6'
  | 'key7' | 'key8' | 'key9' | 'key10' | 'key11' | 'key12'
export type TeclaControlId = 'tecla1' | 'tecla2' | 'tecla3' | 'tecla4'
export type WavoControlId = EncoderControlId | KeyControlId | TeclaControlId

// ── Mesh name → ControlId mapping ──────────────────────────────────

export const MESH_TO_WAVO_CONTROL: Record<string, WavoControlId> = {
  // Encoders (ridged red cylinders — children of Cube.035)
  encoder1: 'enc1',
  encoder2: 'enc2',
  encoder3: 'enc3',
  encoder4: 'enc4',
  // MUX keyboard keys (round buttons)
  boton1:  'key1',
  boton2:  'key2',
  boton3:  'key3',
  boton4:  'key4',
  boton5:  'key5',
  boton6:  'key6',
  boton7:  'key7',
  boton8:  'key8',
  boton9:  'key9',
  boton10: 'key10',
  boton11: 'key11',
  boton12: 'key12',
  // Tapa rings (decorative rings around each boton — clicking them also selects the key)
  'tapa1.001': 'key1',
  'tapa2.001': 'key2',
  tapa3:  'key3',
  tapa4:  'key4',
  tapa5:  'key5',
  tapa6:  'key6',
  tapa7:  'key7',
  tapa8:  'key8',
  tapa9:  'key9',
  tapa10: 'key10',
  tapa11: 'key11',
  tapa12: 'key12',
  // Function buttons (flat white rectangles on left)
  tecla1: 'tecla1',
  tecla2: 'tecla2',
  tecla3: 'tecla3',
  tecla4: 'tecla4',
}

// ── Default MIDI note for each MUX key (C2-D3, WAVO firmware layout) ──

export const KEY_NOTES: Record<KeyControlId, number> = {
  key1: 36, key2: 37, key3: 38, key4: 39,
  key5: 40, key6: 41, key7: 42, key8: 43,
  key9: 44, key10: 45, key11: 46, key12: 47,
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export function noteName(n: number) {
  const oct = Math.floor(n / 12) - 1
  return NOTE_NAMES[n % 12] + oct
}

// ── Encoder CC assignment per "mode" context ────────────────────────

export type EncoderMode = 'osc' | 'filter' | 'adsr' | 'fx' | 'arp' | 'seq' | 'drums' | 'mixer' | 'harm'

export const ENCODER_LABELS: Record<EncoderMode, [string, string, string, string]> = {
  osc:    ['Waveform', 'FM Rate', 'Detune', 'Volume'],
  filter: ['Cutoff', 'Resonance', 'EG Amt', 'Volume'],
  adsr:   ['Attack', 'Decay', 'Sustain', 'Release'],
  fx:     ['Reverb', 'Delay', 'Chorus', 'Drive'],
  arp:    ['ARP Mode', 'ARP Div', 'ARP Oct', 'BPM'],
  seq:    ['BPM', 'Swing', 'Volume', 'Transport'],
  drums:  ['Kick', 'Snare', 'HH', 'Volume'],
  mixer:  ['Ch1 Vol', 'Ch2 Vol', 'Ch3 Vol', 'Ch4 Vol'],
  harm:   ['Root', 'Mode', 'Voices', 'Volume'],
}

export const ENCODER_CC: Record<EncoderMode, [number, number, number, number]> = {
  osc:    [CC.WAVEFORM, CC.FM_RATE, CC.DETUNE, CC.MASTER_VOL],
  filter: [CC.CUTOFF, CC.RESONANCE, CC.EG_AMOUNT, CC.MASTER_VOL],
  adsr:   [CC.ATTACK, CC.DECAY, CC.SUSTAIN, CC.RELEASE],
  fx:     [CC.REVERB, CC.DELAY_FB, CC.CHORUS, CC.OVERDRIVE],
  arp:    [CC.ARP_MODE, CC.ARP_DIV, CC.ARP_OCTAVES, CC.BPM],
  seq:    [CC.BPM, CC.SWING, CC.MASTER_VOL, CC.TRANSPORT],
  drums:  [22, 28, 34, CC.MASTER_VOL],
  mixer:  [0, 6, 12, 18],
  harm:   [CC.HARM_ROOT, CC.HARM_MODE, CC.HARM_VOICES, CC.MASTER_VOL],
}

// ── Tecla labels ──────────────────────────────────────────────────

export const TECLA_LABELS: Record<TeclaControlId, string> = {
  tecla1: 'SHIFT',
  tecla2: 'ARP ON',
  tecla3: 'PLAY',
  tecla4: 'STOP',
}

// ── Control type guards ──────────────────────────────────────────

export function isEncoder(id: WavoControlId): id is EncoderControlId {
  return id.startsWith('enc')
}
export function isKey(id: WavoControlId): id is KeyControlId {
  return id.startsWith('key')
}
export function isTecla(id: WavoControlId): id is TeclaControlId {
  return id.startsWith('tecla')
}

export function labelFor(id: WavoControlId, mode: EncoderMode = 'osc'): string {
  if (isEncoder(id)) {
    const i = parseInt(id.replace('enc', '')) - 1
    return ENCODER_LABELS[mode][i] ?? id
  }
  if (isKey(id)) {
    const i = parseInt(id.replace('key', '')) as 1
    return `Key ${id.replace('key', '')} — ${noteName(KEY_NOTES[id as KeyControlId])}`
  }
  if (isTecla(id)) return TECLA_LABELS[id]
  return id
}
