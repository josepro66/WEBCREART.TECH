/**
 * Beato8EditorPage.tsx — Editor MIDI del BEATO8 (4 knobs + 8 pads arcade).
 *
 * 3 bancos A/B/C, comportamientos para knobs y pads, SysEx save/load,
 * integrable al ecosistema unificado vía portales.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import StarfieldBackground from '../configurator/components/StarfieldBackground'
import Beato8Scene, { type Beato8SceneHandle } from '../beato8-editor/Beato8Scene'
import {
  type Bank, type Beato8ControlId, type Beato8ControlState, type Beato8ControlConfig,
  BANKS, makeBeato8InitialState, beato8LabelFor, isBeato8Pad,
  ALL_BEATO8_CONTROL_IDS, BEATO8_KNOB_IDS, BEATO8_PAD_IDS,
  BEATO8_CHANNEL, BEATO8_BANK_CC, BEATO8_TOUCH_SELECT_CC,
  BEATO8_KNOB_BEHAVIORS, BEATO8_PAD_BEHAVIORS, BEATO8_PARAM_LABELS, BEATO8_BEHAVIOR_IDS,
} from '../beato8-editor/beato8State'

const P = { bg: '#0A0A0C', border: '#2A2A32', text: '#E8E6E0', sub: '#7A7870', accent: '#00E5FF', accentSoft: 'rgba(0,229,255,0.15)' }

const MANUFACTURER_ID = 0x7d
const DEVICE_ID_BEATO8 = 0x13
const CMD_PRESET_DATA_BEGIN = 0x20
const CMD_PRESET_DATA_CHUNK = 0x21
const CMD_PRESET_DATA_END   = 0x22
const CMD_ACK = 0x30
const CMD_WRITE_OK = 0x32

interface EngineEntry { value: number; target: number; phase: number }

function makeEngines(): Record<Beato8ControlId, Record<Bank, EngineEntry>> {
  const out = {} as Record<Beato8ControlId, Record<Bank, EngineEntry>>
  for (const id of ALL_BEATO8_CONTROL_IDS) {
    out[id] = {} as Record<Bank, EngineEntry>
    for (const b of BANKS) out[id][b] = { value: 0, target: 0, phase: 0 }
  }
  return out
}

function crc8(bytes: number[]): number {
  let crc = 0
  for (const b of bytes) { crc ^= b; for (let i = 0; i < 8; i++) crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff }
  return crc
}

function packControlByte(type: number, channel: number, mode: number): number {
  return ((type & 0x01) << 7) | ((channel & 0x0f) << 3) | ((mode & 0x01) << 2) | ((type >> 1) & 0x01)
}

interface Props {
  embedded?: boolean; embeddedTitle?: string; embeddedTint?: string
  sceneSlot?: HTMLElement | null; panelSlot?: HTMLElement | null
  active?: boolean; onActivate?: () => void
}

const Beato8EditorPage: React.FC<Props> = ({ embedded, embeddedTint, sceneSlot, panelSlot, active, onActivate }) => {
  const portalMode = typeof onActivate === 'function'
  const [midiState, setMidiState] = useState<Beato8ControlState>(makeBeato8InitialState)
  const [bank, setBank] = useState<Bank>('A')
  const [selected, setSelected] = useState<Beato8ControlId | null>(null)
  const [connected, setConnected] = useState(false)
  const [statusText, setStatusText] = useState('Buscando Beato8...')
  const sceneRef = useRef<Beato8SceneHandle>(null)

  const midiAccessRef = useRef<MIDIAccess | null>(null)
  const midiInputRef = useRef<MIDIInput | null>(null)
  const midiOutputRef = useRef<MIDIOutput | null>(null)
  const [outputList, setOutputList] = useState<{ idx: number; name: string }[]>([])
  const [selectedOutputIdx, setSelectedOutputIdx] = useState<number | null>(null)

  const [deviceSaveStatus, setDeviceSaveStatus] = useState('')
  const [deviceSaveProgress, setDeviceSaveProgress] = useState<number | null>(null)
  const pendingResponseRef = useRef<((r: { command: number | null; timedOut: boolean }) => void) | null>(null)
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enginesRef = useRef(makeEngines())
  const midiStateRef = useRef(midiState)
  const bankRef = useRef(bank)
  useEffect(() => { midiStateRef.current = midiState }, [midiState])
  useEffect(() => { bankRef.current = bank }, [bank])

  const onActivateRef = useRef(onActivate)
  useEffect(() => { onActivateRef.current = onActivate }, [onActivate])

  const [logEntries, setLogEntries] = useState<string[]>(['// Esperando conexion Web MIDI...'])
  const [logOpen, setLogOpen] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const logRef = useRef<HTMLDivElement>(null)

  const selectCtrl = (id: Beato8ControlId) => { setSelected(id); onActivate?.() }
  const log = useCallback((text: string) => { setLogEntries((prev) => { const next = [...prev, text]; return next.length > 60 ? next.slice(-60) : next }) }, [])
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [logEntries])

  const sendMidi = useCallback((id: Beato8ControlId, b: Bank, rawValue: number) => {
    const out = midiOutputRef.current; if (!out) return
    const s = midiStateRef.current[id][b]
    const chan = (s.chan - 1) & 0x0f
    if (s.type === 'note') {
      if (rawValue > 0) out.send([0x90 | chan, s.num, Math.min(127, rawValue)])
      else out.send([0x80 | chan, s.num, 0])
    } else {
      out.send([0xb0 | chan, s.num, Math.max(0, Math.min(127, Math.round(rawValue)))])
    }
  }, [])

  const lastTimeRef = useRef(performance.now())
  useEffect(() => {
    let animId: number
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000); lastTimeRef.current = now
      const s = midiStateRef.current; const engines = enginesRef.current
      for (const id of BEATO8_KNOB_IDS) {
        for (const b of BANKS) {
          const cfg = s[id][b]; const eng = engines[id][b]
          let outVal: number | null = null
          if (cfg.behavior === 'inercia') { const speed = 0.5 + (cfg.param / 100) * 9.5; eng.value += (eng.target - eng.value) * Math.min(1, speed * dt); if (Math.abs(eng.value - eng.target) > 0.4) outVal = eng.value }
          else if (cfg.behavior === 'oscila') { const speed = 0.2 + (cfg.param / 100) * 4; eng.phase += dt * speed; outVal = Math.max(0, Math.min(127, 64 + Math.sin(eng.phase) * ((eng.target / 127) * 63))) }
          if (outVal !== null) { sendMidi(id, b, outVal); if (b === bankRef.current) sceneRef.current?.setKnobValue(id, outVal) }
        }
      }
      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [sendMidi])

  const processIncoming = useCallback((statusByte: number, d1: number, d2: number) => {
    const s = midiStateRef.current; const engines = enginesRef.current; const currentBank = bankRef.current
    const type = statusByte & 0xf0

    if (type === 0xb0) {
      if (d1 === BEATO8_BANK_CC.A || d1 === BEATO8_BANK_CC.B || d1 === BEATO8_BANK_CC.C) {
        if (d2 > 0) { const nb: Bank = d1 === BEATO8_BANK_CC.A ? 'A' : d1 === BEATO8_BANK_CC.B ? 'B' : 'C'; if (nb !== currentBank) { setBank(nb); log(`Banco → ${nb}`) } }
        return
      }
      if (d1 === BEATO8_TOUCH_SELECT_CC && d2 < ALL_BEATO8_CONTROL_IDS.length) { setSelected(ALL_BEATO8_CONTROL_IDS[d2]); return }

      for (let i = 0; i < BEATO8_KNOB_IDS.length; i++) {
        const kid = BEATO8_KNOB_IDS[i]
        for (const b of BANKS) {
          if (s[kid][b].type === 'cc' && s[kid][b].num === d1) {
            const cfg = s[kid][b]; const eng = engines[kid][b]
            let outVal = d2
            if (cfg.behavior === 'espejo') outVal = 127 - d2
            else if (cfg.behavior === 'inercia') eng.target = d2
            else if (cfg.behavior === 'random') outVal = Math.max(0, Math.min(127, d2 + (Math.random() - 0.5) * 2 * cfg.param))
            else if (cfg.behavior === 'oscila') eng.target = d2
            if (b !== currentBank) { setBank(b); log(`Auto banco → ${b}`) }
            if (cfg.behavior !== 'oscila') sceneRef.current?.setKnobValue(kid, outVal)
            setSelected(kid); sendMidi(kid, b, outVal)
            log(`${beato8LabelFor(kid)} CC${cfg.num} → ${Math.round(outVal)}`)
            return
          }
        }
      }
    }

    if (type === 0x90 || type === 0x80) {
      const noteOn = type === 0x90 && d2 > 0
      for (let i = 0; i < BEATO8_PAD_IDS.length; i++) {
        const pid = BEATO8_PAD_IDS[i]
        for (const b of BANKS) {
          if (s[pid][b].type === 'note' && s[pid][b].num === d1) {
            if (b !== currentBank) { setBank(b); log(`Auto banco → ${b}`) }
            sceneRef.current?.setPadLit(pid, noteOn)
            setSelected(pid); sendMidi(pid, b, noteOn ? d2 : 0)
            log(`${beato8LabelFor(pid)} ${noteOn ? 'ON' : 'OFF'} vel=${d2}`)
            return
          }
        }
      }
    }
  }, [sendMidi, log])

  function waitForResponse(ms = 1500) {
    return new Promise<{ command: number | null; timedOut: boolean }>((resolve) => {
      pendingResponseRef.current = resolve
      pendingTimeoutRef.current = setTimeout(() => { pendingResponseRef.current = null; resolve({ command: null, timedOut: true }) }, ms)
    })
  }
  function sendSysex(cmd: number, payload: number[]) { const out = midiOutputRef.current; if (!out) return false; out.send([0xf0, MANUFACTURER_ID, DEVICE_ID_BEATO8, cmd, ...payload, 0xf7]); return true }

  function serializePreset(): number[] {
    const s = midiStateRef.current
    const bytes: number[] = [0xfb, 1, 0x00]
    for (const b of BANKS) {
      for (const id of BEATO8_KNOB_IDS) {
        const c = s[id][b]
        bytes.push(c.num & 0x7f, packControlByte(1, (c.chan - 1) & 0x0f, 0), BEATO8_BEHAVIOR_IDS[c.behavior] ?? 0, Math.min(100, Math.round(c.param)), Math.min(127, c.velMin), Math.min(127, c.velMax))
      }
      for (const id of BEATO8_PAD_IDS) {
        const c = s[id][b]
        bytes.push(c.num & 0x7f, packControlByte(0, (c.chan - 1) & 0x0f, c.mode === 'toggle' ? 1 : 0), BEATO8_BEHAVIOR_IDS[c.behavior] ?? 0, Math.min(100, Math.round(c.param)), Math.min(127, c.velMin), Math.min(127, c.velMax))
      }
    }
    bytes.push(crc8(bytes))
    return bytes
  }

  const saveToDevice = useCallback(async () => {
    if (!midiOutputRef.current || !midiInputRef.current) { setDeviceSaveStatus('Conecta el Beato8.'); return }
    const presetBytes = serializePreset()
    setDeviceSaveProgress(0); setDeviceSaveStatus('Enviando...')
    sendSysex(CMD_PRESET_DATA_BEGIN, [presetBytes.length & 0x7f, (presetBytes.length >> 7) & 0x7f])
    let resp = await waitForResponse()
    if (resp.timedOut || resp.command !== CMD_ACK) { setDeviceSaveStatus('Sin respuesta.'); setDeviceSaveProgress(null); return }
    setDeviceSaveProgress(5)
    const CHUNK = 32; const totalChunks = Math.ceil(presetBytes.length / CHUNK)
    for (let offset = 0; offset < presetBytes.length; offset += CHUNK) {
      const idx = offset / CHUNK; const chunkData = presetBytes.slice(offset, offset + CHUNK)
      const encoded: number[] = []; for (const b of chunkData) { encoded.push((b >> 4) & 0x0f, b & 0x0f) }
      let ok = false
      for (let attempt = 0; attempt < 3 && !ok; attempt++) { sendSysex(CMD_PRESET_DATA_CHUNK, [idx, ...encoded]); resp = await waitForResponse(); if (!resp.timedOut && resp.command === CMD_ACK) ok = true }
      if (!ok) { setDeviceSaveStatus(`Fallo bloque ${idx}.`); setDeviceSaveProgress(null); return }
      setDeviceSaveProgress(Math.round(5 + ((idx + 1) / totalChunks) * 90))
    }
    sendSysex(CMD_PRESET_DATA_END, []); resp = await waitForResponse(3000); setDeviceSaveProgress(null)
    setDeviceSaveStatus(resp.command === CMD_WRITE_OK ? 'Guardado en el Beato8.' : 'Error al validar.')
  }, [log])

  const saveConfig = useCallback(async () => {
    const data = JSON.stringify({ state: midiStateRef.current }, null, 2)
    if ((window as any).showSaveFilePicker) {
      try { const handle = await (window as any).showSaveFilePicker({ suggestedName: 'beato8_config.b8', types: [{ description: 'Config Beato8', accept: { 'application/json': ['.b8', '.json'] } }] }); const w = await handle.createWritable(); await w.write(data); await w.close(); log('Config guardada.') } catch (e: any) { if (e.name !== 'AbortError') log('Error: ' + e.message) }
    } else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = 'beato8_config.b8'; a.click() }
  }, [log])

  const loadConfig = useCallback(async () => {
    const apply = (cfg: any) => { if (!cfg?.state) return; setMidiState((prev) => { const next = { ...prev }; Object.keys(cfg.state).forEach((id) => { if (next[id as Beato8ControlId]) { next[id as Beato8ControlId] = { ...next[id as Beato8ControlId] }; BANKS.forEach((b) => { if (cfg.state[id][b]) next[id as Beato8ControlId][b] = { ...cfg.state[id][b] } }) } }); return next }); log('Config cargada.') }
    if ((window as any).showOpenFilePicker) { try { const [h] = await (window as any).showOpenFilePicker({ types: [{ description: 'Config Beato8', accept: { 'application/json': ['.b8', '.json'] } }] }); apply(JSON.parse(await (await h.getFile()).text())) } catch (e: any) { if (e.name !== 'AbortError') log('Error: ' + e.message) } }
    else { const input = document.createElement('input'); input.type = 'file'; input.accept = '.b8,.json'; input.onchange = async () => { try { apply(JSON.parse(await input.files![0].text())) } catch (e: any) { log('Error: ' + e.message) } }; input.click() }
  }, [log])

  const handleFactoryReset = useCallback(() => {
    if (!window.confirm('Restablecer valores de fabrica?')) return
    const out = midiOutputRef.current; if (out) { for (let ch = 0; ch < 16; ch++) { out.send([0xb0 | ch, 123, 0]) } }
    try { localStorage.removeItem('beato8-state') } catch {}
    setMidiState(makeBeato8InitialState()); setBank('A'); setSelected(null); setDeviceSaveStatus(''); setDeviceSaveProgress(null); log('Reset de fabrica.')
  }, [log])

  const updateCfg = useCallback((id: Beato8ControlId, b: Bank, patch: Partial<Beato8ControlConfig>) => {
    setMidiState((prev) => ({ ...prev, [id]: { ...prev[id], [b]: { ...prev[id][b], ...patch } } }))
    if (patch.behavior) { const eng = enginesRef.current[id][b]; eng.phase = 0; eng.value = 0; eng.target = 0 }
  }, [])

  const isBeato8Device = (name: string | null | undefined) => /beato.*8|beato[^1]/i.test(name || '')

  const setupMidiPorts = useCallback((access: MIDIAccess) => {
    const allInputs = Array.from(access.inputs.values()); const allOutputs = Array.from(access.outputs.values())
    const firstIn = allInputs.find((p) => isBeato8Device(p.name)) || allInputs[0]
    if (firstIn && firstIn !== midiInputRef.current) {
      midiInputRef.current = firstIn
      firstIn.onmidimessage = (msg: MIDIMessageEvent) => {
        const data = msg.data; if (!data || data.length < 1) return
        if (data[0] === 0xf0) { if (data.length >= 4 && data[1] === MANUFACTURER_ID && data[2] === DEVICE_ID_BEATO8) { if (pendingResponseRef.current) { const r = pendingResponseRef.current; pendingResponseRef.current = null; if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current); r({ command: data[3], timedOut: false }) } } return }
        if (data.length < 3) return
        onActivateRef.current?.(); processIncoming(data[0], data[1], data[2])
      }
      setConnected(true); setStatusText(firstIn.name || 'MIDI Conectado'); log('Conectado: ' + firstIn.name)
    } else if (!firstIn) { midiInputRef.current = null; setConnected(false); setStatusText('Beato8 no detectado.') }
    setOutputList(allOutputs.map((o, idx) => ({ idx, name: o.name })))
    if (allOutputs.length > 0 && !midiOutputRef.current) { const bIdx = allOutputs.findIndex((p) => isBeato8Device(p.name)); midiOutputRef.current = allOutputs[bIdx >= 0 ? bIdx : 0]; setSelectedOutputIdx(bIdx >= 0 ? bIdx : 0) }
  }, [processIncoming, log])

  useEffect(() => {
    const nav = navigator as any; if (!nav.requestMIDIAccess) { setStatusText('Web MIDI no soportado'); return }
    nav.requestMIDIAccess({ sysex: true }).then((a: MIDIAccess) => { midiAccessRef.current = a; setupMidiPorts(a); a.addEventListener('statechange', () => setupMidiPorts(a)) }).catch((e: Error) => { setStatusText('Error: ' + e.message) })
  }, [setupMidiPorts, log])

  const handleOutputChange = useCallback((idx: number | null) => { setSelectedOutputIdx(idx); if (idx === null) { midiOutputRef.current = null; return }; midiOutputRef.current = Array.from(midiAccessRef.current!.outputs.values())[idx] || null }, [])

  useEffect(() => { const id = setInterval(() => { try { localStorage.setItem('beato8-state', JSON.stringify(midiStateRef.current)) } catch {} }, 2000); return () => clearInterval(id) }, [])
  useEffect(() => { try { const saved = localStorage.getItem('beato8-state'); if (saved) { const parsed = JSON.parse(saved); setMidiState((prev) => { const next = { ...prev }; Object.keys(parsed).forEach((id) => { if (next[id as Beato8ControlId]) { next[id as Beato8ControlId] = { ...next[id as Beato8ControlId] }; BANKS.forEach((b) => { if (parsed[id]?.[b]) next[id as Beato8ControlId][b] = { ...parsed[id][b] } }) } }); return next }) } } catch {} }, [])

  const tint = embeddedTint || P.accent
  const sceneEl = <Beato8Scene ref={sceneRef} selectedId={selected} onSelect={selectCtrl} showLabels={showLabels} />
  const cfg = selected ? midiState[selected][bank] : null
  const isPad = selected ? isBeato8Pad(selected) : false
  const behaviors = isPad ? BEATO8_PAD_BEHAVIORS : BEATO8_KNOB_BEHAVIORS
  const selectedBehavior = cfg ? behaviors.find((b) => b.id === cfg.behavior) : null
  const paramLabel = cfg ? BEATO8_PARAM_LABELS[cfg.behavior] : null

  const panelEl = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, color: P.text, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${P.border}`, background: 'rgba(14,14,16,0.6)', flexWrap: 'wrap' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? tint : '#FF6B57', boxShadow: connected ? `0 0 8px ${tint}` : undefined }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.sub, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusText}</span>
        {outputList.length > 0 && <select value={selectedOutputIdx ?? ''} onChange={(e) => handleOutputChange(e.target.value === '' ? null : parseInt(e.target.value))} style={{ fontFamily: 'JetBrains Mono, monospace', background: '#1A1A20', color: P.text, border: `1px solid ${P.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 11 }}><option value="">Sin salida</option>{outputList.map((o) => <option key={o.idx} value={o.idx}>{o.name}</option>)}</select>}
        <button onClick={() => setShowLabels((v) => !v)} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, background: showLabels ? 'rgba(57,255,20,0.15)' : '#1A1A20', color: showLabels ? '#39ff14' : P.sub, border: `1px solid ${showLabels ? '#39ff14' : P.border}`, borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}>MAP</button>
        <button onClick={() => setLogOpen((v) => !v)} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, background: logOpen ? P.accentSoft : '#1A1A20', color: logOpen ? tint : P.sub, border: `1px solid ${logOpen ? tint : P.border}`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>Consola</button>
        <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>{BANKS.map((b) => <button key={b} onClick={() => setBank(b)} style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${b === bank ? tint : P.border}`, background: b === bank ? tint : '#1A1A20', color: b === bank ? '#0E0E10' : P.text, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, cursor: 'pointer' }}>{b}</button>)}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        {!selected ? (
          <div style={{ display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center', marginTop: 56 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, border: `1px dashed ${tint}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tint, fontSize: 18 }}>◉</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: '#D8DBE0', textTransform: 'uppercase' }}>Selecciona un control</div>
            <div style={{ color: '#8A919E', fontSize: 12.5, lineHeight: 1.6, maxWidth: 260 }}>Haz clic en un knob o pad del modelo 3D para configurar su ruteo MIDI.</div>
          </div>
        ) : cfg && (
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: tint, textTransform: 'uppercase', margin: 0 }}>Control seleccionado &middot; Banco {bank}</p>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '0.06em', margin: '4px 0 18px', color: P.text }}>{beato8LabelFor(selected)}</h2>

            <Field label="Etiqueta"><input type="text" value={cfg.label} onChange={(e) => updateCfg(selected, bank, { label: e.target.value })} maxLength={20} style={inputStyle} /></Field>
            <Field label="Tipo MIDI">
              <select value={cfg.type} onChange={(e) => updateCfg(selected, bank, { type: e.target.value as any })} style={inputStyle}>
                <option value="cc">CC</option><option value="note">Note</option>
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label={cfg.type === 'note' ? 'Nota #' : 'CC #'}><input type="number" min={0} max={127} value={cfg.num} onChange={(e) => updateCfg(selected, bank, { num: clamp(Number(e.target.value), 0, 127) })} style={inputStyle} /></Field>
              <Field label="Canal"><input type="number" min={1} max={16} value={cfg.chan} onChange={(e) => updateCfg(selected, bank, { chan: clamp(Number(e.target.value), 1, 16) })} style={inputStyle} /></Field>
            </div>

            {isPad && (
              <Field label="Modo">
                <select value={cfg.mode} onChange={(e) => updateCfg(selected, bank, { mode: e.target.value as any })} style={inputStyle}>
                  <option value="momentary">Momentaneo</option><option value="toggle">Toggle</option>
                </select>
              </Field>
            )}

            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', color: P.sub, textTransform: 'uppercase', margin: '14px 0 6px' }}>Velocidad</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Min"><input type="number" min={0} max={127} value={cfg.velMin} onChange={(e) => updateCfg(selected, bank, { velMin: clamp(Number(e.target.value), 0, 127) })} style={inputStyle} /></Field>
              <Field label="Max"><input type="number" min={0} max={127} value={cfg.velMax} onChange={(e) => updateCfg(selected, bank, { velMax: clamp(Number(e.target.value), 0, 127) })} style={inputStyle} /></Field>
            </div>

            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', color: P.sub, textTransform: 'uppercase', margin: '14px 0 6px' }}>Comportamiento</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {behaviors.map((bh) => {
                const act = cfg.behavior === bh.id
                return <button key={bh.id} onClick={() => updateCfg(selected, bank, { behavior: bh.id })} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: act ? 700 : 400, background: act ? P.accentSoft : '#1A1A20', color: act ? tint : P.sub, border: `1px solid ${act ? tint : P.border}`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>{bh.icon} {bh.name}</button>
              })}
            </div>
            {selectedBehavior && <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.sub, lineHeight: 1.5, margin: '0 0 10px' }}>{selectedBehavior.desc}</p>}
            {paramLabel && <Field label={paramLabel}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><input type="range" min={0} max={100} value={cfg.param} onChange={(e) => updateCfg(selected, bank, { param: Number(e.target.value) })} style={{ flex: 1, accentColor: tint }} /><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.sub, width: 32, textAlign: 'right' }}>{cfg.param}</span></div></Field>}

            <div style={{ borderTop: `1px solid ${P.border}`, margin: '18px 0' }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={saveConfig} style={actionBtnStyle(tint)}>Guardar config</button>
              <button onClick={loadConfig} style={actionBtnStyle(tint)}>Cargar config</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <button onClick={saveToDevice} style={actionBtnStyle(tint)}>Guardar en dispositivo</button>
              <button onClick={handleFactoryReset} style={{ ...actionBtnStyle('#FF6B57'), borderColor: '#FF6B57', color: '#FF6B57', background: 'rgba(255,107,87,0.1)' }}>Reset fabrica</button>
            </div>
            {deviceSaveStatus && <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.sub, marginTop: 10 }}>{deviceSaveStatus}</p>}
            {deviceSaveProgress !== null && <div style={{ width: '100%', height: 4, background: '#1A1A20', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}><div style={{ width: `${deviceSaveProgress}%`, height: '100%', background: tint, borderRadius: 2, transition: 'width 0.3s' }} /></div>}
          </div>
        )}
      </div>
    </div>
  )

  const consoleEl = logOpen && (
    <div style={{ position: 'fixed', bottom: 20, right: 20, width: 340, maxHeight: 280, background: '#18181B', border: `1px solid ${P.border}`, borderRadius: 14, display: 'flex', flexDirection: 'column', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${P.border}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.sub }}><span>Consola &middot; Beato8</span><button onClick={() => setLogOpen(false)} style={{ background: 'none', border: 'none', color: P.sub, cursor: 'pointer', fontSize: 16 }}>&times;</button></div>
      <div ref={logRef} style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.sub, overflowY: 'auto', flex: 1 }}>{logEntries.map((e, i) => <p key={i} style={{ margin: '2px 0' }}>{e}</p>)}</div>
    </div>
  )

  if (portalMode) {
    return (<>
      {sceneSlot && createPortal(<div onPointerDownCapture={onActivate} style={{ flex: '1 1 0', minWidth: 0, height: '100%', position: 'relative' }}><div style={{ width: '100%', height: '100%' }}>{sceneEl}</div></div>, sceneSlot)}
      {active && panelSlot && createPortal(panelEl, panelSlot)}
      {active && consoleEl && createPortal(consoleEl, document.body)}
    </>)
  }

  return (
    <div style={{ ...(embedded ? { position: 'relative', width: '100%', height: '100%', display: 'grid' } : { position: 'fixed', inset: 0, display: 'grid' }), color: P.text, fontFamily: 'Inter, sans-serif', gridTemplateColumns: '1.4fr 1fr', background: P.bg, minHeight: 0 }}>
      <StarfieldBackground />
      <div style={{ position: 'relative', minHeight: 0, minWidth: 0 }}>{sceneEl}</div>
      <div style={{ borderLeft: `1px solid ${P.border}`, background: 'rgba(18,18,22,0.85)', display: 'flex', flexDirection: 'column' }}>{panelEl}</div>
      {consoleEl}
    </div>
  )
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (<div style={{ marginBottom: 10 }}><div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em', color: '#7A7870', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>{children}</div>)
const inputStyle: React.CSSProperties = { width: '100%', background: '#1A1A20', border: '1px solid #2A2A32', borderRadius: 6, padding: '7px 9px', color: '#E8E6E0', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, boxSizing: 'border-box' }
function actionBtnStyle(tint: string): React.CSSProperties { return { fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'rgba(0,229,255,0.08)', border: `1px solid ${tint}`, color: tint, borderRadius: 7, padding: '8px 12px', cursor: 'pointer' } }
function clamp(n: number, lo: number, hi: number): number { return Number.isNaN(n) ? lo : Math.max(lo, Math.min(hi, n)) }

export default Beato8EditorPage
