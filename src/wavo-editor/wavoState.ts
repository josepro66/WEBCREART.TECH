/**
 * wavoState.ts — Tipos, constantes MIDI y estado inicial del WAVO editor.
 * Protocolo exacto sacado de midi_handler.h del firmware.
 */

// ── MIDI constants ────────────────────────────────────────────────
export const CH_SYNTH  = 0  // Canal 1 (0-indexed)
export const CH_MIXER  = 1  // Canal 2
export const CH_DRUMS  = 9  // Canal 10

export const CC = {
  // OSC
  WAVEFORM:  70, FM_RATE: 14, DETUNE: 15, FM_RATIO: 112, FM_MOD_WAVE: 113,
  // FILTER
  CUTOFF: 74, RESONANCE: 71, EG_AMOUNT: 79,
  // ADSR
  ATTACK: 73, DECAY: 75, SUSTAIN: 76, RELEASE: 72,
  // FX
  REVERB: 91, DELAY_FB: 92, DELAY_TIME: 16, CHORUS: 94, OVERDRIVE: 93, BITCRUSH: 95,
  CHORUS_RATE: 100, TREMOLO: 101, TREMOLO_RATE: 102, RING_MOD: 103,
  PHASER_DEPTH: 104, PHASER_RATE: 105, FLANGER: 106, COMPRESS: 107,
  EQ_LOW: 108, EQ_MID: 109, EQ_HI: 110,
  // ARP
  ARP_ACTIVE: 85, ARP_MODE: 86, ARP_DIV: 87, ARP_OCTAVES: 88,
  // HARMONIZER
  HARM_ROOT: 96, HARM_MODE: 97, HARM_VOICES: 98, HARM_VOICING: 99, OCTAVE: 111,
  // TRANSPORT
  TRANSPORT: 22, BPM: 20, SWING: 21,
  // VOLUME
  MASTER_VOL: 7,
  // DRUMS (Ch10)
  DRUM_KICK_PITCH: 22, DRUM_KICK_DECAY: 23, DRUM_KICK_PUNCH: 24, DRUM_KICK_DRIVE: 25,
  DRUM_SNARE_PITCH: 26, DRUM_SNARE_DECAY: 27, DRUM_SNARE_SNAP: 28, DRUM_SNARE_DRIVE: 29,
  DRUM_HHO_TONE: 30, DRUM_HHO_DECAY: 31,
  DRUM_HHC_TONE: 33, DRUM_HHC_DECAY: 34,
  DRUM_CLAP_TUNE: 35, DRUM_CLAP_DECAY: 36,
  DRUM_TOM_TUNE: 37, DRUM_TOM_DECAY: 38,
  DRUM_RIM_TUNE: 39, DRUM_RIM_DECAY: 40,
  DRUM_PERC_TUNE: 41, DRUM_PERC_DECAY: 42,
} as const

// SysEx WAVO: F0 00 21 7F CMD DATA F7
export const SX_MFR = [0x00, 0x21, 0x7f]
export const SX_CMD = {
  TRANSPORT:   0x01,
  BPM:         0x02,
  DRUM_PATTERN:0x03,
  SWING:       0x04,
  SET_MENU:    0x05,
  SEQ_NOTES:   0x06,
  SEQ_FLAGS:   0x07,
  SEQ_GLOBAL:  0x08,
  SEQ_SYNTH:   0x09,
} as const

// Índices de MenuPage del firmware (ui_common.h)
export const WAVO_MENU = {
  SPLASH:       0,
  OSCILLATOR:   1,
  ADSR:         2,
  SEQUENCER:    3,
  ARP:          4,
  PATTERNS:     5,
  DRUMS:        6,
  KICK_EDIT:    7,
  BASS:         8,
  CHORD:        9,
  MIXER:       10,
} as const

