/**
 * MixoEditorPage.tsx — Editor MIDI del MIXO con vista 3D.
 *
 * Lógica portada 1:1 del Control Studio HTML (MIXO.ino): 3 bancos A/B/C,
 * 8 encoders (4 knobs + 4 faders) + 4 pads con LED, comportamientos, SysEx
 * save/factory (0xF9, DEVICE_ID 0x12), y procesamiento MIDI en vivo que
 * anima el modelo 3D. Se integra al ecosistema vía portales o standalone.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import StarfieldBackground from '../configurator/components/StarfieldBackground'
import MixoScene, { type MixoSceneHandle } from '../mixo-editor/MixoScene'
import { ECO } from '../editor-shared/ecosystem'
import {
  type Bank,
  type MixoControlId,
  type MixoControlState,
  type MixoControlConfig,
  BANKS,
  makeMixoInitialState,
  mixoLabelFor,
  MIXO_ENCODER_IDS,
  MIXO_PAD_IDS,
  ALL_MIXO_CONTROL_IDS,
  MIXO_CHANNEL,
  MIXO_BANK_CC,
  MIXO_TOUCH_SELECT_CC,
  MIXO_MASTER_CC,
  MIXO_ENCODER_BEHAVIORS,
  MIXO_PAD_BEHAVIORS,
  MIXO_PARAM_LABELS,
  MIXO_BEHAVIOR_IDS,
  isMixoPad,
} from '../mixo-editor/mixoState'

const T = {
  border: '#2A2A32',
  text: '#F5F4F0',
  sub: '#9795A0',
  accent: '#FF9F43',
  accentSoft: 'rgba(255,159,67,0.14)',
}

// ── SysEx constants (espejo del firmware MIXO.ino) ──────────────
const MANUFACTURER_ID = 0x7d
const DEVICE_ID_MIXO = 0x12
const CMD_PRESET_DATA_BEGIN = 0x20
const CMD_PRESET_DATA_CHUNK = 0x21
const CMD_PRESET_DATA_END = 0x22
const CMD_ACK = 0x30
const CMD_WRITE_OK = 0x32
const MIXO_PRESET_MAGIC = 0xf9
const MIXO_FORMAT_VERSION = 1
// magic(1) version(1) flags(1) + 3 bancos x (8 enc + 4 pads) x 6 + crc(1) = 220
const MIXO_PRESET_BINARY_SIZE = 3 + 3 * (8 + 4) * 6 + 1

function crc8(bytes: number[]): number {
  let crc = 0
  for (const b of bytes) {
    crc ^= b
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff
    }
  }
  return crc
}

function typeToNum(t: string): number {
  return t === 'cc' ? 1 : t === 'note' ? 0 : 0
}

function packControlByte(type: number, channel: number, mode: number): number {
  const bit7 = type & 0x01
  const bit0 = (type >> 1) & 0x01
  return (bit7 << 7) | ((channel & 0x0f) << 3) | ((mode & 0x01) << 2) | bit0
}

// ── Engine state para comportamientos autónomos ────────────────
interface EngineEntry { value: number; target: number; phase: number }
function makeEngines(): Record<MixoControlId, Record<Bank, EngineEntry>> {
  const out = {} as Record<MixoControlId, Record<Bank, EngineEntry>>
  for (const id of ALL_MIXO_CONTROL_IDS) {
    out[id] = {} as Record<Bank, EngineEntry>
    for (const b of BANKS) out[id][b] = { value: 0, target: 0, phase: 0 }
  }
  return out
}

interface Props {
  embedded?: boolean
  embeddedTitle?: string
  embeddedTint?: string
  sceneSlot?: HTMLElement | null
  panelSlot?: HTMLElement | null
  active?: boolean
  onActivate?: () => void
}

const MixoEditorPage: React.FC<Props> = ({
  embedded, embeddedTitle, embeddedTint, sceneSlot, panelSlot, active, onActivate,
}) => {
  const portalMode = typeof onActivate === 'function'
  const [midiState, setMidiState] = useState<MixoControlState>(makeMixoInitialState)
  const [bank, setBank] = useState<Bank>('A')
  const [selected, setSelected] = useState<MixoControlId | null>(null)
  const [connected, setConnected] = useState(false)
  const [statusText, setStatusText] = useState('Buscando Mixo...')
  const [masterSelector, setMasterSelector] = useState(false)
  const [deviceSaveStatus, setDeviceSaveStatus] = useState('')
  const [deviceSaveProgress, setDeviceSaveProgress] = useState<number | null>(null)
  const [logEntries, setLogEntries] = useState<string[]>(['// Esperando conexion Web MIDI...'])
  const [logOpen, setLogOpen] = useState(false)
  const [outputList, setOutputList] = useState<{ idx: number; name: string }[]>([])
  const [selectedOutputIdx, setSelectedOutputIdx] = useState<number | null>(null)

  const sceneRef = useRef<MixoSceneHandle>(null)
  const midiAccessRef = useRef<MIDIAccess | null>(null)
  const midiInputRef = useRef<MIDIInput | null>(null)
  const midiOutputRef = useRef<MIDIOutput | null>(null)
  const pendingResponseRef = useRef<((r: { command: number | null; timedOut: boolean }) => void) | null>(null)
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enginesRef = useRef(makeEngines())
  const midiStateRef = useRef(midiState)
  const bankRef = useRef(bank)
  const masterSelectorRef = useRef(false)
  const onActivateRef = useRef(onActivate)
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => { midiStateRef.current = midiState }, [midiState])
  useEffect(() => { bankRef.current = bank }, [bank])
  useEffect(() => { masterSelectorRef.current = masterSelector }, [masterSelector])
  useEffect(() => { onActivateRef.current = onActivate }, [onActivate])

  const log = useCallback((text: string) => {
    setLogEntries((prev) => {
      const next = [...prev, text]
      return next.length > 60 ? next.slice(-60) : next
    })
  }, [])
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [logEntries])

  const selectCtrl = useCallback((id: MixoControlId) => {
    setSelected(id)
    onActivate?.()
  }, [onActivate])

  const updateCfg = useCallback((id: MixoControlId, b: Bank, patch: Partial<MixoControlConfig>) => {
    setMidiState((prev) => ({ ...prev, [id]: { ...prev[id], [b]: { ...prev[id][b], ...patch } } }))
    if (patch.behavior) {
      const eng = enginesRef.current[id][b]
      eng.phase = 0; eng.value = 0; eng.target = 0
    }
  }, [])

  // ── MIDI send + animación 3D ──────────────────────────────────
  const animate = useCallback((id: MixoControlId, val: number) => {
    if (isMixoPad(id)) return
    if (id.startsWith('f')) sceneRef.current?.setFaderValue(id, val)
    else sceneRef.current?.setKnobValue(id, val)
  }, [])

  const sendMidiFromBank = useCallback((id: MixoControlId, b: Bank, rawValue: number) => {
    const out = midiOutputRef.current
    if (!out) return
    const s = midiStateRef.current[id][b]
    const chan = (s.chan - 1) & 0x0f
    const v = Math.max(0, Math.min(127, Math.round(rawValue)))
    if (s.type === 'note') out.send([0x90 | chan, s.num, v])
    else out.send([0xb0 | chan, s.num, v])
  }, [])

  // ── Behavior engine (inercia + oscila) ────────────────────────
  const lastTimeRef = useRef(performance.now())
  useEffect(() => {
    let animId: number
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000)
      lastTimeRef.current = now
      const s = midiStateRef.current
      const engines = enginesRef.current
      for (const id of MIXO_ENCODER_IDS) {
        for (const b of BANKS) {
          const cfg = s[id][b]
          const eng = engines[id][b]
          let outVal: number | null = null
          if (cfg.behavior === 'inercia') {
            const speed = 0.5 + (cfg.param / 100) * 9.5
            eng.value += (eng.target - eng.value) * Math.min(1, speed * dt)
            if (Math.abs(eng.value - eng.target) > 0.4) outVal = eng.value
          } else if (cfg.behavior === 'oscila') {
            const speed = 0.2 + (cfg.param / 100) * 4
            eng.phase += dt * speed
            const range = (eng.target / 127) * 63
            outVal = Math.max(0, Math.min(127, 64 + Math.sin(eng.phase) * range))
          }
          if (outVal !== null) {
            sendMidiFromBank(id, b, outVal)
            if (b === bankRef.current) animate(id, outVal)
          }
        }
      }
      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [sendMidiFromBank, animate])

  // ── Procesamiento MIDI entrante (espejo del HTML) ─────────────
  const processIncoming = useCallback((type: number, d1: number, d2: number) => {
    const s = midiStateRef.current
    const engines = enginesRef.current
    const currentBank = bankRef.current

    if (type === 0xb0) {
      // CC 110 → touch select (d2 = índice de encoder)
      if (d1 === MIXO_TOUCH_SELECT_CC) {
        const eid = MIXO_ENCODER_IDS[d2]
        if (eid) setSelected(eid)
        return
      }
      // CC 119 → fader 4 (f3) selector: anima y selecciona
      if (d1 === MIXO_MASTER_CC) {
        setSelected('f3')
        sceneRef.current?.setFaderValue('f3', d2)
        return
      }
      // CC 116/117/118 → cambio de banco
      if ((d1 === MIXO_BANK_CC.A || d1 === MIXO_BANK_CC.B || d1 === MIXO_BANK_CC.C) && d2 > 0) {
        const nb: Bank = d1 === MIXO_BANK_CC.A ? 'A' : d1 === MIXO_BANK_CC.B ? 'B' : 'C'
        if (nb !== currentBank) { setBank(nb); log(`Banco cambiado a ${nb}`) }
        return
      }
      // Otros CC → buscar encoder por su CC en cualquier banco
      let mid: MixoControlId | null = null
      let matchBank: Bank | null = null
      for (const eid of MIXO_ENCODER_IDS) {
        for (const b of BANKS) {
          const st = s[eid][b]
          if (st.type === 'cc' && st.num === d1) { mid = eid; matchBank = b; break }
        }
        if (mid) break
      }
      if (!mid || !matchBank) return
      const cfg = s[mid][matchBank]
      const eng = engines[mid][matchBank]
      eng.target = d2
      const autonomous = cfg.behavior === 'oscila' || cfg.behavior === 'random'
      let outVal = d2
      if (cfg.behavior === 'espejo') outVal = 127 - d2
      else if (cfg.behavior === 'random') outVal = Math.max(0, Math.min(127, d2 + (Math.random() - 0.5) * 2 * cfg.param))
      if (matchBank !== currentBank) { setBank(matchBank); log(`Auto-switch banco → ${matchBank}`) }
      if (!autonomous) { setSelected(mid); if (cfg.behavior !== 'inercia') animate(mid, outVal) }
      sendMidiFromBank(mid, matchBank, outVal)
      log(`${mixoLabelFor(mid)} (${cfg.behavior}) banco${matchBank} → val=${Math.round(outVal)}`)
    } else if (type === 0x90 || type === 0x80) {
      // Pads (notas) → buscar por nota en cualquier banco
      const on = type === 0x90 && d2 > 0
      let pid: MixoControlId | null = null
      let matchBank: Bank | null = null
      for (const id of MIXO_PAD_IDS) {
        for (const b of BANKS) {
          const st = s[id][b]
          if (st.type === 'note' && st.num === d1) { pid = id; matchBank = b; break }
        }
        if (pid) break
      }
      if (!pid || !matchBank) return
      sceneRef.current?.setPadLit(pid, on)
      if (on) {
        if (matchBank !== currentBank) setBank(matchBank)
        setSelected(pid)
        sendMidiFromBank(pid, matchBank, s[pid][matchBank].velMax)
      }
    }
  }, [sendMidiFromBank, animate, log])

  // ── SysEx ─────────────────────────────────────────────────────
  function waitForResponse(ms = 1500) {
    return new Promise<{ command: number | null; timedOut: boolean }>((resolve) => {
      pendingResponseRef.current = resolve
      pendingTimeoutRef.current = setTimeout(() => {
        pendingResponseRef.current = null
        resolve({ command: null, timedOut: true })
      }, ms)
    })
  }

  function sendSysex(cmd: number, payload: number[]) {
    const out = midiOutputRef.current
    if (!out) return false
    out.send([0xf0, MANUFACTURER_ID, DEVICE_ID_MIXO, cmd, ...payload, 0xf7])
    return true
  }

  function serializePreset(): number[] {
    const s = midiStateRef.current
    const flags = masterSelectorRef.current ? 0x01 : 0x00
    const bytes: number[] = [MIXO_PRESET_MAGIC, MIXO_FORMAT_VERSION, flags]
    const pushCtrl = (c: MixoControlConfig) => {
      const paramMax = c.behavior === 'random' ? 127 : 100
      bytes.push(c.num & 0x7f)
      bytes.push(packControlByte(typeToNum(c.type), (c.chan - 1) & 0x0f, c.mode === 'toggle' ? 1 : 0))
      bytes.push(MIXO_BEHAVIOR_IDS[c.behavior] ?? 0)
      bytes.push(Math.max(0, Math.min(paramMax, Math.round(c.param))))
      bytes.push(Math.max(0, Math.min(127, Math.round(c.velMin))))
      bytes.push(Math.max(0, Math.min(127, Math.round(c.velMax))))
    }
    for (const b of BANKS) {
      MIXO_ENCODER_IDS.forEach((id) => pushCtrl(s[id][b]))
      MIXO_PAD_IDS.forEach((id) => pushCtrl(s[id][b]))
    }
    bytes.push(crc8(bytes))
    if (bytes.length !== MIXO_PRESET_BINARY_SIZE) throw new Error(`Tamano inesperado: ${bytes.length}`)
    return bytes
  }

  const saveToDevice = useCallback(async () => {
    if (!midiOutputRef.current || !midiInputRef.current) {
      setDeviceSaveStatus('Conecta el Mixo (entrada y salida MIDI) antes de guardar.')
      return
    }
    let presetBytes: number[]
    try { presetBytes = serializePreset() }
    catch (e: any) { setDeviceSaveStatus('Error preparando datos: ' + e.message); return }
    setDeviceSaveProgress(0)
    setDeviceSaveStatus('Enviando configuracion al Mixo...')
    const totalLen = presetBytes.length
    sendSysex(CMD_PRESET_DATA_BEGIN, [totalLen & 0x7f, (totalLen >> 7) & 0x7f])
    let resp = await waitForResponse()
    if (resp.timedOut || resp.command !== CMD_ACK) {
      setDeviceSaveStatus('Sin respuesta del dispositivo.'); setDeviceSaveProgress(null); return
    }
    setDeviceSaveProgress(5)
    const CHUNK = 32
    const totalChunks = Math.ceil(presetBytes.length / CHUNK)
    for (let offset = 0; offset < presetBytes.length; offset += CHUNK) {
      const idx = offset / CHUNK
      const chunkData = presetBytes.slice(offset, offset + CHUNK)
      const encoded: number[] = []
      for (const b of chunkData) { encoded.push((b >> 4) & 0x0f); encoded.push(b & 0x0f) }
      let ok = false
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        sendSysex(CMD_PRESET_DATA_CHUNK, [idx, ...encoded])
        resp = await waitForResponse()
        if (!resp.timedOut && resp.command === CMD_ACK) ok = true
      }
      if (!ok) { setDeviceSaveStatus(`Fallo en bloque ${idx}.`); setDeviceSaveProgress(null); return }
      setDeviceSaveProgress(Math.round(5 + ((idx + 1) / totalChunks) * 90))
    }
    sendSysex(CMD_PRESET_DATA_END, [])
    resp = await waitForResponse(3000)
    setDeviceSaveProgress(null)
    setDeviceSaveStatus(resp.command === CMD_WRITE_OK
      ? 'Guardado en el Mixo. Queda en el hardware aunque lo desconectes.'
      : 'El firmware no pudo validar el preset.')
  }, [])

  const handleFactoryReset = useCallback(() => {
    if (!window.confirm('¿Restaurar la configuración de fábrica del Mixo?')) return
    setMidiState(makeMixoInitialState())
    setMasterSelector(false)
    log('Configuración restaurada a fábrica.')
  }, [log])

  // ── MIDI I/O setup ────────────────────────────────────────────
  const isMixoDevice = (name: string | null | undefined) => /mixo/i.test(name || '')

  const setupMidiPorts = useCallback((access: MIDIAccess) => {
    const allInputs = Array.from(access.inputs.values())
    const allOutputs = Array.from(access.outputs.values())
    const firstIn = allInputs.find((p) => isMixoDevice(p.name)) || allInputs[0]
    if (firstIn && firstIn !== midiInputRef.current) {
      midiInputRef.current = firstIn
      firstIn.onmidimessage = (msg: MIDIMessageEvent) => {
        const data = msg.data
        if (!data || data.length < 1) return
        if (data[0] === 0xf0) {
          if (data.length >= 4 && data[1] === MANUFACTURER_ID && data[2] === DEVICE_ID_MIXO) {
            const command = data[3]
            if (pendingResponseRef.current) {
              const resolve = pendingResponseRef.current
              pendingResponseRef.current = null
              if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current)
              resolve({ command, timedOut: false })
            }
          }
          return
        }
        if (data.length < 3) return
        const [statusByte, d1, d2] = data
        const t = statusByte & 0xf0
        if (t === 0xb0 || t === 0x90 || t === 0x80) {
          onActivateRef.current?.()
          processIncoming(t, d1, d2)
        }
      }
      setConnected(true)
      setStatusText('Conectado: ' + (firstIn.name || 'Mixo'))
      log('Conectado a: ' + firstIn.name)
    } else if (!firstIn) {
      midiInputRef.current = null
      setConnected(false)
      setStatusText('Mixo no detectado. Conéctalo y recarga.')
    }
    setOutputList(allOutputs.map((o, idx) => ({ idx, name: o.name })))
    if (allOutputs.length > 0 && midiOutputRef.current === null) {
      const fadoOutIdx = allOutputs.findIndex((p) => isMixoDevice(p.name))
      const useIdx = fadoOutIdx >= 0 ? fadoOutIdx : 0
      midiOutputRef.current = allOutputs[useIdx]
      setSelectedOutputIdx(useIdx)
    }
  }, [processIncoming, log])

  useEffect(() => {
    const nav = navigator as any
    if (!nav.requestMIDIAccess) { setStatusText('Web MIDI no soportado (usa Chrome/Edge)'); return }
    nav.requestMIDIAccess({ sysex: true })
      .then((access: MIDIAccess) => {
        midiAccessRef.current = access
        setupMidiPorts(access)
        access.addEventListener('statechange', () => setupMidiPorts(access))
      })
      .catch((err: Error) => { setStatusText('Error MIDI: ' + err.message); log('Error MIDI: ' + err.message) })
  }, [setupMidiPorts, log])

  const handleOutputChange = useCallback((idx: number | null) => {
    setSelectedOutputIdx(idx)
    if (idx === null) { midiOutputRef.current = null; return }
    const access = midiAccessRef.current
    if (!access) return
    midiOutputRef.current = Array.from(access.outputs.values())[idx] || null
  }, [])

  // ── localStorage ──────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      try {
        localStorage.setItem('mixo-state', JSON.stringify(midiStateRef.current))
        localStorage.setItem('mixo-master', masterSelectorRef.current ? '1' : '0')
        localStorage.setItem('mixo-version', '1')
      } catch (_) { /**/ }
    }, 2000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      if (localStorage.getItem('mixo-version') !== '1') return
      const saved = localStorage.getItem('mixo-state')
      if (saved) {
        const parsed = JSON.parse(saved)
        setMidiState((prev) => {
          const next = { ...prev }
          Object.keys(parsed).forEach((id) => {
            if (next[id as MixoControlId]) {
              next[id as MixoControlId] = { ...next[id as MixoControlId] }
              BANKS.forEach((b) => {
                if (parsed[id]?.[b]) next[id as MixoControlId][b] = { ...next[id as MixoControlId][b], ...parsed[id][b] }
              })
            }
          })
          return next
        })
      }
      setMasterSelector(localStorage.getItem('mixo-master') === '1')
    } catch (_) { /**/ }
  }, [])

  const tint = embeddedTint || T.accent
  const cfg = selected ? midiState[selected][bank] : null
  const behaviors = selected && isMixoPad(selected) ? MIXO_PAD_BEHAVIORS : MIXO_ENCODER_BEHAVIORS
  const paramLabel = cfg ? MIXO_PARAM_LABELS[cfg.behavior] : null

  // ── Escena 3D ─────────────────────────────────────────────────
  // En modo ecosistema el sceneSlot es un contenedor flex compartido: cada
  // dispositivo es un flex child (flex: 1 1 0) para repartir el ancho a partes
  // iguales. Standalone ocupa todo el espacio.
  const sceneNode = portalMode ? (
    <div onPointerDownCapture={onActivate} style={{ flex: '1 1 0', minWidth: 0, height: '100%', position: 'relative' }}>
      <MixoScene ref={sceneRef} selectedId={selected} onSelect={selectCtrl} />
    </div>
  ) : (
    <div style={{ width: '100%', height: '100%', minHeight: 0 }}>
      <MixoScene ref={sceneRef} selectedId={selected} onSelect={selectCtrl} />
    </div>
  )

  // ── Panel ─────────────────────────────────────────────────────
  const panelNode = (
    <div style={{ display: active === false ? 'none' : 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: ECO.fontBody, color: T.text }}>
      {/* Barra superior */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${ECO.line}`, flexWrap: 'wrap' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? tint : '#FF6B57', boxShadow: connected ? `0 0 8px ${tint}` : undefined }} />
        <span style={{ fontFamily: ECO.fontMono, fontSize: 11, color: T.sub, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusText}</span>
        {outputList.length > 0 && (
          <select value={selectedOutputIdx ?? ''} onChange={(e) => handleOutputChange(e.target.value === '' ? null : parseInt(e.target.value))}
            style={{ fontFamily: ECO.fontMono, background: '#1A1A20', color: T.text, border: `1px solid ${ECO.line}`, borderRadius: 6, padding: '5px 8px', fontSize: 11 }}>
            <option value="">Sin salida MIDI</option>
            {outputList.map((o) => <option key={o.idx} value={o.idx}>{o.name}</option>)}
          </select>
        )}
        <button onClick={() => setLogOpen((v) => !v)}
          style={{ fontFamily: ECO.fontMono, fontSize: 11, background: logOpen ? T.accentSoft : '#1A1A20', color: logOpen ? tint : T.sub, border: `1px solid ${logOpen ? tint : ECO.line}`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>Consola</button>
        <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
          {BANKS.map((b) => (
            <button key={b} onClick={() => setBank(b)}
              style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${b === bank ? tint : ECO.line}`, background: b === bank ? tint : '#1A1A20', color: b === bank ? '#0E0E10' : T.text, fontWeight: 700, fontFamily: ECO.fontMono, fontSize: 12, cursor: 'pointer' }}>{b}</button>
          ))}
        </div>
      </div>

      {/* Lista de controles */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        <SectionLabel>KNOBS</SectionLabel>
        {(['k0', 'k1', 'k2', 'k3'] as MixoControlId[]).map((id) => (
          <ControlRow key={id} id={id} cfg={midiState[id][bank]} selected={selected === id} tint={tint} onSelect={() => selectCtrl(id)} />
        ))}
        <SectionLabel>FADERS</SectionLabel>
        {(['f0', 'f1', 'f2', 'f3'] as MixoControlId[]).map((id) => (
          <ControlRow key={id} id={id} cfg={midiState[id][bank]} selected={selected === id} tint={tint} onSelect={() => selectCtrl(id)} />
        ))}
        <SectionLabel>PADS (LED)</SectionLabel>
        {(['p0', 'p1', 'p2', 'p3'] as MixoControlId[]).map((id) => (
          <ControlRow key={id} id={id} cfg={midiState[id][bank]} selected={selected === id} tint={tint} onSelect={() => selectCtrl(id)} />
        ))}
      </div>

      {/* Editor del control seleccionado */}
      {selected && cfg && (
        <div style={{ borderTop: `1px solid ${ECO.line}`, padding: '14px 18px', flexShrink: 0, background: 'rgba(255,159,67,0.04)', maxHeight: '52%', overflowY: 'auto' }}>
          <div style={{ fontFamily: ECO.fontMono, fontSize: 10, letterSpacing: '0.18em', color: tint, textTransform: 'uppercase' }}>
            Control seleccionado · Banco {bank}
          </div>
          <h2 style={{ fontFamily: ECO.fontDisplay, fontSize: 20, fontWeight: 800, letterSpacing: '0.05em', margin: '4px 0 14px', color: T.text }}>
            {mixoLabelFor(selected)}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <Field label="Etiqueta">
              <input type="text" maxLength={12} value={cfg.label} onChange={(e) => updateCfg(selected, bank, { label: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Tipo">
              <select value={cfg.type} onChange={(e) => updateCfg(selected, bank, { type: e.target.value as 'cc' | 'note' })} style={inputStyle}>
                <option value="cc">CC</option>
                <option value="note">Note</option>
              </select>
            </Field>
            <Field label={cfg.type === 'cc' ? 'CC #' : 'Note #'}>
              <input type="number" min={0} max={127} value={cfg.num} onChange={(e) => updateCfg(selected, bank, { num: clamp(+e.target.value, 0, 127) })} style={inputStyle} />
            </Field>
            <Field label="Canal">
              <input type="number" min={1} max={16} value={cfg.chan} onChange={(e) => updateCfg(selected, bank, { chan: clamp(+e.target.value, 1, 16) })} style={inputStyle} />
            </Field>
          </div>

          {/* Comportamiento */}
          <div style={{ fontFamily: ECO.fontMono, fontSize: 9, color: ECO.dim, letterSpacing: '0.1em', marginBottom: 6 }}>COMPORTAMIENTO</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {behaviors.map((bh) => (
              <button key={bh.id} onClick={() => updateCfg(selected, bank, { behavior: bh.id })} title={bh.info}
                style={{ fontFamily: ECO.fontMono, fontSize: 11, padding: '6px 10px', borderRadius: 7, cursor: 'pointer',
                  background: cfg.behavior === bh.id ? tint : '#1A1A20', color: cfg.behavior === bh.id ? '#0E0E10' : T.sub,
                  border: `1px solid ${cfg.behavior === bh.id ? tint : ECO.line}` }}>
                {bh.icon} {bh.name}
              </button>
            ))}
          </div>

          {paramLabel && (
            <Field label={paramLabel}>
              <input type="range" min={0} max={100} value={cfg.param} onChange={(e) => updateCfg(selected, bank, { param: +e.target.value })} style={{ width: '100%' }} />
            </Field>
          )}

          {/* Rango de salida */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <Field label="Mín">
              <input type="number" min={0} max={127} value={cfg.velMin} onChange={(e) => updateCfg(selected, bank, { velMin: clamp(+e.target.value, 0, 127) })} style={inputStyle} />
            </Field>
            <Field label="Máx">
              <input type="number" min={0} max={127} value={cfg.velMax} onChange={(e) => updateCfg(selected, bank, { velMax: clamp(+e.target.value, 0, 127) })} style={inputStyle} />
            </Field>
          </div>

          {/* Master selector (fader 4) */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontFamily: ECO.fontMono, fontSize: 11, color: T.sub, cursor: 'pointer' }}>
            <input type="checkbox" checked={masterSelector} onChange={(e) => setMasterSelector(e.target.checked)} />
            Fader 4 como selector de banco
          </label>

          {/* Guardar en dispositivo */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <button onClick={saveToDevice} style={actionBtn(tint)}>Guardar en dispositivo</button>
            <button onClick={handleFactoryReset} style={{ ...actionBtn('#FF6B57'), borderColor: '#FF6B57', color: '#FF6B57', background: 'rgba(255,107,87,0.1)' }}>Reset fabrica</button>
          </div>
          {deviceSaveStatus && (
            <p style={{ fontFamily: ECO.fontMono, fontSize: 11, color: T.sub, marginTop: 10, lineHeight: 1.5 }}>{deviceSaveStatus}</p>
          )}
          {deviceSaveProgress !== null && (
            <div style={{ width: '100%', height: 4, background: '#1A1A20', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: `${deviceSaveProgress}%`, height: '100%', background: tint, borderRadius: 2, transition: 'width 0.3s ease' }} />
            </div>
          )}
        </div>
      )}

      {/* Consola */}
      {logOpen && (
        <div ref={logRef} style={{ maxHeight: 140, overflowY: 'auto', borderTop: `1px solid ${ECO.line}`, padding: '8px 14px', fontFamily: ECO.fontMono, fontSize: 10, color: T.sub, background: '#08080A' }}>
          {logEntries.map((e, i) => <div key={i} style={{ margin: '1px 0' }}>{e}</div>)}
        </div>
      )}
    </div>
  )

  if (portalMode) {
    return (
      <>
        {sceneSlot && createPortal(sceneNode, sceneSlot)}
        {panelSlot && createPortal(panelNode, panelSlot)}
      </>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', gridTemplateColumns: '1.5fr 1fr', background: ECO.void, color: ECO.text }}>
      <StarfieldBackground />
      <div style={{ position: 'relative', zIndex: 1, minHeight: 0 }}>{sceneNode}</div>
      <div style={{ position: 'relative', zIndex: 1, minHeight: 0, borderLeft: `1px solid ${ECO.line}`, background: 'rgba(19,19,24,0.6)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${T.accent}, #FF6A3D)`, flexShrink: 0 }} />
        {panelNode}
      </div>
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: ECO.fontMono, fontSize: 9, letterSpacing: '0.22em', color: ECO.dim, padding: '10px 0 4px', textTransform: 'uppercase' }}>{children}</div>
)

const ControlRow: React.FC<{ id: MixoControlId; cfg: MixoControlConfig; selected: boolean; tint: string; onSelect: () => void }> = ({ id, cfg, selected, tint, onSelect }) => (
  <div onClick={onSelect} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 3, background: selected ? `rgba(${hexToRgb(tint)},0.12)` : 'transparent', border: `1px solid ${selected ? tint : 'transparent'}`, transition: 'all .12s' }}>
    <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: selected ? tint : ECO.surface, border: `1px solid ${selected ? tint : ECO.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ECO.fontMono, fontSize: 9, fontWeight: 700, color: selected ? '#000' : ECO.dim }}>
      {id.toUpperCase()}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: ECO.fontBody, fontSize: 12, color: ECO.text, fontWeight: selected ? 600 : 400 }}>{cfg.label || mixoLabelFor(id)}</div>
      <div style={{ fontFamily: ECO.fontMono, fontSize: 10, color: ECO.dim, marginTop: 1 }}>{cfg.type.toUpperCase()} {cfg.num} · ch {cfg.chan} · {cfg.behavior}</div>
    </div>
  </div>
)

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontFamily: ECO.fontMono, fontSize: 9, color: ECO.dim, letterSpacing: '0.1em' }}>{label}</span>
    {children}
  </label>
)

const inputStyle: React.CSSProperties = {
  background: ECO.surface, border: `1px solid ${ECO.line}`, color: ECO.text, borderRadius: 6,
  padding: '5px 8px', fontSize: 12, fontFamily: ECO.fontMono, outline: 'none', width: '100%', boxSizing: 'border-box',
}

const actionBtn = (color: string): React.CSSProperties => ({
  flex: 1, minWidth: 120, padding: '9px 12px', background: 'transparent', border: `1px solid ${color}`,
  color, fontFamily: ECO.fontMono, fontSize: 11, borderRadius: 7, cursor: 'pointer', letterSpacing: '0.04em',
})

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

export default MixoEditorPage
