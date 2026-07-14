/**
 * WavoEditorPage.tsx — Remote control MIDI del sintetizador WAVO.
 * Protocolo completo basado en midi_handler.h del firmware.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import StarfieldBackground from '../configurator/components/StarfieldBackground'
import WavoScene, { type WavoSceneHandle } from '../wavo-editor/WavoScene'
import {
  type WavoControlId, type EncoderMode,
  ENCODER_LABELS, ENCODER_CC, KEY_NOTES, TECLA_LABELS,
  isEncoder, isKey, isTecla, noteName as noteNameCtrl,
} from '../wavo-editor/wavoControlState'
import {
  makeInitialWavoState, type WavoState,
  CC, CH_SYNTH, CH_MIXER, CH_DRUMS,
  DRUM_NOTES, DRUM_NAMES, DRUM_COLORS, DRUM_TRACK_CCS,
  WAVEFORM_NAMES, WAVEFORM_COLORS, ARP_MODE_NAMES, ARP_DIV_NAMES,
  HARM_ROOTS, HARM_MODES, HARM_VOICINGS, FM_RATIO_NAMES, FM_MOD_NAMES,
  MIXER_CHANNEL_NAMES, MIXER_PARAM_NAMES,
  sendCC, sendNoteOn, sendNoteOff, sendSysEx, sendMixer,
  waveformToCC, fmRatioToCC, fmModWaveToCC, arpModeToCC, arpDivToCC,
  arpOctavesToCC, harmModeToCC, harmVoicesToCC, harmVoicingToCC,
  buildDrumPatternSysEx, buildSeqNotesSysEx, buildSeqFlagsSysEx,
  buildSeqGlobalSysEx, buildSeqSynthSysEx, buildBpmSysEx,
  noteName, isWavoDevice, SX_CMD, TAB_TO_WAVO_MENU,
} from '../wavo-editor/wavoState'

// ── Palette ───────────────────────────────────────────────────────
const P = {
  bg:     '#0A0A0C',
  panel:  'rgba(18,18,22,0.90)',
  border: '#2A2A32',
  cyan:   '#00E5FF',
  pink:   '#FF3366',
  lime:   '#C8FF4D',
  purp:   '#C8A4FF',
  amber:  '#FFB800',
  text:   '#E8E6E0',
  sub:    '#7A7870',
}

// ── Tiny reusable components ──────────────────────────────────────

interface SliderProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
  color?: string
  suffix?: string
  fmt?: (v: number) => string
}
const Slider: React.FC<SliderProps> = ({ label, value, min = 0, max = 127, step = 1, onChange, color = P.cyan, suffix = '', fmt }) => {
  const pct = ((value - min) / (max - min)) * 100
  const display = fmt ? fmt(value) : value + suffix
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.sub }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color }}>{display}</span>
      </div>
      <div style={{ position: 'relative', height: 6, borderRadius: 3, background: '#1E1E24' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: pct + '%', background: color, borderRadius: 3, transition: 'width .05s' }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer', height: '100%', margin: 0 }}
        />
      </div>
    </div>
  )
}

interface BtnGroupProps {
  options: string[]
  value: number
  onChange: (i: number) => void
  colors?: string[]
  small?: boolean
}
const BtnGroup: React.FC<BtnGroupProps> = ({ options, value, onChange, colors, small }) => (
  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
    {options.map((o, i) => {
      const active = i === value
      const col = colors?.[i] ?? P.cyan
      return (
        <button
          key={i} onClick={() => onChange(i)}
          style={{
            padding: small ? '4px 8px' : '6px 12px',
            borderRadius: 7,
            border: `1px solid ${active ? col : P.border}`,
            background: active ? col + '22' : 'transparent',
            color: active ? col : P.sub,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: small ? 10 : 11,
            cursor: 'pointer',
            fontWeight: active ? 700 : 400,
            transition: 'all .12s',
          }}
        >
          {o}
        </button>
      )
    })}
  </div>
)

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: P.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
    {children}
  </div>
)

const Sep: React.FC<{ label?: string }> = ({ label }) => (
  <div style={{ borderTop: '1px solid #1E1E24', margin: '18px 0 14px', paddingTop: 6 }}>
    {label && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: P.sub, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</span>}
  </div>
)

// ── Tab panels ────────────────────────────────────────────────────

const OscPanel: React.FC<{ s: WavoState; set: (p: Partial<WavoState>) => void; out: MIDIOutput | null }> = ({ s, set, out }) => {
  const cc = (c: number, v: number) => out && sendCC(out, c, v)
  return (
    <div>
      <Row label="Waveform">
        <BtnGroup options={WAVEFORM_NAMES} value={s.waveform} colors={WAVEFORM_COLORS}
          onChange={i => { set({ waveform: i }); cc(CC.WAVEFORM, waveformToCC(i)) }} />
      </Row>
      <Slider label="FM Rate" value={s.fmRate} color={WAVEFORM_COLORS[s.waveform]}
        onChange={v => { set({ fmRate: v }); cc(CC.FM_RATE, v) }} />
      <Slider label="Detune" value={s.detune} color={P.amber}
        fmt={v => (v - 64 > 0 ? '+' : '') + (v - 64)}
        onChange={v => { set({ detune: v }); cc(CC.DETUNE, v) }} />
      <Sep label="FM Synthesis" />
      <Row label="FM Ratio">
        <BtnGroup options={FM_RATIO_NAMES} value={s.fmRatioIdx} small
          onChange={i => { set({ fmRatioIdx: i }); cc(CC.FM_RATIO, fmRatioToCC(i)) }} />
      </Row>
      <Row label="Mod Wave">
        <BtnGroup options={FM_MOD_NAMES} value={s.fmModWave} colors={WAVEFORM_COLORS} small
          onChange={i => { set({ fmModWave: i }); cc(CC.FM_MOD_WAVE, fmModWaveToCC(i)) }} />
      </Row>
    </div>
  )
}

const FilterPanel: React.FC<{ s: WavoState; set: (p: Partial<WavoState>) => void; out: MIDIOutput | null }> = ({ s, set, out }) => {
  const cc = (c: number, v: number) => out && sendCC(out, c, v)
  return (
    <div>
      <Slider label="Cutoff" value={s.cutoff} color={P.cyan}
        onChange={v => { set({ cutoff: v }); cc(CC.CUTOFF, v) }} />
      <Slider label="Resonance" value={s.resonance} color={P.purp}
        onChange={v => { set({ resonance: v }); cc(CC.RESONANCE, v) }} />
      <Slider label="EG Amount" value={s.egAmount} color={P.pink}
        onChange={v => { set({ egAmount: v }); cc(CC.EG_AMOUNT, v) }} />
    </div>
  )
}

const AdsrPanel: React.FC<{ s: WavoState; set: (p: Partial<WavoState>) => void; out: MIDIOutput | null }> = ({ s, set, out }) => {
  const cc = (c: number, v: number) => out && sendCC(out, c, v)
  const ms = (v: number) => v < 20 ? Math.round(v * 0.75 + 15) + 'ms' : v < 100 ? Math.round(v * 20) + 'ms' : Math.round(v * 15.7 + 5) + 'ms'
  return (
    <div>
      <Slider label="Attack"  value={s.attack}  color={P.lime}  fmt={ms} onChange={v => { set({ attack: v });  cc(CC.ATTACK, v)  }} />
      <Slider label="Decay"   value={s.decay}   color={P.cyan}  fmt={ms} onChange={v => { set({ decay: v });   cc(CC.DECAY, v)   }} />
      <Slider label="Sustain" value={s.sustain} color={P.purp}
        onChange={v => { set({ sustain: v }); cc(CC.SUSTAIN, v) }} />
      <Slider label="Release" value={s.release} color={P.amber} fmt={ms} onChange={v => { set({ release: v }); cc(CC.RELEASE, v) }} />
    </div>
  )
}

const FxPanel: React.FC<{ s: WavoState; set: (p: Partial<WavoState>) => void; out: MIDIOutput | null }> = ({ s, set, out }) => {
  const cc = (c: number, v: number) => out && sendCC(out, c, v)
  return (
    <div>
      <Slider label="Reverb"        value={s.reverb}       color={P.purp}  onChange={v => { set({ reverb: v });       cc(CC.REVERB, v)      }} />
      <Slider label="Delay Time"    value={s.delayTime}    color={P.cyan}  onChange={v => { set({ delayTime: v });    cc(CC.DELAY_TIME, v)  }} />
      <Slider label="Delay Fdbk"    value={s.delayFeedback} color={P.cyan} onChange={v => { set({ delayFeedback: v});cc(CC.DELAY_FB, v)    }} />
      <Slider label="Chorus"        value={s.chorus}       color={P.lime}  onChange={v => { set({ chorus: v });       cc(CC.CHORUS, v)      }} />
      <Slider label="Overdrive"     value={s.overdrive}    color={P.pink}  onChange={v => { set({ overdrive: v });    cc(CC.OVERDRIVE, v)   }} />
      <Slider label="Bitcrush"      value={s.bitcrush}     max={8}  color={P.amber}
        onChange={v => { set({ bitcrush: v }); cc(CC.BITCRUSH, v) }} />
      <Sep label="Extended FX" />
      <Slider label="Chorus Rate"   value={s.chorusRate}   color={P.lime}  onChange={v => { set({ chorusRate: v });   cc(CC.CHORUS_RATE, v) }} />
      <Slider label="Tremolo"       value={s.tremolo}      color={P.purp}  onChange={v => { set({ tremolo: v });      cc(CC.TREMOLO, v)     }} />
      <Slider label="Tremolo Rate"  value={s.tremoloRate}  color={P.purp}  onChange={v => { set({ tremoloRate: v });  cc(CC.TREMOLO_RATE,v) }} />
      <Slider label="Ring Mod"      value={s.ringMod}      color={P.pink}  onChange={v => { set({ ringMod: v });      cc(CC.RING_MOD, v)    }} />
      <Slider label="Phaser Depth"  value={s.phaserDepth}  color={P.cyan}  onChange={v => { set({ phaserDepth: v });  cc(CC.PHASER_DEPTH,v) }} />
      <Slider label="Phaser Rate"   value={s.phaserRate}   color={P.cyan}  onChange={v => { set({ phaserRate: v });   cc(CC.PHASER_RATE, v) }} />
      <Slider label="Flanger"       value={s.flanger}      color={P.amber} onChange={v => { set({ flanger: v });      cc(CC.FLANGER, v)     }} />
      <Slider label="Compress"      value={s.compress}     color={P.lime}  onChange={v => { set({ compress: v });     cc(CC.COMPRESS, v)    }} />
      <Sep label="EQ" />
      <Slider label="EQ Low"  value={s.eqLow}  color='#FF6B35' fmt={v => (v > 64 ? '+' : v < 64 ? '-' : '0') + Math.abs(v - 64)} onChange={v => { set({ eqLow: v });  cc(CC.EQ_LOW, v) }} />
      <Slider label="EQ Mid"  value={s.eqMid}  color='#FFD700' fmt={v => (v > 64 ? '+' : v < 64 ? '-' : '0') + Math.abs(v - 64)} onChange={v => { set({ eqMid: v });  cc(CC.EQ_MID, v) }} />
      <Slider label="EQ High" value={s.eqHi}   color='#87CEEB' fmt={v => (v > 64 ? '+' : v < 64 ? '-' : '0') + Math.abs(v - 64)} onChange={v => { set({ eqHi: v });   cc(CC.EQ_HI, v)  }} />
    </div>
  )
}

const ArpPanel: React.FC<{ s: WavoState; set: (p: Partial<WavoState>) => void; out: MIDIOutput | null }> = ({ s, set, out }) => {
  const cc = (c: number, v: number) => out && sendCC(out, c, v)
  return (
    <div>
      <Row label="Active">
        <BtnGroup options={['OFF', 'ON']} value={s.arpActive ? 1 : 0} colors={[P.sub, P.lime]}
          onChange={i => { const on = i === 1; set({ arpActive: on }); cc(CC.ARP_ACTIVE, on ? 100 : 0) }} />
      </Row>
      <Row label="Mode">
        <BtnGroup options={ARP_MODE_NAMES} value={s.arpMode}
          onChange={i => { set({ arpMode: i }); cc(CC.ARP_MODE, arpModeToCC(i)) }} />
      </Row>
      <Row label="Division">
        <BtnGroup options={ARP_DIV_NAMES} value={s.arpDiv} colors={[P.cyan, P.cyan, P.cyan, P.cyan]}
          onChange={i => { set({ arpDiv: i }); cc(CC.ARP_DIV, arpDivToCC(i)) }} />
      </Row>
      <Row label="Octaves">
        <BtnGroup options={['1','2','3','4']} value={s.arpOctaves - 1}
          onChange={i => { const o = i + 1; set({ arpOctaves: o }); cc(CC.ARP_OCTAVES, arpOctavesToCC(o)) }} />
      </Row>
    </div>
  )
}

const HarmPanel: React.FC<{ s: WavoState; set: (p: Partial<WavoState>) => void; out: MIDIOutput | null }> = ({ s, set, out }) => {
  const cc = (c: number, v: number) => out && sendCC(out, c, v)
  return (
    <div>
      <Row label="Root">
        <BtnGroup options={HARM_ROOTS} value={s.harmRoot} small colors={Array(12).fill(P.lime)}
          onChange={i => { set({ harmRoot: i }); cc(CC.HARM_ROOT, i) }} />
      </Row>
      <Row label="Mode">
        <BtnGroup options={HARM_MODES} value={s.harmMode} small
          onChange={i => { set({ harmMode: i }); cc(CC.HARM_MODE, harmModeToCC(i)) }} />
      </Row>
      <Row label="Voices">
        <BtnGroup options={['1','2','3','4']} value={s.harmVoices - 1} colors={Array(4).fill(P.purp)}
          onChange={i => { const v = i + 1; set({ harmVoices: v }); cc(CC.HARM_VOICES, harmVoicesToCC(v)) }} />
      </Row>
      <Row label="Voicing">
        <BtnGroup options={HARM_VOICINGS} value={s.harmVoicing} small
          onChange={i => { set({ harmVoicing: i }); cc(CC.HARM_VOICING, harmVoicingToCC(i)) }} />
      </Row>
      <Slider label="Octave" value={s.harmOctave} fmt={v => {
        const o = Math.round((v - 64) * 2 / 127) - 0 + ' → C' + (Math.floor(v / 25) + 1)
        return 'C' + (Math.floor(v / 25) + 1)
      }}
        onChange={v => { set({ harmOctave: v }); cc(CC.OCTAVE, v) }} color={P.amber} />
    </div>
  )
}

// ── SEQ Panel ─────────────────────────────────────────────────────

const NOTE_NAMES_SHORT = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

const SeqPanel: React.FC<{ s: WavoState; set: (p: Partial<WavoState>) => void; out: MIDIOutput | null; playing: boolean }> = ({ s, set, out, playing }) => {
  const [editStep, setEditStep] = useState<number | null>(null)
  const [flagMode, setFlagMode] = useState<'accent'|'tie'|'slide'>('accent')
  const [page, setPage] = useState<'steps'|'synth'>('steps')

  const sendSeq = useCallback((patch: Partial<WavoState> = {}) => {
    if (!out) return
    const ns = { ...s, ...patch }
    sendSysEx(out, SX_CMD.SEQ_NOTES, buildSeqNotesSysEx(ns.seqStepLength, ns.seqActive, ns.seqNotes))
    sendSysEx(out, SX_CMD.SEQ_FLAGS, buildSeqFlagsSysEx(ns.seqAccent, ns.seqTie, ns.seqSlide))
    sendSysEx(out, SX_CMD.SEQ_GLOBAL, buildSeqGlobalSysEx(ns.seqGateTime, ns.seqPingPong))
  }, [out, s])

  const sendSynth = useCallback((patch: Partial<WavoState> = {}) => {
    if (!out) return
    sendSysEx(out, SX_CMD.SEQ_SYNTH, buildSeqSynthSysEx({ ...s, ...patch }))
  }, [out, s])

  const toggleStep = (i: number) => {
    const next = [...s.seqActive]; next[i] = !next[i]
    const patch = { seqActive: next }
    set(patch); sendSeq(patch)
    if (next[i]) setEditStep(i)
    else if (editStep === i) setEditStep(null)
  }

  const setNote = (i: number, n: number) => {
    const next = [...s.seqNotes]; next[i] = n
    const patch = { seqNotes: next }
    set(patch); sendSeq(patch)
  }

  const toggleFlag = (i: number) => {
    let patch: Partial<WavoState>
    if (flagMode === 'accent')  { const a=[...s.seqAccent]; a[i]=!a[i]; patch={seqAccent:a} }
    else if (flagMode === 'tie')   { const a=[...s.seqTie]; a[i]=!a[i]; patch={seqTie:a} }
    else                           { const a=[...s.seqSlide]; a[i]=!a[i]; patch={seqSlide:a} }
    set(patch); sendSeq(patch)
  }

  const octave = editStep !== null ? Math.floor(s.seqNotes[editStep] / 12) - 1 : 4

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['steps','synth'] as const).map(p => (
          <button key={p} onClick={() => setPage(p)}
            style={{ padding: '5px 14px', borderRadius: 7, border: `1px solid ${page===p?P.cyan:P.border}`, background: page===p?P.cyan+'22':'transparent', color: page===p?P.cyan:P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:11, cursor:'pointer' }}>
            {p === 'steps' ? 'Steps' : 'Synth 303'}
          </button>
        ))}
        <button onClick={() => {
          const patch = { seqActive: Array(16).fill(false) as boolean[] }
          set(patch); sendSeq(patch)
        }}
          style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: 'transparent', color: P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:10, cursor:'pointer' }}>
          CLR
        </button>
      </div>

      {page === 'steps' && (
        <>
          {/* Step length */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color: P.sub }}>STEPS</span>
            {[4,8,12,16].map(n => (
              <button key={n} onClick={() => { const patch={seqStepLength:n}; set(patch); sendSeq(patch) }}
                style={{ padding:'3px 8px', borderRadius:5, border:`1px solid ${s.seqStepLength===n?P.lime:P.border}`, background:s.seqStepLength===n?P.lime+'22':'transparent', color:s.seqStepLength===n?P.lime:P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:10, cursor:'pointer' }}>
                {n}
              </button>
            ))}
            <label style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, fontFamily:'JetBrains Mono,monospace', fontSize:10, color:P.sub, cursor:'pointer' }}>
              <input type="checkbox" checked={s.seqPingPong} onChange={e => { const patch={seqPingPong:e.target.checked}; set(patch); sendSeq(patch) }} />
              PING
            </label>
          </div>

          {/* 16-step grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 5, marginBottom: 10 }}>
            {Array.from({ length: 16 }, (_, i) => {
              const active = s.seqActive[i]
              const accent = s.seqAccent[i]
              const over = i >= s.seqStepLength
              const col = active ? (accent ? P.amber : P.lime) : (over ? '#1A1A20' : P.border)
              return (
                <button key={i} onClick={() => toggleStep(i)} onContextMenu={e => { e.preventDefault(); if (active) setEditStep(editStep===i?null:i) }}
                  style={{ aspectRatio:'1', borderRadius:7, border:`1px solid ${editStep===i?P.cyan:col}`, background:active?col+'33':'transparent', color: active ? col : P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:9, cursor:'pointer', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:1, opacity: over?0.35:1 }}>
                  <span style={{ fontSize:8, fontWeight:700 }}>{i+1}</span>
                  {active && <span style={{ fontSize:7, color: P.sub }}>{noteName(s.seqNotes[i])}</span>}
                </button>
              )
            })}
          </div>

          {/* Note editor */}
          {editStep !== null && s.seqActive[editStep] && (
            <div style={{ background: '#131318', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:P.cyan }}>
                  Step {editStep + 1} — {noteName(s.seqNotes[editStep])}
                </span>
                <div style={{ display:'flex', gap:4 }}>
                  {[-12,-1,1,12].map(d => (
                    <button key={d} onClick={() => setNote(editStep, Math.max(0, Math.min(127, s.seqNotes[editStep] + d)))}
                      style={{ padding:'2px 6px', borderRadius:5, border:`1px solid ${P.border}`, background:'transparent', color:P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:10, cursor:'pointer' }}>
                      {d > 0 ? '+' : ''}{d}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', gap:3 }}>
                {NOTE_NAMES_SHORT.map((name, semi) => {
                  const note = octave * 12 + 12 + semi
                  const sharp = name.includes('#')
                  const active = s.seqNotes[editStep] === note
                  return (
                    <button key={semi} onClick={() => setNote(editStep, note)}
                      style={{ padding:'6px 0', borderRadius:5, border:`1px solid ${active?P.lime:P.border}`, background:active?P.lime+'33':(sharp?'#0F0F14':'#1A1A22'), color:active?P.lime:(sharp?P.sub:P.text), fontFamily:'JetBrains Mono,monospace', fontSize:9, cursor:'pointer', textAlign:'center' }}>
                      {name}
                    </button>
                  )
                })}
              </div>
              <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:8 }}>
                {[-2,-1,0,1,2].map(o => (
                  <button key={o} onClick={() => { const cur=s.seqNotes[editStep]%12; setNote(editStep,(o+5)*12+cur) }}
                    style={{ padding:'3px 8px', borderRadius:5, border:`1px solid ${Math.floor(s.seqNotes[editStep]/12)-1===o+4?P.amber:P.border}`, background:'transparent', color:P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:10, cursor:'pointer' }}>
                    C{o+4}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Flags */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:P.sub }}>FLAGS</span>
            {(['accent','tie','slide'] as const).map(f => (
              <button key={f} onClick={() => setFlagMode(f)}
                style={{ padding:'3px 8px', borderRadius:5, border:`1px solid ${flagMode===f?P.amber:P.border}`, background:flagMode===f?P.amber+'22':'transparent', color:flagMode===f?P.amber:P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:10, cursor:'pointer' }}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:5 }}>
            {Array.from({ length: 16 }, (_, i) => {
              const val = flagMode==='accent'?s.seqAccent[i]:flagMode==='tie'?s.seqTie[i]:s.seqSlide[i]
              return (
                <button key={i} onClick={() => toggleFlag(i)}
                  style={{ aspectRatio:'1', borderRadius:5, border:`1px solid ${val?P.amber:P.border}`, background:val?P.amber+'33':'transparent', cursor:'pointer', opacity:i>=s.seqStepLength?0.35:1 }} />
              )
            })}
          </div>

          <Sep />
          <Slider label="Gate Time" value={s.seqGateTime} min={0} max={100} color={P.lime} suffix="%"
            onChange={v => { const p={seqGateTime:v}; set(p); sendSeq(p) }} />
        </>
      )}

      {page === 'synth' && (
        <>
          <Row label="303 Waveform">
            <BtnGroup options={['SAW','SQR']} value={s.seqWave} colors={[P.pink, P.cyan]}
              onChange={i => { const p={seqWave:i}; set(p); sendSynth(p) }} />
          </Row>
          <Slider label="Cutoff"    value={s.seqCutoff}  color={P.cyan} onChange={v=>{const p={seqCutoff:v};set(p);sendSynth(p)}} />
          <Slider label="Resonance" value={s.seqRes}     color={P.purp} onChange={v=>{const p={seqRes:v};set(p);sendSynth(p)}} />
          <Slider label="Decay"     value={s.seqDecay}   color={P.amber} onChange={v=>{const p={seqDecay:v};set(p);sendSynth(p)}} />
          <Slider label="Volume"    value={s.seqVol}     color={P.lime} onChange={v=>{const p={seqVol:v};set(p);sendSynth(p)}} />
          <Sep label="303 Filter Envelope" />
          <Slider label="Env Amount" value={s.seq303Env} color={P.cyan} onChange={v=>{const p={seq303Env:v};set(p);sendSynth(p)}} />
          <Slider label="Env Decay"  value={s.seq303Dec} color={P.pink} onChange={v=>{const p={seq303Dec:v};set(p);sendSynth(p)}} />
          <Slider label="Drive"      value={s.seq303Drive} color={P.amber} onChange={v=>{const p={seq303Drive:v};set(p);sendSynth(p)}} />
        </>
      )}
    </div>
  )
}

// ── DRUMS Panel ───────────────────────────────────────────────────

const DrumPanel: React.FC<{ s: WavoState; set: (p: Partial<WavoState>) => void; out: MIDIOutput | null }> = ({ s, set, out }) => {
  const [track, setTrack] = useState(0)

  const sendPattern = useCallback((t: number, pat: boolean[]) => {
    if (!out) return
    sendSysEx(out, SX_CMD.DRUM_PATTERN, buildDrumPatternSysEx(t, pat))
  }, [out])

  const toggleStep = (step: number) => {
    const next = s.drumPatterns.map(p => [...p])
    next[track][step] = !next[track][step]
    set({ drumPatterns: next })
    sendPattern(track, next[track])
  }

  const triggerDrum = (t: number) => {
    if (!out) return
    sendNoteOn(out, DRUM_NOTES[t], 100, CH_DRUMS)
    setTimeout(() => sendNoteOff(out, DRUM_NOTES[t], CH_DRUMS), 100)
  }

  const hasPunch = DRUM_TRACK_CCS[track][2] !== -1
  const hasDrive = DRUM_TRACK_CCS[track][3] !== -1

  return (
    <div>
      {/* Track selector */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5, marginBottom:14 }}>
        {DRUM_NAMES.map((name, t) => {
          const hasSteps = s.drumPatterns[t].some(Boolean)
          const col = DRUM_COLORS[t]
          return (
            <button key={t} onClick={() => setTrack(t)} onDoubleClick={() => triggerDrum(t)}
              style={{ padding:'8px 4px', borderRadius:8, border:`1px solid ${track===t?col:P.border}`, background:track===t?col+'22':'transparent', color:track===t?col:P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:11, cursor:'pointer', position:'relative' }}>
              {name}
              {hasSteps && <span style={{ position:'absolute', top:4, right:4, width:5, height:5, borderRadius:'50%', background:col, opacity:0.7 }} />}
            </button>
          )
        })}
      </div>

      {/* Step grid */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:DRUM_COLORS[track] }}>{DRUM_NAMES[track]}</span>
        <button onClick={() => triggerDrum(track)}
          style={{ marginLeft:'auto', padding:'3px 10px', borderRadius:5, border:`1px solid ${DRUM_COLORS[track]}`, background:DRUM_COLORS[track]+'22', color:DRUM_COLORS[track], fontFamily:'JetBrains Mono,monospace', fontSize:10, cursor:'pointer' }}>
          ▶ TAP
        </button>
        <button onClick={() => { const next=s.drumPatterns.map((p,t2)=>t2===track?Array(16).fill(false):p); set({drumPatterns:next}); sendPattern(track,next[track]) }}
          style={{ padding:'3px 10px', borderRadius:5, border:`1px solid ${P.border}`, background:'transparent', color:P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:10, cursor:'pointer' }}>
          CLR
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:5, marginBottom:14 }}>
        {Array.from({ length: 16 }, (_, i) => {
          const on = s.drumPatterns[track][i]
          const beat = i % 4 === 0
          const col = DRUM_COLORS[track]
          return (
            <button key={i} onClick={() => toggleStep(i)}
              style={{ aspectRatio:'1', borderRadius:7, border:`2px solid ${on?col:(beat?'#2A2A38':P.border)}`, background:on?col+'44':'transparent', cursor:'pointer' }} />
          )
        })}
      </div>

      {/* Track params */}
      <Slider label="Pitch / Tune" value={s.drumPitch[track]} color={DRUM_COLORS[track]}
        onChange={v => {
          const next=[...s.drumPitch]; next[track]=v; set({drumPitch:next})
          const pitchCC = DRUM_TRACK_CCS[track][0]
          if (out && pitchCC >= 0) sendCC(out, pitchCC, v, CH_DRUMS)
        }} />
      <Slider label="Decay" value={s.drumDecay[track]} color={P.sub}
        onChange={v => {
          const next=[...s.drumDecay]; next[track]=v; set({drumDecay:next})
          const decCC = DRUM_TRACK_CCS[track][1]
          if (out && decCC >= 0) sendCC(out, decCC, v, CH_DRUMS)
        }} />
      {hasPunch && (
        <Slider label={track===0?'Punch':'Snap'} value={s.drumPunch[track]} color={P.amber}
          onChange={v => {
            const next=[...s.drumPunch]; next[track]=v; set({drumPunch:next})
            const pCC = DRUM_TRACK_CCS[track][2]
            if (out && pCC >= 0) sendCC(out, pCC, v, CH_DRUMS)
          }} />
      )}
      {hasDrive && (
        <Slider label="Drive" value={s.drumDrive[track]} color={P.pink}
          onChange={v => {
            const next=[...s.drumDrive]; next[track]=v; set({drumDrive:next})
            const dCC = DRUM_TRACK_CCS[track][3]
            if (out && dCC >= 0) sendCC(out, dCC, v, CH_DRUMS)
          }} />
      )}
      <Slider label="Drum Volume" value={s.drumVolume} color={P.sub}
        onChange={v => { set({ drumVolume: v }); if (out) sendCC(out, 7, v, CH_DRUMS) }} />
    </div>
  )
}