// Tab del editor web → MenuPage del firmware
export const TAB_TO_WAVO_MENU: Record<string, number> = {
  osc:    WAVO_MENU.OSCILLATOR,
  filter: WAVO_MENU.OSCILLATOR,
  adsr:   WAVO_MENU.ADSR,
  fx:     WAVO_MENU.OSCILLATOR,
  arp:    WAVO_MENU.ARP,
  seq:    WAVO_MENU.SEQUENCER,
  drums:  WAVO_MENU.DRUMS,
  mixer:  WAVO_MENU.MIXER,
  harm:   WAVO_MENU.CHORD,
}

// Drum track notes (GM)
export const DRUM_NOTES = [36, 38, 46, 42, 39, 45, 37, 43] // KICK SNARE HHO HHC CLAP TOM RIM PERC
export const DRUM_NAMES = ['Kick', 'Snare', 'HHO', 'HHC', 'Clap', 'Tom', 'Rim', 'Perc']
export const DRUM_COLORS = ['#FF6B35', '#C8FF4D', '#00E5FF', '#00E5FF', '#FF3366', '#C8A4FF', '#A8A8A8', '#FFB800']

export const WAVEFORM_NAMES = ['SAW', 'SQR', 'TRI', 'SIN']
export const WAVEFORM_COLORS = ['#FF3366', '#00E5FF', '#C8FF4D', '#C8A4FF']

export const ARP_MODE_NAMES = ['UP', 'DOWN', 'UP↓DN', 'RND']
export const ARP_DIV_NAMES  = ['1/4', '1/8', '1/16', '1/32']

export const HARM_ROOTS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
export const HARM_MODES = ['Major','Minor','Dorian','Phrygian','Lydian','Mixolyd','Locrian']
export const HARM_VOICINGS = ['Root','1st Inv','2nd Inv','3rd Inv','Drop2','Drop3','Spread','Open','Closed','Wide']

export const FM_RATIO_NAMES = ['1:2','1:1','3:2','2:1','3:1','4:1','5:1','7:1']
export const FM_MOD_NAMES   = ['SIN','SAW','SQR','TRI']

export const MIXER_CHANNEL_NAMES = ['SYNTH','SEQ','ARP','DRUMS','HARM','MASTER']
export const MIXER_PARAM_NAMES   = ['VOL','PAN','CHO','DLY','REV','SHF']

// Drum track CC offsets (index → [pitch_cc, decay_cc, punch_cc, drive_cc])
// -1 means no CC for that param on that track
export const DRUM_TRACK_CCS: [number, number, number, number][] = [
  [22, 23, 24, 25], // KICK
  [26, 27, 28, 29], // SNARE
  [30, 31, -1, -1], // HHO (no punch/drive)
  [33, 34, -1, -1], // HHC
  [35, 36, -1, -1], // CLAP
  [37, 38, -1, -1], // TOM
  [39, 40, -1, -1], // RIM
  [41, 42, -1, -1], // PERC
]

// ── State types ──────────────────────────────────────────────────

export interface MixerChannel { vol: number; pan: number; cho: number; dly: number; rev: number; shf: number }

