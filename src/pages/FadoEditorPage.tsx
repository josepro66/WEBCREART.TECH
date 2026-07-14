/**
 * FadoEditorPage.tsx — Editor MIDI del FADO (8 faders) con vista 3D.
 *
 * Logica portada del Control Studio HTML. Soporta 3 bancos (A/B/C),
 * 5 comportamientos (directo, inercia, espejo, random, oscila),
 * SysEx save/factory-reset, y config de CC/canal/rango por fader.
 *
 * Pensado para integrarse al ecosistema unificado: cuando se monta en
 * portalMode, su escena 3D va al sceneSlot y su panel de configuracion
 * al panelSlot del UnifiedEditorPage. Stand-alone tambien funciona.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import StarfieldBackground from '../configurator/components/StarfieldBackground'
import FadoScene, { type FadoSceneHandle } from '../fado-editor/FadoScene'
import {
  type Bank,
  type FadoControlId,
  type FadoControlState,
  type FadoControlConfig,
  BANKS,
  makeFadoInitialState,
  fadoLabelFor,
  ALL_FADO_CONTROL_IDS,
  FADO_CCS_BY_BANK,
  FADO_CHANNEL,
  FADO_BANK_CC,
  FADO_TOUCH_SELECT_CC,
  FADO_MASTER_CC,
  FADER_BEHAVIORS,
  PARAM_LABELS,
} from '../fado-editor/fadoControlState'

const P = {
  bg: '#0A0A0C',
  border: '#2A2A32',
  text: '#E8E6E0',
  sub: '#7A7870',
  accent: '#B07CFF',
  accentSoft: 'rgba(176,124,255,0.15)',
}

// ── SysEx constants (espejo del firmware FADO) ──────────────────
const MANUFACTURER_ID = 0x7d
const DEVICE_ID_FADO = 0x11        // distinto al Beato16 (0x10)
const CMD_PRESET_DATA_BEGIN = 0x20
const CMD_PRESET_DATA_CHUNK = 0x21
const CMD_PRESET_DATA_END   = 0x22
const CMD_ACK        = 0x30
const CMD_WRITE_OK   = 0x32
const N_BANKS_FW = 3
const N_FADERS_FW = 8
// v3 fado (FADO_8.ino): magic(1) version(1) flags(1) + 3 bancos x 8 faders x
// 6 bytes (num, packed, behavior, param, velMin, velMax) + crc(1) = 148
const PRESET_BINARY_SIZE = 3 + N_BANKS_FW * N_FADERS_FW * 6 + 1
const PRESET_MAGIC = 0xf8
const FORMAT_VERSION = 3
const BEHAVIOR_IDS: Record<string, number> = {
  directo: 0, inercia: 1, espejo: 2, random: 3, oscila: 4,
}

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
  return t === 'cc' ? 1 : t === 'pb' ? 3 : 0
}

function packControlByte(type: number, channel: number, mode: number): number {
  const bit7 = type & 0x01
  const bit0 = (type >> 1) & 0x01
  return (bit7 << 7) | ((channel & 0x0f) << 3) | ((mode & 0x01) << 2) | bit0
}

// ── Engine state para comportamientos ─────────────────────────────
interface EngineEntry {
  value: number
  target: number
  phase: number
}

function makeEngines(): Record<FadoControlId, Record<Bank, EngineEntry>> {
  const out = {} as Record<FadoControlId, Record<Bank, EngineEntry>>
  for (const id of ALL_FADO_CONTROL_IDS) {
    out[id] = {} as Record<Bank, EngineEntry>
    for (const b of BANKS) {
      out[id][b] = { value: 0, target: 0, phase: 0 }
    }
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

const FadoEditorPage: React.FC<Props> = ({
  embedded, embeddedTitle, embeddedTint, sceneSlot, panelSlot, active, onActivate,
}) => {
  const portalMode = typeof onActivate === 'function'
  const [midiState, setMidiState] = useState<FadoControlState>(makeFadoInitialState)
  const [bank, setBank] = useState<Bank>('A')
  const [selected, setSelected] = useState<FadoControlId | null>(null)
  const [connected, setConnected] = useState(false)
  const [statusText, setStatusText] = useState('Buscando Fado...')
  // Master selector: fader 8 (fader8) actúa como selector de banco (opcional).
  const [masterSelector, setMasterSelector] = useState(false)
  const masterSelectorRef = useRef(false)
  useEffect(() => { masterSelectorRef.current = masterSelector }, [masterSelector])
  const sceneRef = useRef<FadoSceneHandle>(null)

  // MIDI I/O
  const midiAccessRef = useRef<MIDIAccess | null>(null)
  const midiInputRef = useRef<MIDIInput | null>(null)
  const midiOutputRef = useRef<MIDIOutput | null>(null)
  const [outputList, setOutputList] = useState<{ idx: number; name: string }[]>([])
  const [selectedOutputIdx, setSelectedOutputIdx] = useState<number | null>(null)

  // Save to device
  const [deviceSaveStatus, setDeviceSaveStatus] = useState('')
  const [deviceSaveProgress, setDeviceSaveProgress] = useState<number | null>(null)
  const pendingResponseRef = useRef<((r: { command: number | null; payload?: Uint8Array; timedOut: boolean }) => void) | null>(null)
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Engine
  const enginesRef = useRef(makeEngines())
  const midiStateRef = useRef(midiState)
  const bankRef = useRef(bank)
  const selectedRef = useRef(selected)
  useEffect(() => { midiStateRef.current = midiState }, [midiState])
  useEffect(() => { bankRef.current = bank }, [bank])
  useEffect(() => { selectedRef.current = selected }, [selected])

  // Ref estable a onActivate para llamarlo desde el handler MIDI sin
  // reinstalar onmidimessage cada vez que el padre re-renderiza.
  const onActivateRef = useRef(onActivate)
  useEffect(() => { onActivateRef.current = onActivate }, [onActivate])

  // Log
  const [logEntries, setLogEntries] = useState<string[]>(['// Esperando conexion Web MIDI...'])
  const [logOpen, setLogOpen] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const logRef = useRef<HTMLDivElement>(null)

  const selectCtrl = (id: FadoControlId) => {
    setSelected(id)
    onActivate?.()
  }

  // ── Log helper ────────────────────────────────────────────────
  const log = useCallback((text: string) => {
    setLogEntries((prev) => {
      const next = [...prev, text]
      return next.length > 60 ? next.slice(-60) : next
    })
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logEntries])

  // ── MIDI send helpers ─────────────────────────────────────────
  const sendMidiFromBank = useCallback((id: FadoControlId, b: Bank, rawValue: number) => {
    const out = midiOutputRef.current
    if (!out) return
    const s = midiStateRef.current[id][b]
    const chan = (s.chan - 1) & 0x0f
    if (s.type === 'pb') {
      const bend = Math.max(0, Math.min(127, Math.round(rawValue))) * 128
      out.send([0xe0 | chan, bend & 0x7f, (bend >> 7) & 0x7f])
    } else {
      out.send([0xb0 | chan, s.num, Math.max(0, Math.min(127, Math.round(rawValue)))])
    }
  }, [])

  // ── Behavior engine (inercia + oscila tick) ───────────────────
  const lastTimeRef = useRef(performance.now())

  useEffect(() => {
    let animId: number
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000)
      lastTimeRef.current = now

      const s = midiStateRef.current
      const engines = enginesRef.current

      for (const id of ALL_FADO_CONTROL_IDS) {
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
            // Move the 3D fader for the current bank
            if (b === bankRef.current) {
              sceneRef.current?.setFaderValue(id, outVal)
            }
          }
        }
      }

      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [sendMidiFromBank])

  // ── MIDI input processing ─────────────────────────────────────
  const processIncoming = useCallback((d1: number, d2: number) => {
    const s = midiStateRef.current
    const engines = enginesRef.current
    const currentBank = bankRef.current

    // CC 116/117/118 -> bank switch
    if (d1 === FADO_BANK_CC.A || d1 === FADO_BANK_CC.B || d1 === FADO_BANK_CC.C) {
      if (d2 > 0) {
        const newBank: Bank = d1 === FADO_BANK_CC.A ? 'A' : d1 === FADO_BANK_CC.B ? 'B' : 'C'
        if (newBank !== currentBank) {
          setBank(newBank)
          log(`Banco cambiado a ${newBank}`)
        }
      }
      return
    }

    // CC 110 -> fader touch select
    if (d1 === FADO_TOUCH_SELECT_CC) {
      if (d2 >= 0 && d2 < 8) {
        const id = ALL_FADO_CONTROL_IDS[d2]
        setSelected(id)
        log(`Touch select: ${fadoLabelFor(id)}`)
      }
      return
    }

    // CC 119 -> master fader (fader8) special
    if (d1 === FADO_MASTER_CC) {
      const id: FadoControlId = 'fader8'
      setSelected(id)
      sceneRef.current?.setFaderValue(id, d2)
      sendMidiFromBank(id, currentBank, d2)
      log(`Master fader → val=${d2}`)
      return
    }

    // Other CCs: match against fader config across all banks
    let matchIdx = -1
    let matchBank: Bank | null = null
    for (let i = 0; i < ALL_FADO_CONTROL_IDS.length && matchIdx === -1; i++) {
      const fid = ALL_FADO_CONTROL_IDS[i]
      for (const b of BANKS) {
        const st = s[fid][b]
        if (st.type === 'cc' && st.num === d1) {
          matchIdx = i
          matchBank = b
          break
        }
      }
    }

    if (matchIdx === -1 || !matchBank) {
      return
    }

    const id = ALL_FADO_CONTROL_IDS[matchIdx]
    const cfg = s[id][matchBank]
    const eng = engines[id][matchBank]
    const isCurrentBank = matchBank === currentBank

    // Apply behavior
    let outVal = d2
    switch (cfg.behavior) {
      case 'espejo':
        outVal = 127 - d2
        break
      case 'inercia':
        eng.target = d2
        outVal = d2
        break
      case 'random':
        outVal = Math.max(0, Math.min(127, d2 + (Math.random() - 0.5) * 2 * cfg.param))
        break
      case 'oscila':
        eng.target = d2
        outVal = d2
        break
      // 'directo': outVal = d2 (no change needed)
    }

    // Auto-switch editor bank to match firmware if CC came from a different bank
    if (!isCurrentBank) {
      setBank(matchBank)
      log(`Auto-switch banco → ${matchBank}`)
    }

    // Always update 3D scene
    const autonomous = cfg.behavior === 'oscila' || cfg.behavior === 'random'
    if (!autonomous) {
      sceneRef.current?.setFaderValue(id, outVal)
    }
    if (cfg.behavior !== 'oscila') {
      setSelected(id)
    }

    sendMidiFromBank(id, matchBank, outVal)
    log(`${fadoLabelFor(id)} (${cfg.behavior}) banco${matchBank} → CC${cfg.num} val=${Math.round(outVal)}`)
  }, [sendMidiFromBank, log])

  // ── SysEx ────────────────────────────────────────────────────
  function waitForResponse(ms = 1500) {
    return new Promise<{ command: number | null; payload?: Uint8Array; timedOut: boolean }>((resolve) => {
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
    out.send([0xf0, MANUFACTURER_ID, DEVICE_ID_FADO, cmd, ...payload, 0xf7])
    return true
  }

  function serializePreset(): number[] {
    const s = midiStateRef.current
    // Header v3: magic, version, flags. Bit0 = master selector (fader 8 como
    // selector de banco). No exponemos ese toggle aún → 0x00.
    const flags = masterSelectorRef.current ? 0x01 : 0x00
    const bytes: number[] = [PRESET_MAGIC, FORMAT_VERSION, flags]
    for (const b of BANKS) {
      for (let i = 0; i < N_FADERS_FW; i++) {
        const id = ALL_FADO_CONTROL_IDS[i]
        const c = s[id][b]
        const paramMax = c.behavior === 'random' ? 127 : 100
        bytes.push(c.num & 0x7f)
        bytes.push(packControlByte(typeToNum(c.type), (c.chan - 1) & 0x0f, 0))
        bytes.push(BEHAVIOR_IDS[c.behavior] ?? 0)
        bytes.push(Math.max(0, Math.min(paramMax, Math.round(c.param))))
        bytes.push(Math.max(0, Math.min(127, Math.round(c.min))))
        bytes.push(Math.max(0, Math.min(127, Math.round(c.max))))
      }
    }
    bytes.push(crc8(bytes))
    if (bytes.length !== PRESET_BINARY_SIZE) throw new Error(`Tamano inesperado: ${bytes.length}`)
    return bytes
  }

  const saveToDevice = useCallback(async () => {
    if (!midiOutputRef.current || !midiInputRef.current) {
      setDeviceSaveStatus('Conecta el Fado (entrada y salida MIDI) antes de guardar.')
      return
    }
    let presetBytes: number[]
    try { presetBytes = serializePreset() }
    catch (e: any) {
      setDeviceSaveStatus('Error preparando datos: ' + e.message)
      return
    }
    setDeviceSaveProgress(0)
    setDeviceSaveStatus('Enviando configuracion al Fado...')
    log(`Iniciando guardado (${presetBytes.length} bytes)`)

    const totalLen = presetBytes.length
    sendSysex(CMD_PRESET_DATA_BEGIN, [totalLen & 0x7f, (totalLen >> 7) & 0x7f])
    let resp = await waitForResponse()
    if (resp.timedOut || resp.command !== CMD_ACK) {
      setDeviceSaveStatus('Sin respuesta del dispositivo.')
      setDeviceSaveProgress(null)
      return
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
      if (!ok) {
        setDeviceSaveStatus(`Fallo en bloque ${idx}. El preset anterior no se modifico.`)
        setDeviceSaveProgress(null)
        return
      }
      setDeviceSaveProgress(Math.round(5 + ((idx + 1) / totalChunks) * 90))
    }

    sendSysex(CMD_PRESET_DATA_END, [])
    resp = await waitForResponse(3000)
    setDeviceSaveProgress(null)
    if (resp.command === CMD_WRITE_OK) {
      setDeviceSaveStatus('Guardado en el Fado. Queda en el hardware aunque lo desconectes.')
      log('Preset escrito en EEPROM exitosamente.')
    } else {
      setDeviceSaveStatus('El firmware no pudo validar el preset.')
    }
  }, [log])

  // ── Save / Load config ────────────────────────────────────────
  const saveConfig = useCallback(async () => {
    const data = JSON.stringify({ state: midiStateRef.current }, null, 2)
    if ((window as any).showSaveFilePicker) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'fado_config.fado',
          types: [{ description: 'Configuracion Fado', accept: { 'application/json': ['.fado', '.json'] } }],
        })
        const w = await handle.createWritable()
        await w.write(data)
        await w.close()
        log('Configuracion guardada: ' + handle.name)
      } catch (e: any) { if (e.name !== 'AbortError') log('Error al guardar: ' + e.message) }
    } else {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
      a.download = 'fado_config.fado'
      a.click()
      log('Configuracion descargada.')
    }
  }, [log])

  const loadConfig = useCallback(async () => {
    const applyFull = (cfg: any) => {
      if (!cfg?.state) return
      setMidiState((prev) => {
        const next = { ...prev }
        Object.keys(cfg.state).forEach((id) => {
          if (next[id as FadoControlId]) {
            next[id as FadoControlId] = { ...next[id as FadoControlId] }
            BANKS.forEach((b) => {
              if (cfg.state[id][b]) next[id as FadoControlId][b] = { ...cfg.state[id][b] }
            })
          }
        })
        return next
      })
      log('Configuracion cargada.')
    }

    if ((window as any).showOpenFilePicker) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'Configuracion Fado', accept: { 'application/json': ['.fado', '.json'] } }],
        })
        const file = await handle.getFile()
        applyFull(JSON.parse(await file.text()))
      } catch (e: any) { if (e.name !== 'AbortError') log('Error al abrir: ' + e.message) }
    } else {
      const input = document.createElement('input')
      input.type = 'file'; input.accept = '.fado,.json'
      input.onchange = async () => {
        try { applyFull(JSON.parse(await input.files![0].text())) }
        catch (e: any) { log('Error al leer archivo: ' + e.message) }
      }
      input.click()
    }
  }, [log])

  // ── Factory reset ─────────────────────────────────────────────
  const handleFactoryReset = useCallback(() => {
    if (!window.confirm('Restablecer todos los valores de fabrica?\n\nEsto borrara toda tu configuracion actual.\nEsta accion no se puede deshacer.')) return
    // Panic: all notes off on all channels
    const out = midiOutputRef.current
    if (out) {
      for (let ch = 0; ch < 16; ch++) {
        out.send([0xb0 | ch, 123, 0])
        out.send([0xb0 | ch, 120, 0])
      }
    }
    try {
      localStorage.removeItem('fado-state')
      localStorage.removeItem('fado-version')
    } catch (_) {}
    setMidiState(makeFadoInitialState())
    setBank('A')
    setSelected(null)
    setDeviceSaveStatus('')
    setDeviceSaveProgress(null)
    log('Valores de fabrica restablecidos.')
  }, [log])

  // ── State update handler ──────────────────────────────────────
  const updateCfg = useCallback(
    (id: FadoControlId, b: Bank, patch: Partial<FadoControlConfig>) => {
      setMidiState((prev) => ({
        ...prev,
        [id]: { ...prev[id], [b]: { ...prev[id][b], ...patch } },
      }))
      // Reset engine on behavior change
      if (patch.behavior) {
        const eng = enginesRef.current[id][b]
        eng.phase = 0; eng.value = 0; eng.target = 0
      }
    },
    []
  )

  // ── MIDI I/O setup ────────────────────────────────────────────
  const isFadoDevice = (name: string | null | undefined) => /fado|fader/i.test(name || '')

  const setupMidiPorts = useCallback((access: MIDIAccess) => {
    const allInputs = Array.from(access.inputs.values())
    const allOutputs = Array.from(access.outputs.values())

    // Prefer inputs whose name matches "fado" / "fader" (como en Control Studio).
    // Si no encuentra ninguno, cae al primero disponible como red de seguridad.
    const firstIn = allInputs.find((p) => isFadoDevice(p.name)) || allInputs[0]
    if (firstIn && firstIn !== midiInputRef.current) {
      midiInputRef.current = firstIn
      firstIn.onmidimessage = (msg: MIDIMessageEvent) => {
        const data = msg.data
        if (!data || data.length < 1) return

        // SysEx response
        if (data[0] === 0xf0) {
          if (data.length >= 4 && data[1] === MANUFACTURER_ID && data[2] === DEVICE_ID_FADO) {
            const command = data[3]
            const payload = data.slice(4, data.length - 1)
            if (pendingResponseRef.current) {
              const resolve = pendingResponseRef.current
              pendingResponseRef.current = null
              if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current)
              resolve({ command, payload, timedOut: false })
            }
          }
          return
        }

        if (data.length < 3) return
        const [statusByte, d1, d2] = data
        const type = statusByte & 0xf0

        if (type === 0xb0) {
          // Mover cualquier control físico del FADO activa este editor
          // en el ecosistema (el menú de la derecha pasa a ser el del FADO).
          onActivateRef.current?.()
          processIncoming(d1, d2)
        }
      }
      setConnected(true)
      setStatusText(firstIn.name || 'Dispositivo MIDI Conectado')
      log('Conectado a: ' + firstIn.name)
    } else if (!firstIn) {
      midiInputRef.current = null
      setConnected(false)
      setStatusText('Fado no detectado. Conectalo y recarga.')
    }

    setOutputList(allOutputs.map((o, idx) => ({ idx, name: o.name })))
    if (allOutputs.length > 0 && midiOutputRef.current === null) {
      const fadoOutIdx = allOutputs.findIndex((p) => isFadoDevice(p.name))
      const useIdx = fadoOutIdx >= 0 ? fadoOutIdx : 0
      midiOutputRef.current = allOutputs[useIdx]
      setSelectedOutputIdx(useIdx)
    }
  }, [processIncoming, log])

  useEffect(() => {
    const nav = navigator as any
    if (!nav.requestMIDIAccess) {
      setStatusText('Web MIDI no soportado (usa Chrome/Edge)')
      return
    }
    nav.requestMIDIAccess({ sysex: true })
      .then((access: MIDIAccess) => {
        midiAccessRef.current = access
        setupMidiPorts(access)
        access.addEventListener('statechange', () => setupMidiPorts(access))
      })
      .catch((err: Error) => {
        setStatusText('Error MIDI: ' + err.message)
        log('Error MIDI: ' + err.message)
      })
  }, [setupMidiPorts, log])

  const handleOutputChange = useCallback((idx: number | null) => {
    setSelectedOutputIdx(idx)
    if (idx === null) { midiOutputRef.current = null; return }
    const access = midiAccessRef.current
    if (!access) return
    const outputs = Array.from(access.outputs.values())
    midiOutputRef.current = outputs[idx] || null
    log('Salida MIDI: ' + (midiOutputRef.current?.name || 'ninguna'))
  }, [log])

  // ── localStorage auto-save ────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      try {
        localStorage.setItem('fado-state', JSON.stringify(midiStateRef.current))
        localStorage.setItem('fado-version', '3')
      } catch (_) {}
    }, 2000)
    return () => clearInterval(id)
  }, [])

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      if (localStorage.getItem('fado-version') !== '3') return
      const savedState = localStorage.getItem('fado-state')
      if (savedState) {
        const parsed = JSON.parse(savedState)
        setMidiState((prev) => {
          const next = { ...prev }
          Object.keys(parsed).forEach((id) => {
            if (next[id as FadoControlId]) {
              next[id as FadoControlId] = { ...next[id as FadoControlId] }
              BANKS.forEach((b) => {
                if (parsed[id]?.[b]) next[id as FadoControlId][b] = { ...next[id as FadoControlId][b], ...parsed[id][b] }
              })
            }
          })
          return next
        })
      }
    } catch (_) {}
  }, [])

  const tint = embeddedTint || P.accent

  const sceneEl = (
    <FadoScene
      ref={sceneRef}
      selectedId={selected}
      onSelect={selectCtrl}
      midiState={midiState}
      bank={bank}
      showLabels={showLabels}
    />
  )

  const cfg = selected ? midiState[selected][bank] : null
  const selectedBehavior = cfg ? FADER_BEHAVIORS.find((b) => b.id === cfg.behavior) : null
  const paramLabel = cfg ? PARAM_LABELS[cfg.behavior] : null

  const panelEl = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, color: P.text, fontFamily: 'Inter, sans-serif' }}>
      {/* Barra superior compacta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${P.border}`, background: 'rgba(14,14,16,0.6)', flexWrap: 'wrap' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? tint : '#FF6B57', boxShadow: connected ? `0 0 8px ${tint}` : undefined }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.sub, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusText}</span>

        {/* Output selector */}
        {outputList.length > 0 && (
          <select
            value={selectedOutputIdx ?? ''}
            onChange={(e) => handleOutputChange(e.target.value === '' ? null : parseInt(e.target.value))}
            style={{ fontFamily: 'JetBrains Mono, monospace', background: '#1A1A20', color: P.text, border: `1px solid ${P.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 11 }}
          >
            <option value="">Sin salida MIDI</option>
            {outputList.map((o) => <option key={o.idx} value={o.idx}>{o.name}</option>)}
          </select>
        )}

        {/* Labels toggle */}
        <button
          onClick={() => setShowLabels((v) => !v)}
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, background: showLabels ? 'rgba(57,255,20,0.15)' : '#1A1A20', color: showLabels ? '#39ff14' : P.sub, border: `1px solid ${showLabels ? '#39ff14' : P.border}`, borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}
        >MAP</button>

        {/* Console toggle */}
        <button
          onClick={() => setLogOpen((v) => !v)}
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, background: logOpen ? `${P.accentSoft}` : '#1A1A20', color: logOpen ? tint : P.sub, border: `1px solid ${logOpen ? tint : P.border}`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}
        >Consola</button>

        {/* Bank selector */}
        <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
          {BANKS.map((b) => {
            const act = b === bank
            return (
              <button key={b} onClick={() => setBank(b)}
                style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${act ? tint : P.border}`, background: act ? tint : '#1A1A20', color: act ? '#0E0E10' : P.text, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, cursor: 'pointer' }}>
                {b}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        {!selected ? (
          <div style={{ display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center', marginTop: 56 }}>
            <div
              style={{
                width: 46, height: 46, borderRadius: 12,
                border: `1px dashed ${tint}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: tint, fontSize: 18,
              }}
            >◉</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: '#D8DBE0', textTransform: 'uppercase' }}>
              Selecciona un fader
            </div>
            <div style={{ color: '#8A919E', fontSize: 12.5, lineHeight: 1.6, maxWidth: 260 }}>
              Haz clic en un fader del modelo 3D — o muévelo en el hardware — para configurar su ruteo MIDI.
            </div>
          </div>
        ) : cfg && (
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: tint, textTransform: 'uppercase', margin: 0 }}>
              Control seleccionado &middot; Banco {bank}
            </p>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '0.06em', margin: '4px 0 18px', color: P.text }}>
              {fadoLabelFor(selected)}
            </h2>

            {/* Etiqueta */}
            <Field label="Etiqueta">
              <input
                type="text"
                value={cfg.label}
                onChange={(e) => updateCfg(selected, bank, { label: e.target.value })}
                maxLength={20}
                style={inputStyle}
                placeholder="ej: Cutoff"
              />
            </Field>

            {/* Tipo */}
            <Field label="Tipo MIDI">
              <select
                value={cfg.type}
                onChange={(e) => updateCfg(selected, bank, { type: e.target.value as 'cc' | 'pb' })}
                style={inputStyle}
              >
                <option value="cc">CC (Control Change)</option>
                <option value="pb">PB (Pitch Bend)</option>
              </select>
            </Field>

            {/* CC# y Canal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {cfg.type === 'cc' && (
                <Field label="CC #">
                  <input
                    type="number" min={0} max={127}
                    value={cfg.num}
                    onChange={(e) => updateCfg(selected, bank, { num: clamp(Number(e.target.value), 0, 127) })}
                    style={inputStyle}
                  />
                </Field>
              )}
              <Field label="Canal">
                <input
                  type="number" min={1} max={16}
                  value={cfg.chan}
                  onChange={(e) => updateCfg(selected, bank, { chan: clamp(Number(e.target.value), 1, 16) })}
                  style={inputStyle}
                />
              </Field>
            </div>

            {/* Rango min/max */}
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', color: P.sub, textTransform: 'uppercase', margin: '14px 0 6px' }}>
              Rango de salida
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Min">
                <input
                  type="number" min={0} max={127}
                  value={cfg.min}
                  onChange={(e) => updateCfg(selected, bank, { min: clamp(Number(e.target.value), 0, 127) })}
                  style={inputStyle}
                />
              </Field>
              <Field label="Max">
                <input
                  type="number" min={0} max={127}
                  value={cfg.max}
                  onChange={(e) => updateCfg(selected, bank, { max: clamp(Number(e.target.value), 0, 127) })}
                  style={inputStyle}
                />
              </Field>
            </div>

            {/* Behavior selector */}
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', color: P.sub, textTransform: 'uppercase', margin: '14px 0 6px' }}>
              Comportamiento
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {FADER_BEHAVIORS.map((bh) => {
                const act = cfg.behavior === bh.id
                return (
                  <button
                    key={bh.id}
                    onClick={() => updateCfg(selected, bank, { behavior: bh.id })}
                    title={bh.info.replace(/\n/g, ' ')}
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      fontWeight: act ? 700 : 400,
                      background: act ? `${P.accentSoft}` : '#1A1A20',
                      color: act ? tint : P.sub,
                      border: `1px solid ${act ? tint : P.border}`,
                      borderRadius: 7,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {bh.icon} {bh.name}
                  </button>
                )
              })}
            </div>

            {/* Behavior info text */}
            {selectedBehavior && (
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.sub, lineHeight: 1.5, margin: '0 0 10px', whiteSpace: 'pre-line' }}>
                {selectedBehavior.desc}
              </p>
            )}

            {/* Behavior param slider */}
            {paramLabel && (
              <Field label={paramLabel}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="range" min={0} max={100}
                    value={cfg.param}
                    onChange={(e) => updateCfg(selected, bank, { param: Number(e.target.value) })}
                    style={{ flex: 1, accentColor: tint }}
                  />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.sub, width: 32, textAlign: 'right' }}>{cfg.param}</span>
                </div>
              </Field>
            )}

            {/* Test button */}
            <button
              onClick={() => sceneRef.current?.setFaderValue(selected, 64)}
              style={{
                marginTop: 14,
                width: '100%',
                padding: '10px 14px',
                background: P.accentSoft,
                border: `1px solid ${tint}`,
                color: tint,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: 7,
                cursor: 'pointer',
              }}
            >
              Probar &rarr; mover fader al centro
            </button>

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${P.border}`, margin: '18px 0' }} />

            {/* Save / Load / Device buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={saveConfig} style={actionBtnStyle(tint)}>Guardar config</button>
              <button onClick={loadConfig} style={actionBtnStyle(tint)}>Cargar config</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <button onClick={saveToDevice} style={actionBtnStyle(tint)}>Guardar en dispositivo</button>
              <button onClick={handleFactoryReset} style={{ ...actionBtnStyle('#FF6B57'), borderColor: '#FF6B57', color: '#FF6B57', background: 'rgba(255,107,87,0.1)' }}>Reset fabrica</button>
            </div>

            {/* Save status */}
            {deviceSaveStatus && (
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.sub, marginTop: 10, lineHeight: 1.5 }}>
                {deviceSaveStatus}
              </p>
            )}
            {deviceSaveProgress !== null && (
              <div style={{ width: '100%', height: 4, background: '#1A1A20', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: `${deviceSaveProgress}%`, height: '100%', background: tint, borderRadius: 2, transition: 'width 0.3s ease' }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // ── Console overlay ───────────────────────────────────────────
  const consoleEl = logOpen && (
    <div style={{ position: 'fixed', bottom: 20, right: 20, width: 340, maxHeight: 280, background: '#18181B', border: `1px solid ${P.border}`, borderRadius: 14, display: 'flex', flexDirection: 'column', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${P.border}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.sub }}>
        <span>Consola MIDI &middot; Fado</span>
        <button onClick={() => setLogOpen(false)} style={{ background: 'none', border: 'none', color: P.sub, cursor: 'pointer', fontSize: 16 }}>&times;</button>
      </div>
      <div ref={logRef} style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.sub, overflowY: 'auto', flex: 1 }}>
        {logEntries.map((e, i) => <p key={i} style={{ margin: '2px 0' }}>{e}</p>)}
      </div>
    </div>
  )

  // ── Modo ecosistema: portal a sceneSlot + panelSlot ──
  if (portalMode) {
    return (
      <>
        {sceneSlot && createPortal(
          <div
            onPointerDownCapture={onActivate}
            style={{ flex: '1 1 0', minWidth: 0, height: '100%', position: 'relative', background: 'transparent' }}
          >
            {/* La identificación del dispositivo la pinta el EcosystemDock
                (placa bajo el modelo) — aquí solo va la escena 3D */}
            <div style={{ width: '100%', height: '100%' }}>{sceneEl}</div>
          </div>,
          sceneSlot
        )}
        {active && panelSlot && createPortal(panelEl, panelSlot)}
        {active && consoleEl && createPortal(consoleEl, document.body)}
      </>
    )
  }

  // ── Modo stand-alone ──
  return (
    <div
      style={{
        ...(embedded
          ? { position: 'relative', width: '100%', height: '100%', display: 'grid' }
          : { position: 'fixed', inset: 0, display: 'grid' }),
        color: P.text,
        fontFamily: 'Inter, sans-serif',
        gridTemplateColumns: '1.4fr 1fr',
        background: P.bg,
        minHeight: 0,
      }}
    >
      <StarfieldBackground />
      <div style={{ position: 'relative', minHeight: 0, minWidth: 0, background: 'transparent' }}>
        {sceneEl}
      </div>
      <div style={{ borderLeft: `1px solid ${P.border}`, background: 'rgba(18,18,22,0.85)', display: 'flex', flexDirection: 'column' }}>
        {panelEl}
      </div>
      {consoleEl}
    </div>
  )
}

// ── Helpers UI ──
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em', color: P.sub, textTransform: 'uppercase', marginBottom: 4 }}>
      {label}
    </div>
    {children}
  </div>
)

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1A1A20',
  border: `1px solid ${P.border}`,
  borderRadius: 6,
  padding: '7px 9px',
  color: P.text,
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 12,
  boxSizing: 'border-box',
}

function actionBtnStyle(tint: string): React.CSSProperties {
  return {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: 'rgba(176,124,255,0.08)',
    border: `1px solid ${tint}`,
    color: tint,
    borderRadius: 7,
    padding: '8px 12px',
    cursor: 'pointer',
  }
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

export default FadoEditorPage