// ── MIXER Panel ───────────────────────────────────────────────────

const MixerPanel: React.FC<{ s: WavoState; set: (p: Partial<WavoState>) => void; out: MIDIOutput | null }> = ({ s, set, out }) => {
  const upd = (ch: number, param: number, v: number) => {
    const next = s.mixer.map((c, i) => i === ch ? { ...c, [MIXER_PARAM_NAMES[param].toLowerCase()]: v } : c)
    set({ mixer: next })
    if (out) sendMixer(out, ch, param, v)
  }
  const chColors = [P.pink, P.lime, P.purp, P.amber, P.cyan, P.text]
  const paramColors = [P.lime, P.cyan, P.purp, P.cyan, P.purp, P.amber]

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display:'grid', gridTemplateColumns:'80px repeat(6,1fr)', gap:6, minWidth:480 }}>
        <div />
        {MIXER_CHANNEL_NAMES.map((name, ch) => (
          <div key={ch} style={{ textAlign:'center', fontFamily:'JetBrains Mono,monospace', fontSize:10, color:chColors[ch], paddingBottom:6 }}>{name}</div>
        ))}
        {MIXER_PARAM_NAMES.map((param, p) => (
          <React.Fragment key={p}>
            <div style={{ display:'flex', alignItems:'center', fontFamily:'JetBrains Mono,monospace', fontSize:10, color:paramColors[p] }}>{param}</div>
            {s.mixer.map((ch, c) => {
              const val: number = (ch as any)[param.toLowerCase()] ?? 64
              const pct = (val / 127) * 100
              return (
                <div key={c} style={{ display:'flex', flexDirection:'column', gap:3, alignItems:'center' }}>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:9, color:chColors[c] }}>{val}</div>
                  <div style={{ position:'relative', height:4, borderRadius:2, background:'#1E1E24', width:'100%' }}>
                    <div style={{ position:'absolute', left:0, top:0, height:'100%', width:pct+'%', background:chColors[c], borderRadius:2 }} />
                    <input type="range" min={0} max={127} value={val} onChange={e => upd(c, p, Number(e.target.value))}
                      style={{ position:'absolute', inset:0, opacity:0, width:'100%', cursor:'pointer', height:'100%', margin:0 }} />
                  </div>
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ── Tab definitions ───────────────────────────────────────────────

const TABS = [
  { id: 'osc',    label: 'OSC',    color: P.pink  },
  { id: 'filter', label: 'FILTER', color: P.cyan  },
  { id: 'adsr',   label: 'ADSR',   color: P.lime  },
  { id: 'fx',     label: 'FX',     color: P.purp  },
  { id: 'arp',    label: 'ARP',    color: P.lime  },
  { id: 'seq',    label: 'SEQ',    color: P.amber },
  { id: 'drums',  label: 'DRUMS',  color: P.amber },
  { id: 'mixer',  label: 'MIXER',  color: P.cyan  },
  { id: 'harm',   label: 'HARM',   color: P.purp  },
] as const
type TabId = typeof TABS[number]['id']

// ── Main page ─────────────────────────────────────────────────────

const WavoEditorPage: React.FC<{
  embedded?: boolean
  embeddedTitle?: string
  embeddedTint?: string
  sceneSlot?: HTMLElement | null
  panelSlot?: HTMLElement | null
  active?: boolean
  onActivate?: () => void
}> = ({ embedded, embeddedTitle, embeddedTint, sceneSlot, panelSlot, active, onActivate }) => {
  const portalMode = typeof onActivate === 'function'
  const [state, setState] = useState(makeInitialWavoState)
  const [tab, setTab] = useState<TabId>('osc')
  const [selectedCtrl, setSelectedCtrl] = useState<WavoControlId | null>(null)
  const wavoSceneRef = useRef<WavoSceneHandle>(null)

  const switchTab = useCallback((newTab: TabId) => {
    setTab(newTab)
    const menuIdx = TAB_TO_WAVO_MENU[newTab]
    if (menuIdx !== undefined && midiOutputRef.current) {
      sendSysEx(midiOutputRef.current, SX_CMD.SET_MENU, [menuIdx])
    }
  }, [])
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  const set = useCallback((patch: Partial<WavoState>) => {
    setState(prev => ({ ...prev, ...patch }))
  }, [])

  // MIDI
  const midiAccessRef = useRef<MIDIAccess | null>(null)
  const midiOutputRef = useRef<MIDIOutput | null>(null)
  const midiInputRef  = useRef<MIDIInput | null>(null)
  const [connected, setConnected] = useState(false)
  const [statusText, setStatusText] = useState('Buscando MIDI...')
  const [outputList, setOutputList] = useState<{ name: string; idx: number }[]>([])
  const [selOut, setSelOut] = useState<number | null>(null)

  // Log
  const [logOpen, setLogOpen] = useState(false)
  const [logLines, setLogLines] = useState<string[]>(['// Web MIDI — esperando...'])
  const logRef = useRef<HTMLDivElement>(null)
  const log = useCallback((t: string) => setLogLines(p => [...p.slice(-59), t]), [])
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [logLines])

  const handleMidiMsg = useCallback((e: Event) => {
    const msg = e as MIDIMessageEvent
    if (!msg.data || msg.data.length < 2) return
    const status = msg.data[0], data1 = msg.data[1], data2 = msg.data[2] ?? 0
    const msgType = status & 0xF0
    const channel = status & 0x0F

    log(`IN ch${channel+1} ${msgType === 0x90 ? 'NOTE' : msgType === 0xB0 ? 'CC' : msgType === 0x80 ? 'OFF' : '?'} ${data1}=${data2}`)

    // NoteOn del hardware → anima y selecciona tecla en el modelo 3D
    // Firmware: nota = 60 + keyIdx + currentOctave*12 — usamos % 12 para cualquier octava
    // Acepta cualquier canal excepto drums (ch9=canal 10)
    if (msgType === 0x90 && data2 > 0 && channel !== 9) {
      const keyIdx = data1 % 12  // 0-11 → key1-key12
      const keyId = `key${keyIdx + 1}` as WavoControlId
      setSelectedCtrl(keyId)
      wavoSceneRef.current?.pressControl(keyId)
    }

    // NoteOff → suelta la animación (cualquier canal excepto drums)
    if ((msgType === 0x80 || (msgType === 0x90 && data2 === 0)) && channel !== 9) {
      const keyIdx = data1 % 12
      wavoSceneRef.current?.releaseControl(`key${keyIdx + 1}` as WavoControlId)
    }

    // CC del hardware → actualiza sliders en el editor (canal synth = wire 0)
    if (msgType === 0xB0 && channel === 0) {
      const cc = data1, val = data2

      // Encoder turns (CC 20-23 = enc1-4, incremental: 1-63 CW, 65-127 CCW)
      if (cc >= 20 && cc <= 23) {
        const encId = `enc${cc - 19}` as WavoControlId
        setSelectedCtrl(encId)
        wavoSceneRef.current?.rotateEncoder(encId, val)
        return
      }

      // Encoder button presses (CC 24-27 = enc1-4 en ch1)
      if (cc >= 24 && cc <= 27) {
        if (val >= 64) {
          const encId = `enc${cc - 23}` as WavoControlId
          setSelectedCtrl(encId)
          wavoSceneRef.current?.pressControl(encId)
        } else {
          wavoSceneRef.current?.releaseControl(`enc${cc - 23}` as WavoControlId)
        }
        return
      }

      if      (cc === CC.CUTOFF)     set({ cutoff: val })
      else if (cc === CC.RESONANCE)  set({ resonance: val })
      else if (cc === CC.EG_AMOUNT)  set({ egAmount: val })
      else if (cc === CC.ATTACK)     set({ attack: val })
      else if (cc === CC.DECAY)      set({ decay: val })
      else if (cc === CC.SUSTAIN)    set({ sustain: val })
      else if (cc === CC.RELEASE)    set({ release: val })
      else if (cc === CC.REVERB)     set({ reverb: val })
      else if (cc === CC.DELAY_FB)   set({ delayFeedback: val })
      else if (cc === CC.DELAY_TIME) set({ delayTime: val })
      else if (cc === CC.CHORUS)     set({ chorus: val })
      else if (cc === CC.OVERDRIVE)  set({ overdrive: val })
      else if (cc === CC.MASTER_VOL) set({ masterVolume: val })
      else if (cc === CC.FM_RATE)    set({ fmRate: val })
      else if (cc === CC.DETUNE)     set({ detune: val })
      else if (cc === CC.WAVEFORM)   set({ waveform: val >> 5 })
      else if (cc === CC.ARP_ACTIVE) set({ arpActive: val >= 64 })
      else if (cc === CC.ARP_MODE)   set({ arpMode: val >> 5 })
      else if (cc === CC.ARP_DIV)    set({ arpDiv: val >> 5 })
      else if (cc === CC.BPM)        set({ bpm: 40 + Math.round(val * 170 / 127) })
    }
  }, [set, log])

  const setupPorts = useCallback((access: MIDIAccess) => {
    // OUTPUTS — mostrar TODOS los dispositivos
    const allOuts = Array.from(access.outputs.values())
    setOutputList(allOuts.map((o, i) => ({ name: o.name, idx: i })))
    log(`Salidas MIDI (${allOuts.length}): ${allOuts.map(o => o.name).join(', ') || 'ninguna'}`)

    const wavoOut = allOuts.find(o => isWavoDevice(o.name)) ?? (allOuts.length === 1 ? allOuts[0] : null)
    if (wavoOut && !midiOutputRef.current) {
      midiOutputRef.current = wavoOut
      setSelOut(allOuts.indexOf(wavoOut))
      setConnected(true)
      setStatusText('Conectado: ' + wavoOut.name)
      log('✓ OUT conectado: ' + wavoOut.name)
    } else if (allOuts.length === 0) {
      midiOutputRef.current = null; setConnected(false)
      setStatusText('Sin dispositivos MIDI')
      log('✗ Sin dispositivos MIDI detectados')
    } else if (!wavoOut && !midiOutputRef.current) {
      setStatusText('Selecciona salida MIDI ↑')
      log(`Dispositivos encontrados — selecciona el WAVO del menú`)
    }

    // INPUTS — escuchar WAVO o primer dispositivo disponible
    const allIns = Array.from(access.inputs.values())
    log(`Entradas MIDI (${allIns.length}): ${allIns.map(o => o.name).join(', ') || 'ninguna'}`)
    const wavoIn = allIns.find(o => isWavoDevice(o.name)) ?? allIns[0] ?? null
    if (midiInputRef.current) midiInputRef.current.onmidimessage = null
    midiInputRef.current = wavoIn
    if (wavoIn) {
      wavoIn.onmidimessage = handleMidiMsg
      log('✓ WAVO IN escuchando: ' + wavoIn.name)
    } else {
      log('✗ Sin entrada MIDI — el hardware no puede controlar el editor')
    }
  }, [log, handleMidiMsg])

  useEffect(() => {
    const nav = navigator as any
    if (!nav.requestMIDIAccess) { setStatusText('Web MIDI no disponible (usa Chrome/Edge)'); return }
    nav.requestMIDIAccess({ sysex: true }).then((access: MIDIAccess) => {
      midiAccessRef.current = access; setupPorts(access)
      access.addEventListener('statechange', () => setupPorts(access))
    }).catch((e: Error) => { setStatusText('Error MIDI: ' + e.message); log('Error: ' + e.message) })
  }, [setupPorts])

  const handleOutChange = (idx: number | null) => {
    setSelOut(idx)
    if (idx === null) { midiOutputRef.current = null; setConnected(false); return }
    const access = midiAccessRef.current; if (!access) return
    const outs = Array.from(access.outputs.values())  // TODOS los outputs
    midiOutputRef.current = outs[idx] || null
    setConnected(!!midiOutputRef.current)
    if (midiOutputRef.current) setStatusText('Conectado: ' + midiOutputRef.current.name)
    log('Salida MIDI: ' + (midiOutputRef.current?.name ?? 'ninguna'))
  }

  const out = midiOutputRef.current

  // Transport
  const sendTransport = (play: boolean) => {
    if (!out) return
    sendSysEx(out, SX_CMD.TRANSPORT, [play ? 0x01 : 0x00])
    set({ playing: play }); log(play ? '▶ Play' : '■ Stop')
  }

  const sendBPM = (bpm: number) => {
    if (!out) return
    sendSysEx(out, SX_CMD.BPM, buildBpmSysEx(bpm))
    log('BPM: ' + bpm)
  }

  const sendSwing = (swing: number) => {
    if (!out) return
    sendSysEx(out, SX_CMD.SWING, [Math.max(0, Math.min(100, swing))])
  }

  // Selección de control → además activa este dispositivo en el ecosistema.
  const selectCtrl = (id: WavoControlId) => { setSelectedCtrl(id); onActivate?.() }

  // Franja compacta de transport para el modo ecosistema (header va oculto).
  const wavoTransportStrip = (
    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', padding:'10px 14px', borderBottom:`1px solid ${P.border}`, background:'rgba(10,10,12,0.6)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, fontFamily:'JetBrains Mono,monospace', fontSize:11, color:P.sub }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:connected?P.lime:P.pink }} />
        <span style={{ maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{statusText}</span>
      </div>
      <button onClick={() => sendTransport(!state.playing)}
        style={{ padding:'6px 12px', borderRadius:7, border:`1px solid ${state.playing?P.pink:P.border}`, background:state.playing?P.pink+'22':'transparent', color:state.playing?P.pink:P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:11, cursor:'pointer', fontWeight:700 }}>
        {state.playing ? '■ STOP' : '▶ PLAY'}
      </button>
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:P.sub }}>BPM</span>
        <input type="number" min={40} max={250} value={state.bpm}
          onChange={e => { const v=Math.max(40,Math.min(250,Number(e.target.value))); set({bpm:v}); sendBPM(v) }}
          style={{ width:48, background:'#1A1A22', border:`1px solid ${P.border}`, borderRadius:6, color:P.text, fontFamily:'JetBrains Mono,monospace', fontSize:12, padding:'4px 6px', textAlign:'center' }} />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:P.sub }}>VOL</span>
        <input type="range" min={0} max={127} value={state.masterVolume}
          onChange={e => { const v=Number(e.target.value); set({masterVolume:v}); if(out) sendCC(out,CC.MASTER_VOL,v) }}
          style={{ width:64 }} />
      </div>
      <button onClick={() => setLogOpen(v=>!v)}
        style={{ marginLeft:'auto', padding:'6px 10px', borderRadius:7, border:`1px solid ${logOpen?P.cyan:P.border}`, background:logOpen?P.cyan+'22':'transparent', color:logOpen?P.cyan:P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:11, cursor:'pointer' }}>
        ▶ LOG
      </button>
    </div>
  )

  return (
    <div style={{ ...(portalMode ? { display:'none' } : embedded ? { position:'relative', width:'100%', height:'100%', display:'grid' } : { position:'fixed', inset:0, display:'grid' }), color:P.text, fontFamily:'Inter, sans-serif', gridTemplateRows:'auto 1fr', background:P.bg, minHeight:0 }}>
      {!embedded && <StarfieldBackground />}

      {/* Header — franja compacta cuando va embebido en el ecosistema */}
      <header style={{ display:'flex', alignItems:'center', gap:embedded?10:12, padding:embedded?'8px 14px':'12px 20px', borderBottom:`1px solid ${P.border}`, background:'rgba(10,10,12,0.85)', backdropFilter:'blur(14px)', position:'relative', zIndex:1, flexWrap:'wrap' }}>
        {!embedded && <Link to="/" style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:P.sub, textDecoration:'none', border:`1px solid ${P.border}`, padding:'5px 10px', borderRadius:7 }}>← Volver</Link>}

        {!embedded && (
          <div>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, letterSpacing:'0.2em', color:P.sub, textTransform:'uppercase' }}>Creart Studio — Synth Editor</div>
            <h1 style={{ fontSize:20, fontWeight:600, margin:'1px 0 0', letterSpacing:'0.05em' }}>WAVO</h1>
          </div>
        )}

        {/* Identidad del equipo dentro del ecosistema */}
        {embedded && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:4, flexShrink:0 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:embeddedTint||'#B07CFF', boxShadow:`0 0 8px ${embeddedTint||'#B07CFF'}` }} />
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, letterSpacing:'0.14em', textTransform:'uppercase', fontWeight:600 }}>
              {embeddedTitle||'WAVO'}
            </span>
          </div>
        )}

        {/* Transport */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:12 }}>
          <button onClick={() => sendTransport(!state.playing)}
            style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${state.playing?P.pink:P.border}`, background:state.playing?P.pink+'22':'transparent', color:state.playing?P.pink:P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:12, cursor:'pointer', fontWeight:700 }}>
            {state.playing ? '■ STOP' : '▶ PLAY'}
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:P.sub }}>BPM</span>
            <input type="number" min={40} max={250} value={state.bpm}
              onChange={e => { const v=Math.max(40,Math.min(250,Number(e.target.value))); set({bpm:v}); sendBPM(v) }}
              style={{ width:50, background:'#1A1A22', border:`1px solid ${P.border}`, borderRadius:6, color:P.text, fontFamily:'JetBrains Mono,monospace', fontSize:13, padding:'4px 6px', textAlign:'center' }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:P.sub }}>SWG</span>
            <input type="range" min={0} max={100} value={state.swing}
              onChange={e => { const v=Number(e.target.value); set({swing:v}); sendSwing(v) }}
              style={{ width:60 }} />
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:P.sub, minWidth:26 }}>{state.swing}%</span>
          </div>
        </div>

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          {/* MIDI status */}
          <div style={{ display:'flex', alignItems:'center', gap:7, fontFamily:'JetBrains Mono,monospace', fontSize:11, color:P.sub }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:connected?P.lime:P.pink, display:'inline-block' }} />
            <span style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{statusText}</span>
          </div>
          <select value={selOut ?? ''} onChange={e => handleOutChange(e.target.value===''?null:Number(e.target.value))}
            style={{ background:'#1A1A22', color:P.text, border:`1px solid ${P.border}`, borderRadius:6, padding:'5px 8px', fontFamily:'JetBrains Mono,monospace', fontSize:11 }}>
            <option value="">{outputList.length === 0 ? 'Sin dispositivos MIDI' : 'Sin salida'}</option>
            {outputList.map(o => <option key={o.idx} value={o.idx}>{o.name}</option>)}
          </select>
          <button onClick={() => setLogOpen(v=>!v)}
            style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${logOpen?P.cyan:P.border}`, background:logOpen?P.cyan+'22':'transparent', color:logOpen?P.cyan:P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:11, cursor:'pointer' }}>
            ▶ LOG
          </button>
          {/* Master vol */}
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:P.sub }}>VOL</span>
            <input type="range" min={0} max={127} value={state.masterVolume}
              onChange={e => { const v=Number(e.target.value); set({masterVolume:v}); if(out) sendCC(out,CC.MASTER_VOL,v) }}
              style={{ width:70 }} />
          </div>
        </div>
      </header>

      {/* Log flotante — en modo ecosistema (raíz display:none) se porta al body */}
      {logOpen && (!portalMode || active) && (() => {
        const logFloat = (
          <div style={{ position:'fixed', bottom:20, right:20, width:300, maxHeight:240, background:'#14141A', border:`1px solid ${P.border}`, borderRadius:12, display:'flex', flexDirection:'column', zIndex:300, boxShadow:'0 8px 32px rgba(0,0,0,.7)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', borderBottom:`1px solid ${P.border}`, fontFamily:'JetBrains Mono,monospace', fontSize:10, color:P.sub }}>
              <span>MIDI Log · WAVO</span>
              <button onClick={()=>setLogOpen(false)} style={{ background:'none', border:'none', color:P.sub, cursor:'pointer', fontSize:14 }}>×</button>
            </div>
            <div ref={logRef} style={{ padding:'8px 12px', fontFamily:'JetBrains Mono,monospace', fontSize:10, color:P.sub, overflowY:'auto', flex:1 }}>
              {logLines.map((l,i)=><p key={i} style={{margin:'1px 0'}}>{l}</p>)}
            </div>
          </div>
        )
        return portalMode ? createPortal(logFloat, document.body) : logFloat
      })()}

      {/* Body — mismo layout que Beato16: escena 3D izquierda, panel derecha */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:18, padding:18, minHeight:0, flex:1, position:'relative', zIndex:1 }}>

        {/* Left: 3D scene — al ecosistema vía portal, o inline normal */}
        {portalMode && sceneSlot
          ? createPortal(
              <div onPointerDownCapture={onActivate} style={{ flex:'1 1 0', minWidth:0, height:'100%', position:'relative', background:'transparent' }}>
                {/* La identificación del dispositivo la pinta el EcosystemDock
                    (placa bajo el modelo) — aquí solo va la escena 3D */}
                <div style={{ width:'100%', height:'100%' }}>
                  <WavoScene ref={wavoSceneRef} selectedId={selectedCtrl} onSelect={selectCtrl} />
                </div>
              </div>, sceneSlot)
          : (
            <div style={{ border:`1px solid rgba(229,36,33,0.2)`, borderRadius:14, overflow:'hidden', background:'transparent' }}>
              <WavoScene ref={wavoSceneRef} selectedId={selectedCtrl} onSelect={selectCtrl} />
            </div>
          )}

        {/* Right: panel de configuración (al ecosistema vía portal) */}
        {(() => {
          const panelCard = (
        <div style={{ display:'flex', flexDirection:'column', gap:0, background:P.panel, border:`1px solid ${P.border}`, borderRadius:14, backdropFilter:'blur(12px)', overflow:'hidden', minHeight:0, height:'100%' }}>

          {/* Selected control info */}
          <div style={{ borderBottom:`1px solid ${P.border}`, padding:'10px 16px', flexShrink:0, minHeight:64, transition:'border-color .2s', borderColor: selectedCtrl ? P.pink : P.border }}>
            {selectedCtrl ? (
              <>
                <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:9, color:P.pink, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.12em' }}>
                  {isEncoder(selectedCtrl) ? `Encoder ${selectedCtrl.replace('enc','')}` :
                   isKey(selectedCtrl) ? `Tecla ${selectedCtrl.replace('key','')}` :
                   `Botón ${selectedCtrl}`}
                </div>
                {isEncoder(selectedCtrl) && (() => {
                  const idx = parseInt(selectedCtrl.replace('enc','')) - 1
                  const mode = tab as EncoderMode
                  const label = ENCODER_LABELS[mode]?.[idx] ?? selectedCtrl
                  const cc = ENCODER_CC[mode]?.[idx]
                  return (
                    <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
                      <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:16, color:P.text, fontWeight:700 }}>{label}</div>
                      <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:P.sub }}>CC {cc} · {tab.toUpperCase()}</div>
                    </div>
                  )
                })()}
                {isKey(selectedCtrl) && (() => {
                  const note = KEY_NOTES[selectedCtrl]
                  const n = note ?? 36
                  return (
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:20, color:'#E52421', fontWeight:700 }}>
                        {noteNameCtrl(n)}
                        <span style={{ fontSize:11, color:P.sub, marginLeft:8 }}>note {n}</span>
                      </div>
                      {out && (
                        <button onClick={() => { sendNoteOn(out!, n, 100); setTimeout(() => sendNoteOff(out!, n), 300) }}
                          style={{ padding:'3px 10px', borderRadius:6, border:`1px solid #E52421`, background:'#E5242122', color:'#E52421', fontFamily:'JetBrains Mono,monospace', fontSize:10, cursor:'pointer' }}>
                          ▶ PLAY
                        </button>
                      )}
                    </div>
                  )
                })()}
                {isTecla(selectedCtrl) && (
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:16, color:P.purp, fontWeight:700 }}>
                    {TECLA_LABELS[selectedCtrl]}
                    <span style={{ fontSize:10, color:P.sub, fontWeight:400, marginLeft:8 }}>Botón de función</span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:P.sub, textAlign:'center', paddingTop:16 }}>
                Haz clic en un encoder, tecla o botón del WAVO
              </div>
            )}
          </div>

          {/* Quick stats + Screen nav */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, borderBottom:`1px solid ${P.border}`, flexShrink:0 }}>
            {/* Stats */}
            <div style={{ padding:'8px 14px', borderRight:`1px solid ${P.border}` }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 10px' }}>
                {[
                  { label:'WAVE',   val: WAVEFORM_NAMES[state.waveform],                                 color: WAVEFORM_COLORS[state.waveform] },
                  { label:'CUTOFF', val: String(state.cutoff),                                            color: P.cyan },
                  { label:'BPM',    val: String(state.bpm),                                              color: P.amber },
                  { label:'ARP',    val: state.arpActive ? ARP_MODE_NAMES[state.arpMode] : 'OFF',        color: state.arpActive ? P.lime : P.sub },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:8, color:P.sub, textTransform:'uppercase' }}>{label}</div>
                    <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, color, fontWeight:700 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Screen nav */}
            <div style={{ padding:'8px 12px' }}>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:8, color:P.sub, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.1em' }}>Pantalla WAVO</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:3 }}>
                {([
                  { label:'MODE', menuIdx: 0 },
                  { label:'OSC',  menuIdx: 1 },
                  { label:'ADSR', menuIdx: 2 },
                  { label:'SEQ',  menuIdx: 3 },
                  { label:'ARP',  menuIdx: 4 },
                  { label:'DRUMS',menuIdx: 6 },
                  { label:'MIXER',menuIdx: 10 },
                  { label:'CHORD',menuIdx: 9 },
                  { label:'PATT', menuIdx: 5 },
                ] as { label: string; menuIdx: number }[]).map(({ label, menuIdx }) => (
                  <button key={label}
                    onClick={() => { if (out) sendSysEx(out, SX_CMD.SET_MENU, [menuIdx]) }}
                    style={{ padding:'3px 2px', borderRadius:5, border:`1px solid ${P.border}`, background:'transparent', color:P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:8, cursor:'pointer', textAlign:'center', opacity: connected ? 1 : 0.4 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display:'flex', borderBottom:`1px solid ${P.border}`, overflowX:'auto', flexShrink:0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => switchTab(t.id)}
                style={{ padding:'10px 14px', border:'none', borderBottom:`2px solid ${tab===t.id?t.color:'transparent'}`, background:'transparent', color:tab===t.id?t.color:P.sub, fontFamily:'JetBrains Mono,monospace', fontSize:10, cursor:'pointer', fontWeight:tab===t.id?700:400, whiteSpace:'nowrap', transition:'all .12s' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px 18px' }}>
            {tab === 'osc'    && <OscPanel    s={state} set={set} out={out} />}
            {tab === 'filter' && <FilterPanel s={state} set={set} out={out} />}
            {tab === 'adsr'   && <AdsrPanel   s={state} set={set} out={out} />}
            {tab === 'fx'     && <FxPanel     s={state} set={set} out={out} />}
            {tab === 'arp'    && <ArpPanel    s={state} set={set} out={out} />}
            {tab === 'seq'    && <SeqPanel    s={state} set={set} out={out} playing={state.playing} />}
            {tab === 'drums'  && <DrumPanel   s={state} set={set} out={out} />}
            {tab === 'mixer'  && <MixerPanel  s={state} set={set} out={out} />}
            {tab === 'harm'   && <HarmPanel   s={state} set={set} out={out} />}
          </div>

          {/* Drum pattern mini view */}
          <div style={{ borderTop:`1px solid ${P.border}`, padding:'8px 14px', flexShrink:0 }}>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:8, color:P.sub, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.1em' }}>Drum Patterns</div>
            {DRUM_NAMES.map((name, t) => (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3 }}>
                <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:8, color:DRUM_COLORS[t], width:26 }}>{name.slice(0,4)}</span>
                <div style={{ display:'flex', gap:1, flex:1 }}>
                  {state.drumPatterns[t].map((on, i) => (
                    <div key={i} style={{ flex:1, height:6, borderRadius:1, background: on ? DRUM_COLORS[t] : '#1A1A22', opacity: on ? 0.9 : 0.3 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
          )
          if (!portalMode) return panelCard
          if (!(active && panelSlot)) return null
          return createPortal(
            <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0 }}>
              {wavoTransportStrip}
              <div style={{ flex:1, minHeight:0, padding:10, display:'flex' }}>{panelCard}</div>
            </div>, panelSlot)
        })()}
      </div>
    </div>
  )
}

export default WavoEditorPage