export interface WavoState {
  // OSC
  waveform: number     // 0-3 (maps to CC ranges: 0→0-31, 1→32-63, 2→64-95, 3→96-127)
  fmRate: number       // 0-127
  detune: number       // 0-127
  fmRatioIdx: number   // 0-7 (0→0-15.8, ..., 7→119-127)
  fmModWave: number    // 0-3
  // FILTER
  cutoff: number       // 0-127
  resonance: number    // 0-127
  egAmount: number     // 0-127
  // ADSR
  attack: number       // 0-127
  decay: number        // 0-127
  sustain: number      // 0-127
  release: number      // 0-127
  // FX
  reverb: number; delayTime: number; delayFeedback: number
  chorus: number; overdrive: number; bitcrush: number
  chorusRate: number; tremolo: number; tremoloRate: number
  ringMod: number; phaserDepth: number; phaserRate: number
  flanger: number; compress: number; eqLow: number; eqMid: number; eqHi: number
  // ARP
  arpActive: boolean; arpMode: number; arpDiv: number; arpOctaves: number
  // HARMONIZER
  harmRoot: number; harmMode: number; harmVoices: number; harmVoicing: number; harmOctave: number
  // TRANSPORT
  bpm: number; swing: number; playing: boolean
  // VOLUME
  masterVolume: number
  // MIXER (6 channels)
  mixer: MixerChannel[]
  // DRUMS
  drumPatterns: boolean[][]  // 8 × 16
  drumPitch: number[]        // 0-127 × 8
  drumDecay: number[]        // 0-127 × 8
  drumPunch: number[]        // 0-127 × 8 (-1 for tracks without punch)
  drumDrive: number[]        // 0-127 × 8
  drumVolume: number
  // SEQ
  seqNotes: number[]         // MIDI note 0-127 × 16
  seqActive: boolean[]       // × 16
  seqAccent: boolean[]
  seqTie: boolean[]
  seqSlide: boolean[]
  seqGateTime: number        // 0-100
  seqStepLength: number      // 1-16
  seqPingPong: boolean
  // SEQ Synth (303)
  seqCutoff: number; seqRes: number; seqDecay: number; seqVol: number
  seqWave: number; seq303Env: number; seq303Dec: number; seq303Drive: number
}

export function makeInitialWavoState(): WavoState {
  return {
    waveform: 0, fmRate: 0, detune: 64, fmRatioIdx: 3, fmModWave: 0,
    cutoff: 127, resonance: 60, egAmount: 64,
    attack: 10, decay: 50, sustain: 80, release: 30,
    reverb: 100, delayTime: 70, delayFeedback: 70, chorus: 70,
    overdrive: 0, bitcrush: 0,
    chorusRate: 18, tremolo: 0, tremoloRate: 60, ringMod: 0,
    phaserDepth: 0, phaserRate: 40, flanger: 0, compress: 0,
    eqLow: 64, eqMid: 64, eqHi: 64,
    arpActive: false, arpMode: 0, arpDiv: 2, arpOctaves: 2,
    harmRoot: 0, harmMode: 0, harmVoices: 2, harmVoicing: 0, harmOctave: 64,
    bpm: 120, swing: 0, playing: false,
    masterVolume: 100,
    mixer: Array.from({ length: 6 }, () => ({ vol: 96, pan: 64, cho: 0, dly: 0, rev: 0, shf: 0 })),
    drumPatterns: Array.from({ length: 8 }, (_, t) => {
      const row = Array(16).fill(false)
      if (t === 0) { row[0]=true; row[4]=true; row[8]=true; row[12]=true } // kick on beats
      if (t === 1) { row[4]=true; row[12]=true }                            // snare
      if (t === 2) { row.fill(true) }                                       // HHC 16ths
      return row
    }),
    drumPitch: [64, 64, 64, 64, 64, 64, 64, 64],
    drumDecay: [64, 64, 64, 64, 64, 64, 64, 64],
    drumPunch: [64, 64, -1, -1, -1, -1, -1, -1],
    drumDrive: [0, 0, -1, -1, -1, -1, -1, -1],
    drumVolume: 100,
    seqNotes: [60,62,64,65,67,69,71,72,60,62,64,65,67,69,71,72],
    seqActive: Array(16).fill(false).map((_,i) => i < 4),
    seqAccent: Array(16).fill(false),
    seqTie: Array(16).fill(false),
    seqSlide: Array(16).fill(false),
    seqGateTime: 50, seqStepLength: 16, seqPingPong: false,
    seqCutoff: 60, seqRes: 100, seqDecay: 50, seqVol: 90,
    seqWave: 0, seq303Env: 100, seq303Dec: 50, seq303Drive: 20,
  }
}

// ── MIDI helpers ─────────────────────────────────────────────────

export function sendCC(out: MIDIOutput, cc: number, val: number, chan = CH_SYNTH) {
  out.send([0xb0 | chan, cc, Math.max(0, Math.min(127, Math.round(val)))])
}

export function sendNoteOn(out: MIDIOutput, note: number, vel: number, chan = CH_SYNTH) {
  out.send([0x90 | chan, note, vel])
}

export function sendNoteOff(out: MIDIOutput, note: number, chan = CH_SYNTH) {
  out.send([0x80 | chan, note, 0])
}

export function sendSysEx(out: MIDIOutput, cmd: number, data: number[]) {
  out.send([0xf0, ...SX_MFR, cmd, ...data, 0xf7])
}

// waveform 0-3 → CC 70 value
export function waveformToCC(w: number): number {
  return [16, 48, 80, 112][w] ?? 0
}

// FM ratio idx 0-7 → CC 112 value
export function fmRatioToCC(idx: number): number {
  return Math.round((idx / 7) * 127)
}

// FM mod wave 0-3 → CC 113 value
export function fmModWaveToCC(w: number): number {
  return [16, 48, 80, 112][w] ?? 0
}

// ARP mode 0-3 → CC 86 value
export function arpModeToCC(m: number): number {
  return m * 32 + 16
}

// ARP div 0-3 → CC 87 value
export function arpDivToCC(d: number): number {
  return d * 32 + 16
}

// ARP octaves 1-4 → CC 88 value
export function arpOctavesToCC(o: number): number {
  return Math.round(((o - 1) / 3) * 127)
}

// Harm mode 0-6 → CC 97 value
export function harmModeToCC(m: number): number {
  return Math.round((m / 6) * 127)
}

// Harm voices 1-4 → CC 98 value
export function harmVoicesToCC(v: number): number {
  return Math.round(((v - 1) / 3) * 127)
}

// Harm voicing 0-9 → CC 99 value
export function harmVoicingToCC(v: number): number {
  return Math.round((v / 9) * 127)
}

// Drum pattern → SysEx CMD 0x03
export function buildDrumPatternSysEx(track: number, steps: boolean[]): number[] {
  return [track & 0x07, ...steps.slice(0, 16).map(s => s ? 0x01 : 0x00)]
}

// SEQ notes → SysEx CMD 0x06
export function buildSeqNotesSysEx(stepLen: number, active: boolean[], notes: number[]): number[] {
  return [
    stepLen & 0x7f,
    ...active.slice(0, 16).map(a => a ? 0x01 : 0x00),
    ...notes.slice(0, 16).map(n => n & 0x7f),
  ]
}

// SEQ flags → SysEx CMD 0x07
export function buildSeqFlagsSysEx(accent: boolean[], tie: boolean[], slide: boolean[]): number[] {
  const flags = accent.slice(0,16).map((_,i) =>
    (accent[i] ? 0x01 : 0) | (tie[i] ? 0x02 : 0) | (slide[i] ? 0x04 : 0)
  )
  const repeats = Array(16).fill(1)
  return [...flags, ...repeats]
}

// SEQ global → SysEx CMD 0x08
export function buildSeqGlobalSysEx(gateTime: number, pingPong: boolean): number[] {
  return [Math.max(0, Math.min(100, gateTime)), pingPong ? 1 : 0]
}

// SEQ synth → SysEx CMD 0x09
export function buildSeqSynthSysEx(s: WavoState): number[] {
  return [s.seqCutoff, s.seqRes, s.seqDecay, s.seqVol, s.seqWave, s.seq303Env, s.seq303Dec, s.seq303Drive]
}

// BPM precise → SysEx CMD 0x02
export function buildBpmSysEx(bpm: number): number[] {
  const v = Math.max(0, bpm - 40) & 0x3fff
  return [v & 0x7f, (v >> 7) & 0x7f]
}

// Mixer → CC on Ch2
export function sendMixer(out: MIDIOutput, ch: number, param: number, val127: number) {
  const cc = ch * 6 + param
  sendCC(out, cc, val127, CH_MIXER)
}

export function isWavoDevice(name: string): boolean {
  return /wavo|syntesp|esp32/i.test(name)
}

// MIDI note number → note name
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
export function noteName(n: number): string {
  return NOTE_NAMES[n % 12] + Math.floor(n / 12 - 1)
}
