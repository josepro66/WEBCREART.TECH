/**
 * MidiEditor3DPage.tsx — Editor MIDI del BEATO16 con vista 3D interactiva.
 * Funcionalidad portada del HTML standalone creart-beato16-fixed.html.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import Beato16Scene from '../midi-editor/Beato16Scene'
import ConfigPanel, { type CustomShiftKey } from '../midi-editor/ConfigPanel'
import StarfieldBackground from '../configurator/components/StarfieldBackground'
import {
  type Bank,
  type ControlId,
  BANKS,
  ALL_CONTROL_IDS,
  makeInitialState,
  isPad,
  labelFor,
} from '../midi-editor/midiState'
import {
  DAWS,
  DAW_PRESETS,
  DAW_ACTIONS,
  SHIFT_ACTION_IDS,
  shortcutLabel,
  isMac,
} from '../midi-editor/dawData'

// ── SysEx constants (espejo exacto del firmware) ──────────────────
const MANUFACTURER_ID = 0x7d
const DEVICE_ID = 0x10
const CMD_PRESET_DATA_BEGIN = 0x20
const CMD_PRESET_DATA_CHUNK = 0x21
const CMD_PRESET_DATA_END   = 0x22
const CMD_ACK        = 0x30
const CMD_NACK       = 0x31
const CMD_WRITE_OK   = 0x32
const CMD_WRITE_FAILED = 0x33
const PRESET_MAGIC   = 0xb1
const FORMAT_VERSION = 4 // sincronizado con Beato16_v4.ino (v4: canal único 4)
const N_BANKS_FW = 3, N_PADS_FW = 16, N_ENCODERS_FW = 5
// v3: 6 bytes/control (num, packed, behavior, param, velMin, velMax)
const PRESET_BINARY_SIZE = 2 + N_BANKS_FW * (N_PADS_FW + N_ENCODERS_FW) * 6 + N_PADS_FW + 1
const BEHAVIOR_IDS: Record<string, number> = {
  directo: 0, inercia: 1, espejo: 2, random: 3, oscila: 4, retrigger: 5, rafaga: 6,
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
  return t === 'cc' ? 1 : t === 'pc' ? 2 : t === 'pb' ? 3 : 0
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
  retrigActive: boolean
}

function makeEngines(): Record<string, Record<Bank, EngineEntry>> {
  const out: Record<string, Record<Bank, EngineEntry>> = {}
  for (const id of ALL_CONTROL_IDS) {
    out[id] = {} as Record<Bank, EngineEntry>
    for (const b of BANKS) {
      out[id][b] = { value: 0, target: 0, phase: 0, retrigActive: false }
    }
  }
  return out
}

function isCrartDevice(name: string): boolean {
  // El FADO tambien puede llevar "creart" en el nombre — hay que excluirlo
  // aqui para que el editor del Beato no se enganche a su puerto MIDI.
  if (/fado|fader/i.test(name)) return false
  return /beato|creart|arduino/i.test(name)
}

// Mapeo hardware → id lógico de pads
const PHYSICAL_NOTE_ARDUINO: Record<number, ControlId> = {
  120: 'c0', 121: 'c1', 122: 'c2', 123: 'c3',
}

const MidiEditor3DPage: React.FC<{
  embedded?: boolean
  embeddedTitle?: string
  embeddedTint?: string
  // Modo ecosistema (portales): el shell provee los contenedores y el estado activo.
  sceneSlot?: HTMLElement | null
  panelSlot?: HTMLElement | null
  active?: boolean
  onActivate?: () => void
}> = ({ embedded, embeddedTitle, embeddedTint, sceneSlot, panelSlot, active, onActivate }) => {
  const portalMode = typeof onActivate === 'function'
  const [midiState, setMidiState] = useState(makeInitialState)
  const [bank, setBank] = useState<Bank>('A')
  const [selected, setSelected] = useState<ControlId | null>(null)

  // Ref estable a onActivate para que el handler MIDI pueda activar este
  // editor sin reinstalar onmidimessage en cada re-render del padre.
  const onActivateRef = useRef(onActivate)
  useEffect(() => { onActivateRef.current = onActivate }, [onActivate])

  // MIDI I/O
  const midiAccessRef   = useRef<MIDIAccess | null>(null)
  const midiInputRef    = useRef<MIDIInput | null>(null)
  const midiOutputRef   = useRef<MIDIOutput | null>(null)
  const [connected, setConnected]     = useState(false)
  const [statusText, setStatusText]   = useState('Buscando dispositivo MIDI...')
  const [outputList, setOutputList]   = useState<{ idx: number; name: string }[]>([])
  const [selectedOutputIdx, setSelectedOutputIdx] = useState<number | null>(null)

  // Shift state
  const [shiftHeld, setShiftHeld]               = useState(false)
  const [shiftConfigSticky, setShiftConfigSticky] = useState(false)
  const [stickyPad, setStickyPad]               = useState<ControlId | null>(null)
  const shiftHeldRef        = useRef(false)
  const shiftConfigStickyRef = useRef(false)
  const stickyPadRef        = useRef<ControlId | null>(null)
  const padDuringShiftRef   = useRef(false)

  // Shift actions
  const [shiftActions, setShiftActions] = useState<Record<string, string>>(() => {
    const a: Record<string, string> = {}
    for (let i = 0; i < 16; i++) a['p' + i] = 'none'
    return a
  })
  const [customShiftKeys, setCustomShiftKeys] = useState<Record<string, CustomShiftKey>>({})
  const shiftActionsRef    = useRef(shiftActions)
  const customShiftKeysRef = useRef(customShiftKeys)
  useEffect(() => { shiftActionsRef.current = shiftActions }, [shiftActions])
  useEffect(() => { customShiftKeysRef.current = customShiftKeys }, [customShiftKeys])

  // DAW
  const [currentDaw, setCurrentDaw] = useState('ableton')
  const currentDawRef = useRef(currentDaw)
  useEffect(() => { currentDawRef.current = currentDaw }, [currentDaw])

  // MIDI Log
  const [logEntries, setLogEntries] = useState<string[]>(['// Esperando conexión Web MIDI...'])
  const [logOpen, setLogOpen]       = useState(false)
  const [infoMode, setInfoMode]     = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const logRef = useRef<HTMLDivElement>(null)

  // Save to device
  const [deviceSaveStatus, setDeviceSaveStatus]   = useState('')
  const [deviceSaveProgress, setDeviceSaveProgress] = useState<number | null>(null)
  const pendingResponseRef = useRef<((r: { command: number | null; payload?: Uint8Array; timedOut: boolean }) => void) | null>(null)
  const pendingTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Engine
  const enginesRef  = useRef(makeEngines())
  const midiStateRef = useRef(midiState)
  const bankRef      = useRef(bank)
  const selectedRef  = useRef(selected)
  useEffect(() => { midiStateRef.current = midiState }, [midiState])
  useEffect(() => { bankRef.current = bank }, [bank])
  useEffect(() => { selectedRef.current = selected }, [selected])

  // Fader visual ref (pasado a la escena 3D)
  const faderValRef = useRef(64)

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
  const sendMidiFromBank = useCallback((id: ControlId, b: Bank, rawValue: number) => {
    const out = midiOutputRef.current
    if (!out) return
    const s = midiStateRef.current[id][b]
    const chan = (s.chan - 1) & 0x0f   // s.chan es 1-16 (display), el byte de estado usa 0-15
    if (s.type === 'pc') {
      if (rawValue > 0) out.send([0xc0 | chan, s.num & 0x7f, 0])
    } else if (s.type === 'pb') {
      const bend = Math.max(0, Math.min(127, Math.round(rawValue))) * 128
      out.send([0xe0 | chan, bend & 0x7f, (bend >> 7) & 0x7f])
    } else if (s.type === 'note') {
      if (rawValue > 0) out.send([0x90 | chan, s.num, 127])
      else               out.send([0x80 | chan, s.num, 0])
    } else {
      out.send([0xb0 | chan, s.num, Math.max(0, Math.min(127, Math.round(rawValue)))])
    }
  }, [])

  const sendMidi = useCallback((id: ControlId, rawValue: number) => {
    sendMidiFromBank(id, bankRef.current, rawValue)
  }, [sendMidiFromBank])

  // ── DAW preset ────────────────────────────────────────────────
  const applyDawPreset = useCallback((dawId: string) => {
    const preset = DAW_PRESETS[dawId]
    if (!preset) return
    setShiftActions(() => {
      const a: Record<string, string> = {}
      for (let i = 0; i < 16; i++) a['p' + i] = preset[i] || 'none'
      return a
    })
    setCustomShiftKeys({})
    log('Preset cargado: ' + (DAWS.find((d) => d.id === dawId)?.name || dawId))
  }, [log])

  const handleChangeDaw = useCallback((dawId: string) => {
    setCurrentDaw(dawId)
    applyDawPreset(dawId)
  }, [applyDawPreset])

  // ── Shift sticky ──────────────────────────────────────────────
  const enterShiftStickyMode = useCallback((padId: ControlId) => {
    shiftConfigStickyRef.current = true
    setShiftConfigSticky(true)
    stickyPadRef.current = padId
    setStickyPad(padId)
    padDuringShiftRef.current = true
  }, [])

  const exitShiftStickyMode = useCallback(() => {
    shiftConfigStickyRef.current = false
    setShiftConfigSticky(false)
    stickyPadRef.current = null
    setStickyPad(null)
  }, [])

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
    out.send([0xf0, MANUFACTURER_ID, DEVICE_ID, cmd, ...payload, 0xf7])
    return true
  }

  function serializePreset(): number[] {
    const s = midiStateRef.current
    const sa = shiftActionsRef.current
    const bytes: number[] = [PRESET_MAGIC, FORMAT_VERSION]
    const pushControl = (c: (typeof s)[ControlId][Bank], isPadCtrl: boolean) => {
      const paramMax = c.behavior === 'random' && !isPadCtrl ? 127 : 100
      bytes.push(c.num & 0x7f)
      bytes.push(packControlByte(typeToNum(c.type), (c.chan - 1) & 0x0f, c.mode === 'toggle' ? 1 : 0))
      bytes.push(BEHAVIOR_IDS[c.behavior] ?? 0)
      bytes.push(Math.max(0, Math.min(paramMax, Math.round(c.param))))
      bytes.push(Math.max(0, Math.min(127, Math.round(c.velMin ?? (isPadCtrl ? 127 : 0)))))
      bytes.push(Math.max(0, Math.min(127, Math.round(c.velMax ?? 127))))
    }
    for (const b of ['A', 'B', 'C'] as Bank[]) {
      for (let i = 0; i < 16; i++) pushControl(s[('p' + i) as ControlId][b], true)
      for (let i = 0; i < 4; i++) pushControl(s[('k' + i) as ControlId][b], false)
      pushControl(s['f0'][b], false)
    }
    for (let i = 0; i < 16; i++) {
      bytes.push(SHIFT_ACTION_IDS[sa['p' + i] || 'none'] ?? 0)
    }
    bytes.push(crc8(bytes))
    if (bytes.length !== PRESET_BINARY_SIZE) throw new Error(`Tamaño inesperado: ${bytes.length}`)
    return bytes
  }

  const saveToDevice = useCallback(async () => {
    if (!midiOutputRef.current || !midiInputRef.current) {
      setDeviceSaveStatus('Conecta el Beato 16 (entrada y salida MIDI) antes de guardar.')
      return
    }
    let presetBytes: number[]
    try { presetBytes = serializePreset() }
    catch (e: any) {
      setDeviceSaveStatus('Error preparando datos: ' + e.message)
      return
    }
    setDeviceSaveProgress(0)
    setDeviceSaveStatus('Enviando configuración al Beato 16...')
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
        setDeviceSaveStatus(`Fallo en bloque ${idx}. El preset anterior no se modificó.`)
        setDeviceSaveProgress(null)
        return
      }
      setDeviceSaveProgress(Math.round(5 + ((idx + 1) / totalChunks) * 90))
    }

    sendSysex(CMD_PRESET_DATA_END, [])
    resp = await waitForResponse(3000)
    setDeviceSaveProgress(null)
    if (resp.command === CMD_WRITE_OK) {
      setDeviceSaveStatus('Guardado en el Beato 16. Queda en el hardware aunque lo desconectes.')
      log('Preset escrito en EEPROM exitosamente.')
    } else {
      setDeviceSaveStatus('El firmware no pudo validar el preset.')
    }
  }, [log])

  // ── Save / Load config ────────────────────────────────────────
  const captureConfig = useCallback(() => ({
    daw: currentDaw,
    state: midiStateRef.current,
    shiftActions: shiftActionsRef.current,
    customShiftKeys: customShiftKeysRef.current,
  }), [currentDaw])

  const saveConfig = useCallback(async () => {
    const data = JSON.stringify(captureConfig(), null, 2)
    if (window.showSaveFilePicker) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'beato16_config.beato16',
          types: [{ description: 'Configuración Beato 16', accept: { 'application/json': ['.beato16', '.json'] } }],
        })
        const w = await handle.createWritable()
        await w.write(data)
        await w.close()
        log('Configuración guardada: ' + handle.name)
      } catch (e: any) { if (e.name !== 'AbortError') log('Error al guardar: ' + e.message) }
    } else {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
      a.download = 'beato16_config.beato16'
      a.click()
      log('Configuración descargada.')
    }
  }, [captureConfig, log])

  const loadConfig = useCallback(async () => {
    const applyFull = (cfg: any) => {
      if (!cfg?.state) return
      setMidiState((prev) => {
        const next = { ...prev }
        Object.keys(cfg.state).forEach((id) => {
          if (next[id as ControlId]) {
            next[id as ControlId] = { ...next[id as ControlId] }
            BANKS.forEach((b) => {
              if (cfg.state[id][b]) next[id as ControlId][b] = { ...cfg.state[id][b] }
            })
          }
        })
        return next
      })
      if (cfg.shiftActions) {
        setShiftActions({ ...cfg.shiftActions })
      }
      if (cfg.customShiftKeys) {
        setCustomShiftKeys({ ...cfg.customShiftKeys })
      }
      if (cfg.daw) {
        setCurrentDaw(cfg.daw)
      }
      log('Configuración cargada.')
    }

    if ((window as any).showOpenFilePicker) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'Configuración Beato 16', accept: { 'application/json': ['.beato16', '.json'] } }],
        })
        const file = await handle.getFile()
        applyFull(JSON.parse(await file.text()))
      } catch (e: any) { if (e.name !== 'AbortError') log('Error al abrir: ' + e.message) }
    } else {
      const input = document.createElement('input')
      input.type = 'file'; input.accept = '.beato16,.json'
      input.onchange = async () => {
        try { applyFull(JSON.parse(await input.files![0].text())) }
        catch (e: any) { log('Error al leer archivo: ' + e.message) }
      }
      input.click()
    }
  }, [log])

  const exportJson = useCallback(() => {
    const s = midiStateRef.current
    const sa = shiftActionsRef.current
    const controls: any = {}
    ALL_CONTROL_IDS.forEach((id) => {
      controls[id] = {}
      BANKS.forEach((b) => {
        const c = s[id][b]
        controls[id][b] = { type: c.type, num: c.num, channel: c.chan, mode: c.mode, behavior: c.behavior, param: c.param }
      })
    })
    const shiftCombos: any = {}
    for (let i = 0; i < 16; i++) {
      const pid = 'p' + i
      const action = sa[pid] || 'none'
      shiftCombos[pid] = { action }
      if (action === 'custom' && customShiftKeysRef.current[pid]) {
        shiftCombos[pid].customLabel = customShiftKeysRef.current[pid].label
        shiftCombos[pid].customKey   = customShiftKeysRef.current[pid].keyLabel
      }
    }
    const data = { formatVersion: 1, device: 'Beato 16', exportedAt: new Date().toISOString(), controls, shiftCombos }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    a.download = 'beato16_config.json'
    a.click()
    log('Configuración exportada: beato16_config.json')
  }, [log])

  // ── Behavior engine ───────────────────────────────────────────
  const lastTimeRef = useRef(performance.now())

  useEffect(() => {
    let animId: number
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000)
      lastTimeRef.current = now

      const s = midiStateRef.current
      const engines = enginesRef.current
      const b = bankRef.current

      // Knobs + fader: inercia, oscila
      const continuousIds: ControlId[] = ['k0', 'k1', 'k2', 'k3', 'f0']
      for (const id of continuousIds) {
        for (const bank of BANKS) {
          const cfg = s[id][bank]
          const eng = engines[id][bank]
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
            sendMidiFromBank(id, bank, outVal)
          }
        }
      }

      // Pads: retrigger
      for (let i = 0; i < 16; i++) {
        const id = ('p' + i) as ControlId
        for (const bank of BANKS) {
          const cfg = s[id][bank]
          const eng = engines[id][bank]
          if (cfg.behavior === 'retrigger' && eng.retrigActive) {
            const interval = 0.6 - (cfg.param / 100) * 0.55
            eng.phase += dt
            if (eng.phase >= interval) {
              eng.phase = 0
              sendMidiFromBank(id, bank, 127)
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
  const processIncoming = useCallback((rawType: 'note' | 'cc', rawNum: number, rawVal: number) => {
    const s = midiStateRef.current
    const engines = enginesRef.current
    const currentBank = bankRef.current

    let originId: ControlId | null = null
    let originBank: Bank = currentBank

    if (rawType === 'cc') {
      if (rawNum >= 116 && rawNum <= 119) {
        const idMap: Record<number, ControlId> = { 116: 'c0', 117: 'c1', 118: 'c2', 119: 'c3' }
        originId = idMap[rawNum]
      } else if (rawNum >= 100 && rawNum <= 115 && rawVal > 0) {
        const padId = ('p' + (rawNum - 100)) as ControlId
        if (shiftHeldRef.current) {
          padDuringShiftRef.current = true
          enterShiftStickyMode(padId)
          setSelected(padId)
        }
        return
      } else if (rawNum >= 30 && rawNum <= 34) {
        const map: Record<number, ControlId> = { 30: 'k0', 31: 'k1', 32: 'k2', 33: 'k3', 34: 'f0' }
        originId = map[rawNum]; originBank = 'A'
      } else if (rawNum >= 40 && rawNum <= 44) {
        const map: Record<number, ControlId> = { 40: 'k0', 41: 'k1', 42: 'k2', 43: 'k3', 44: 'f0' }
        originId = map[rawNum]; originBank = 'B'
      } else if (rawNum >= 50 && rawNum <= 54) {
        const map: Record<number, ControlId> = { 50: 'k0', 51: 'k1', 52: 'k2', 53: 'k3', 54: 'f0' }
        originId = map[rawNum]; originBank = 'C'
      }
    } else if (rawType === 'note') {
      if (PHYSICAL_NOTE_ARDUINO[rawNum] !== undefined) {
        originId = PHYSICAL_NOTE_ARDUINO[rawNum]; originBank = currentBank
      } else if (rawNum >= 36 && rawNum <= 51) {
        originId = ('p' + (rawNum - 36)) as ControlId; originBank = 'A'
      } else if (rawNum >= 52 && rawNum <= 67) {
        originId = ('p' + (rawNum - 52)) as ControlId; originBank = 'B'
      } else if (rawNum >= 68 && rawNum <= 83) {
        originId = ('p' + (rawNum - 68)) as ControlId; originBank = 'C'
      }
    }

    if (!originId) return

    // Banco A/B/C botones
    if (originId === 'c0' || originId === 'c1' || originId === 'c2') {
      if (rawVal > 0) {
        const bankMap: Record<string, Bank> = { c0: 'A', c1: 'B', c2: 'C' }
        setBank(bankMap[originId])
      }
      return
    }

    // Shift
    if (originId === 'c3') {
      const held = rawVal > 0
      shiftHeldRef.current = held
      setShiftHeld(held)
      if (!held) {
        if (!padDuringShiftRef.current && shiftConfigStickyRef.current) {
          exitShiftStickyMode()
        }
        padDuringShiftRef.current = false
      } else {
        padDuringShiftRef.current = false
      }
      log('Shift ' + (held ? 'presionado' : 'liberado'))
      return
    }

    if (shiftHeldRef.current && originId.startsWith('p') && originBank === currentBank) {
      setSelected(originId)
      const action = shiftActionsRef.current[originId]
      if (action && action !== 'none' && rawVal > 0) {
        const sc = shortcutLabel(action, currentDawRef.current)
        log(`SHIFT + ${labelFor(originId)} → ${DAW_ACTIONS.find((a) => a.id === action)?.name || action} (${sc})`)
        return
      }
    }

    // Sincroniza panel si el banco coincide
    if (originBank === currentBank) {
      const originBehavior = s[originId]?.[currentBank]?.behavior
      if (originBehavior !== 'oscila') {
        setSelected(originId)
      }
    }

    // Aplica evento de control
    const cfg = s[originId][originBank]
    const eng = engines[originId][originBank]
    const isVisible = originBank === currentBank

    if (originId.startsWith('k') || originId.startsWith('f')) {
      let outVal = rawVal
      switch (cfg.behavior) {
        case 'espejo': outVal = 127 - rawVal; break
        case 'inercia': eng.target = rawVal; outVal = rawVal; break
        case 'random': outVal = Math.max(0, Math.min(127, rawVal + (Math.random() - 0.5) * 2 * cfg.param)); break
        case 'oscila': eng.target = rawVal; outVal = rawVal; break
      }
      if (originId.startsWith('f')) faderValRef.current = outVal
      sendMidiFromBank(originId, originBank, outVal)
      log(`${labelFor(originId)} (${cfg.behavior}) banco${originBank} → ${cfg.type === 'cc' ? 'CC' : 'Note'}${cfg.num} val=${Math.round(outVal)}`)
    } else {
      const isOn = rawVal > 0
      switch (cfg.behavior) {
        case 'directo':
          sendMidiFromBank(originId, originBank, isOn ? 127 : 0)
          break
        case 'retrigger':
          if (isOn) { eng.retrigActive = true }
          else { eng.retrigActive = false; sendMidiFromBank(originId, originBank, 0) }
          break
        case 'rafaga':
          if (isOn) {
            for (let i = 0; i < 3; i++) {
              setTimeout(() => {
                if (Math.random() < 0.7) sendMidiFromBank(originId!, originBank, 127)
              }, i * 80)
            }
          }
          break
      }
      log(`${labelFor(originId)} (${cfg.behavior}) → ${isOn ? 'ON' : 'OFF'}`)
    }
  }, [sendMidiFromBank, log, enterShiftStickyMode, exitShiftStickyMode])

  // ── MIDI I/O setup ────────────────────────────────────────────
  const setupMidiPorts = useCallback((access: MIDIAccess) => {
    const allInputs  = Array.from(access.inputs.values())
    const allOutputs = Array.from(access.outputs.values())
    const inputs  = allInputs.filter((i) => isCrartDevice(i.name))
    const outputs = allOutputs.filter((o) => isCrartDevice(o.name))

    const beatoIn = inputs[0]
    if (beatoIn && beatoIn !== midiInputRef.current) {
      midiInputRef.current = beatoIn
      beatoIn.onmidimessage = (msg: MIDIMessageEvent) => {
        const data = msg.data
        if (data[0] === 0xf0) {
          // SysEx response
          if (data[1] === MANUFACTURER_ID && data[2] === DEVICE_ID) {
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
        const [statusByte, d1, d2] = data
        const type = statusByte & 0xf0
        log(`IN: ${type === 0x90 ? 'NoteOn' : type === 0x80 ? 'NoteOff' : type === 0xb0 ? 'CC' : '0x' + type.toString(16)} num=${d1} val=${d2}`)
        // Cualquier mensaje del hardware activa este editor en el ecosistema
        // (el panel de la derecha pasa a ser el del Beato 16).
        onActivateRef.current?.()
        if (type === 0x90 && d2 > 0) processIncoming('note', d1, 1)
        else if (type === 0x80 || (type === 0x90 && d2 === 0)) processIncoming('note', d1, 0)
        else if (type === 0xb0) processIncoming('cc', d1, d2)
      }
      setConnected(true)
      setStatusText('Conectado: ' + beatoIn.name)
      log('Conectado a: ' + beatoIn.name)
    } else if (!beatoIn) {
      midiInputRef.current = null
      setConnected(false)
      setStatusText('Beato 16 no detectado. Conéctalo y recarga.')
    }

    const crartOutputs = outputs
    setOutputList(crartOutputs.map((o, idx) => ({ idx, name: o.name })))
    if (crartOutputs.length > 0 && midiOutputRef.current === null) {
      midiOutputRef.current = crartOutputs[0]
      setSelectedOutputIdx(0)
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
  }, [setupMidiPorts])

  const handleOutputChange = useCallback((idx: number | null) => {
    setSelectedOutputIdx(idx)
    if (idx === null) { midiOutputRef.current = null; return }
    const access = midiAccessRef.current
    if (!access) return
    const outputs = Array.from(access.outputs.values()).filter((o) => isCrartDevice(o.name))
    midiOutputRef.current = outputs[idx] || null
    log('Salida MIDI: ' + (midiOutputRef.current?.name || 'ninguna'))
  }, [log])

  // ── State handlers ────────────────────────────────────────────
  const handleUpdate = useCallback(
    (id: ControlId, b: Bank, patch: Partial<(typeof midiState)[ControlId][Bank]>) => {
      setMidiState((prev) => ({
        ...prev,
        [id]: { ...prev[id], [b]: { ...prev[id][b], ...patch } },
      }))
      // Reset engine on behavior change
      if (patch.behavior) {
        const eng = enginesRef.current[id][b]
        eng.phase = 0; eng.retrigActive = false
      }
    },
    []
  )

  const handleUpdateShiftAction = useCallback((padId: string, actionId: string) => {
    setShiftActions((prev) => ({ ...prev, [padId]: actionId }))
    const action = DAW_ACTIONS.find((a) => a.id === actionId)
    log(`${labelFor(padId as ControlId)} + Shift → ${action?.name || actionId}`)
  }, [log])

  const handleUpdateCustomKey = useCallback((padId: string, key: CustomShiftKey) => {
    setCustomShiftKeys((prev) => ({ ...prev, [padId]: key }))
    log(`${labelFor(padId as ControlId)} + Shift → tecla: ${key.keyLabel}`)
  }, [log])

  const handleUpdateCustomKeyLabel = useCallback((padId: string, label: string) => {
    setCustomShiftKeys((prev) => ({
      ...prev,
      [padId]: { ...(prev[padId] || { keyLabel: '', code: '', label: '', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false }), label },
    }))
  }, [])

  // ── MIDI Panic ────────────────────────────────────────────────
  const midiPanic = useCallback(() => {
    const out = midiOutputRef.current
    if (out) {
      for (let ch = 0; ch < 16; ch++) {
        out.send([0xb0 | ch, 123, 0])
        out.send([0xb0 | ch, 120, 0])
      }
    }
    log('PANIC: todas las notas apagadas.')
  }, [log])

  // ── Factory reset ─────────────────────────────────────────────
  const handleFactoryReset = useCallback(() => {
    if (!window.confirm('¿Restablecer todos los valores de fábrica?\n\nEsto borrará toda tu configuración actual.\nEsta acción no se puede deshacer.')) return
    midiPanic()
    try {
      localStorage.removeItem('beato16-state')
      localStorage.removeItem('beato16-shiftActions')
      localStorage.removeItem('beato16-daw')
      localStorage.removeItem('beato16-version')
    } catch (_) {}
    setMidiState(makeInitialState())
    setShiftActions(() => {
      const a: Record<string, string> = {}
      for (let i = 0; i < 16; i++) a['p' + i] = 'none'
      return a
    })
    setCustomShiftKeys({})
    setCurrentDaw('ableton')
    applyDawPreset('ableton')
    setSelected(null)
    setDeviceSaveStatus('')
    setDeviceSaveProgress(null)
    log('Valores de fábrica restablecidos.')
  }, [midiPanic, applyDawPreset, log])

  // ── Apply vel/range to all pads or all knobs ──────────────────
  const handleApplyVelAll = useCallback((id: ControlId, b: Bank) => {
    const src = midiStateRef.current[id][b]
    const { velMin, velMax, velRandom } = src
    const isPadSrc = id.startsWith('p')
    const targets = isPadSrc
      ? ALL_CONTROL_IDS.filter((k) => k.startsWith('p'))
      : ALL_CONTROL_IDS.filter((k) => k.startsWith('k') || k.startsWith('f'))
    setMidiState((prev) => {
      const next = { ...prev }
      targets.forEach((tid) => {
        next[tid] = { ...next[tid] }
        BANKS.forEach((bank) => {
          next[tid][bank] = {
            ...next[tid][bank],
            velMin,
            velMax,
            ...(isPadSrc ? { velRandom } : {}),
          }
        })
      })
      return next
    })
    log(`Rango aplicado a todos (min:${velMin} max:${velMax})`)
  }, [log])

  // ── Modo info: tooltips de ayuda al pasar el mouse ────────────
  useEffect(() => {
    document.body.classList.toggle('info-mode', infoMode)
    return () => document.body.classList.remove('info-mode')
  }, [infoMode])

  // ── localStorage auto-save ────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      try {
        localStorage.setItem('beato16-state', JSON.stringify(midiStateRef.current))
        localStorage.setItem('beato16-shiftActions', JSON.stringify(shiftActionsRef.current))
        localStorage.setItem('beato16-daw', currentDawRef.current)
        localStorage.setItem('beato16-version', '3')
      } catch (_) {}
    }, 2000)
    return () => clearInterval(id)
  }, [])

  // Apply initial DAW preset + restore localStorage
  useEffect(() => {
    applyDawPreset('ableton')
    try {
      if (localStorage.getItem('beato16-version') !== '3') return
      const savedState = localStorage.getItem('beato16-state')
      if (savedState) {
        const parsed = JSON.parse(savedState)
        setMidiState((prev) => {
          const next = { ...prev }
          Object.keys(parsed).forEach((id) => {
            if (next[id as ControlId]) {
              next[id as ControlId] = { ...next[id as ControlId] }
              BANKS.forEach((b) => {
                if (parsed[id]?.[b]) next[id as ControlId][b] = { ...next[id as ControlId][b], ...parsed[id][b] }
              })
            }
          })
          return next
        })
      }
      const savedShift = localStorage.getItem('beato16-shiftActions')
      if (savedShift) setShiftActions(JSON.parse(savedShift))
      const savedDaw = localStorage.getItem('beato16-daw')
      if (savedDaw) setCurrentDaw(savedDaw)
    } catch (_) {}
  }, []) // eslint-disable-line

  // ── Piezas reutilizables (modo ecosistema / portal) ───────────
  const tint = embeddedTint || '#C8FF4D'

  const sceneEl = (
    <Beato16Scene
      selectedId={selected}
      onSelect={setSelected}
      bank={bank}
      onBankChange={setBank}
      shiftActive={shiftHeld || shiftConfigSticky}
      stickyPadId={stickyPad}
      midiState={midiState}
      showLabels={showLabels}
      shiftActions={shiftActions}
      customShiftKeys={customShiftKeys}
    />
  )

  const configPanelEl = (
    <ConfigPanel
      selectedId={selected}
      bank={bank}
      state={midiState}
      onUpdate={handleUpdate}
      shiftHeld={shiftHeld}
      shiftConfigSticky={shiftConfigSticky}
      shiftActions={shiftActions}
      customShiftKeys={customShiftKeys}
      currentDaw={currentDaw}
      onUpdateShiftAction={handleUpdateShiftAction}
      onUpdateCustomKey={handleUpdateCustomKey}
      onUpdateCustomKeyLabel={handleUpdateCustomKeyLabel}
      onChangeDaw={handleChangeDaw}
      onSaveConfig={saveConfig}
      onLoadConfig={loadConfig}
      onExportJson={exportJson}
      onSaveToDevice={saveToDevice}
      onFactoryReset={handleFactoryReset}
      onApplyVelAll={handleApplyVelAll}
      deviceSaveStatus={deviceSaveStatus}
      deviceSaveProgress={deviceSaveProgress}
    />
  )

  const infoStyleEl = (
    <style>{`
      @keyframes pulse-dot {
        0%   { box-shadow: 0 0 0 0 rgba(200,255,77,0.4); }
        70%  { box-shadow: 0 0 0 6px rgba(200,255,77,0); }
        100% { box-shadow: 0 0 0 0 rgba(200,255,77,0); }
      }
      body.info-mode [data-info]{ position: relative; cursor: help; }
      body.info-mode [data-info]:hover::after{
        content: attr(data-info); position: absolute; bottom: calc(100% + 8px);
        left: 50%; transform: translateX(-50%); background: #1c1c20; color: #F2F1ED;
        border: 1px solid #C8FF4D; border-radius: 8px; padding: 8px 12px;
        font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.5;
        white-space: pre-wrap; width: 220px; z-index: 999; pointer-events: none;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      }
      body.info-mode [data-info]:hover::before{
        content: ''; position: absolute; bottom: calc(100% + 2px); left: 50%;
        transform: translateX(-50%); border: 5px solid transparent;
        border-top-color: #C8FF4D; z-index: 999; pointer-events: none;
      }
    `}</style>
  )

  // ── Modo ecosistema: escena → área común, menú → panel derecho ──
  if (portalMode) {
    const controlsStrip = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid #2E2E33', background: 'rgba(14,14,16,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A9890' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#C8FF4D' : '#FF6B57', animation: connected ? 'pulse-dot 2s infinite' : undefined }} />
          <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusText}</span>
        </div>
        {outputList.length > 0 && (
          <select value={selectedOutputIdx ?? ''} onChange={(e) => handleOutputChange(e.target.value === '' ? null : parseInt(e.target.value))}
            style={{ fontFamily: 'JetBrains Mono, monospace', background: '#232327', color: '#F2F1ED', border: '1px solid #2E2E33', borderRadius: 6, padding: '5px 8px', fontSize: 11 }}>
            <option value="">Sin salida MIDI</option>
            {outputList.map((o) => <option key={o.idx} value={o.idx}>{o.name}</option>)}
          </select>
        )}
        <button onClick={() => setInfoMode((v) => !v)} title="Modo info"
          style={{ width: 28, height: 28, borderRadius: '50%', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, background: infoMode ? '#C8FF4D' : '#232327', color: infoMode ? '#0E0E10' : '#9A9890', border: `1px solid ${infoMode ? '#C8FF4D' : '#2E2E33'}`, cursor: 'pointer' }}>i</button>
        <button onClick={() => setShowLabels((v) => !v)} title="Mostrar mapeo MIDI"
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, background: showLabels ? 'rgba(57,255,20,0.15)' : '#232327', color: showLabels ? '#39ff14' : '#9A9890', border: `1px solid ${showLabels ? '#39ff14' : '#2E2E33'}`, borderRadius: 7, padding: '5px 8px', cursor: 'pointer', letterSpacing: '0.04em' }}>MAP</button>
        <button onClick={() => setLogOpen((v) => !v)}
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, background: logOpen ? 'rgba(200,255,77,0.1)' : '#232327', color: logOpen ? '#C8FF4D' : '#9A9890', border: `1px solid ${logOpen ? '#C8FF4D' : '#2E2E33'}`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>▶ Consola</button>
        <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
          {BANKS.map((b) => {
            const act = b === bank
            return (
              <button key={b} onClick={() => setBank(b)}
                style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid ' + (act ? '#C8FF4D' : '#2E2E33'), background: act ? '#C8FF4D' : '#232327', color: act ? '#0E0E10' : '#F2F1ED', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, cursor: 'pointer' }}>{b}</button>
            )
          })}
        </div>
      </div>
    )

    return (
      <>
        {sceneSlot && createPortal(
          <div onPointerDownCapture={onActivate}
            style={{ flex: '1 1 0', minWidth: 0, height: '100%', position: 'relative', background: 'transparent' }}>
            {/* La identificación del dispositivo la pinta el EcosystemDock
                (placa bajo el modelo) — aquí solo va la escena 3D */}
            <div style={{ width: '100%', height: '100%' }}>{sceneEl}</div>
          </div>,
          sceneSlot
        )}
        {active && panelSlot && createPortal(
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, color: '#F2F1ED', fontFamily: 'Inter, sans-serif' }}>
            {controlsStrip}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{configPanelEl}</div>
          </div>,
          panelSlot
        )}
        {active && logOpen && createPortal(
          <div style={{ position: 'fixed', bottom: 20, right: 20, width: 340, maxHeight: 280, background: '#18181B', border: '1px solid #2E2E33', borderRadius: 14, display: 'flex', flexDirection: 'column', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #2E2E33', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A9890' }}>
              <span>Consola MIDI · {embeddedTitle}</span>
              <button onClick={() => setLogOpen(false)} style={{ background: 'none', border: 'none', color: '#9A9890', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div ref={logRef} style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A9890', overflowY: 'auto', flex: 1 }}>
              {logEntries.map((e, i) => <p key={i} style={{ margin: '2px 0' }}>{e}</p>)}
            </div>
          </div>,
          document.body
        )}
        {infoStyleEl}
      </>
    )
  }

  return (
    <div
      style={{
        ...(embedded
          ? { position: 'relative', width: '100%', height: '100%' }
          : { position: 'fixed', inset: 0 }),
        color: '#F2F1ED',
        fontFamily: 'Inter, sans-serif',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        minHeight: 0,
      }}
    >
      {!embedded && <StarfieldBackground />}

      {/* Header — franja compacta cuando va embebido en el ecosistema */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: embedded ? 'flex-start' : 'space-between',
          gap: embedded ? 10 : 16,
          padding: embedded ? '8px 14px' : '14px 22px',
          borderBottom: '1px solid #2E2E33',
          background: 'rgba(14,14,16,0.75)',
          backdropFilter: 'blur(12px)',
          position: 'relative',
          zIndex: 1,
          flexWrap: 'wrap',
        }}
      >
        {!embedded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link
              to="/"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                color: '#9A9890',
                textDecoration: 'none',
                border: '1px solid #2E2E33',
                padding: '6px 12px',
                borderRadius: 8,
              }}
            >
              ← Volver
            </Link>
            <div>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  letterSpacing: '0.2em',
                  color: '#9A9890',
                  textTransform: 'uppercase',
                }}
              >
                Creart Studio — Behavior Editor 3D
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 500, margin: '2px 0 0' }}>Beato 16</h1>
            </div>
          </div>
        )}

        {/* Identidad del equipo dentro del ecosistema */}
        {embedded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4, flexShrink: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: embeddedTint || '#C8FF4D', boxShadow: `0 0 8px ${embeddedTint || '#C8FF4D'}` }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
              {embeddedTitle || 'Beato 16'}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Status de conexión */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#9A9890' }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: connected ? '#C8FF4D' : '#FF6B57',
                display: 'inline-block',
                boxShadow: connected ? '0 0 0 0 rgba(200,255,77,0)' : undefined,
                animation: connected ? 'pulse-dot 2s infinite' : undefined,
              }}
            />
            <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {statusText}
            </span>
          </div>

          {/* Selector de salida MIDI */}
          {outputList.length > 0 && (
            <select
              value={selectedOutputIdx ?? ''}
              onChange={(e) => handleOutputChange(e.target.value === '' ? null : parseInt(e.target.value))}
              data-info={"Selecciona tu Beato 16 aquí para\nque los cambios que hagas se apliquen.\nSi no aparece, conecta el USB y recarga."}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                background: '#232327',
                color: '#F2F1ED',
                border: '1px solid #2E2E33',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 12,
              }}
            >
              <option value="">Sin salida MIDI</option>
              {outputList.map((o) => (
                <option key={o.idx} value={o.idx}>
                  {o.name}
                </option>
              ))}
            </select>
          )}

          {/* Modo info */}
          <button
            onClick={() => setInfoMode((v) => !v)}
            title="Modo info"
            data-info={"Ayuda activada! Pasa el mouse\nsobre cualquier botón o control\npara ver qué hace cada cosa."}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13,
              fontWeight: 700,
              background: infoMode ? '#C8FF4D' : '#232327',
              color: infoMode ? '#0E0E10' : '#9A9890',
              border: `1px solid ${infoMode ? '#C8FF4D' : '#2E2E33'}`,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            i
          </button>

          {/* Mapeo MIDI visible */}
          <button
            onClick={() => setShowLabels((v) => !v)}
            title="Mostrar mapeo MIDI sobre controles"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              background: showLabels ? 'rgba(57,255,20,0.15)' : '#232327',
              color: showLabels ? '#39ff14' : '#9A9890',
              border: `1px solid ${showLabels ? '#39ff14' : '#2E2E33'}`,
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            MAP
          </button>

          {/* Consola MIDI */}
          <button
            onClick={() => setLogOpen((v) => !v)}
            data-info={"Ver los mensajes que van y vienen\nentre tu controlador y el computador.\nÚtil si algo no está funcionando."}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
              background: logOpen ? 'rgba(200,255,77,0.1)' : '#232327',
              color: logOpen ? '#C8FF4D' : '#9A9890',
              border: `1px solid ${logOpen ? '#C8FF4D' : '#2E2E33'}`,
              borderRadius: 8,
              padding: '7px 12px',
              cursor: 'pointer',
            }}
          >
            ▶ Consola MIDI
          </button>

          {/* Bancos */}
          <div style={{ display: 'flex', gap: 6 }}>
            {BANKS.map((b) => {
              const active = b === bank
              const bankInfo: Record<Bank, string> = {
                A: "Banco A: el primer modo del Beato 16.\nCada banco es como un 'perfil' distinto\npara los mismos botones físicos.",
                B: "Banco B: el segundo modo del Beato 16.\nPuede tener ajustes completamente\ndistintos al banco A y al C.",
                C: "Banco C: el tercer modo del Beato 16.\nTres bancos = tres configuraciones\ndistintas en un mismo dispositivo.",
              }
              return (
                <button
                  key={b}
                  onClick={() => setBank(b)}
                  data-info={bankInfo[b]}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    border: '1px solid ' + (active ? '#C8FF4D' : '#2E2E33'),
                    background: active ? '#C8FF4D' : '#232327',
                    color: active ? '#0E0E10' : '#F2F1ED',
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace',
                    cursor: 'pointer',
                  }}
                >
                  {b}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Consola flotante */}
      {logOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            width: 340,
            maxHeight: 280,
            background: '#18181B',
            border: '1px solid #2E2E33',
            borderRadius: 14,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '1px solid #2E2E33',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: '#9A9890',
            }}
          >
            <span>Consola MIDI</span>
            <button
              onClick={() => setLogOpen(false)}
              style={{ background: 'none', border: 'none', color: '#9A9890', cursor: 'pointer', fontSize: 16 }}
            >
              ×
            </button>
          </div>
          <div
            ref={logRef}
            style={{
              padding: '10px 14px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: '#9A9890',
              overflowY: 'auto',
              flex: 1,
            }}
          >
            {logEntries.map((e, i) => (
              <p key={i} style={{ margin: '2px 0' }}>{e}</p>
            ))}
          </div>
        </div>
      )}

      {/* Cuerpo */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 18,
          padding: 18,
          minHeight: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            border: '1px solid rgba(0,229,255,0.15)',
            borderRadius: 14,
            overflow: 'hidden',
            background: 'transparent',
          }}
        >
          <Beato16Scene
            selectedId={selected}
            onSelect={setSelected}
            bank={bank}
            onBankChange={setBank}
            shiftActive={shiftHeld || shiftConfigSticky}
            stickyPadId={stickyPad}
            midiState={midiState}
            showLabels={showLabels}
            shiftActions={shiftActions}
            customShiftKeys={customShiftKeys}
          />
        </div>
        <div
          style={{
            background: 'rgba(24,24,27,0.82)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #2E2E33',
            borderRadius: 14,
            padding: 22,
            overflowY: 'auto',
          }}
        >
          <ConfigPanel
            selectedId={selected}
            bank={bank}
            state={midiState}
            onUpdate={handleUpdate}
            shiftHeld={shiftHeld}
            shiftConfigSticky={shiftConfigSticky}
            shiftActions={shiftActions}
            customShiftKeys={customShiftKeys}
            currentDaw={currentDaw}
            onUpdateShiftAction={handleUpdateShiftAction}
            onUpdateCustomKey={handleUpdateCustomKey}
            onUpdateCustomKeyLabel={handleUpdateCustomKeyLabel}
            onChangeDaw={handleChangeDaw}
            onSaveConfig={saveConfig}
            onLoadConfig={loadConfig}
            onExportJson={exportJson}
            onSaveToDevice={saveToDevice}
            onFactoryReset={handleFactoryReset}
            onApplyVelAll={handleApplyVelAll}
            deviceSaveStatus={deviceSaveStatus}
            deviceSaveProgress={deviceSaveProgress}
          />
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%   { box-shadow: 0 0 0 0 rgba(200,255,77,0.4); }
          70%  { box-shadow: 0 0 0 6px rgba(200,255,77,0); }
          100% { box-shadow: 0 0 0 0 rgba(200,255,77,0); }
        }
        /* Tooltips del modo info — portado del HTML del Beato 16 */
        body.info-mode [data-info]{ position: relative; cursor: help; }
        body.info-mode [data-info]:hover::after{
          content: attr(data-info);
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: #1c1c20;
          color: #F2F1ED;
          border: 1px solid #C8FF4D;
          border-radius: 8px;
          padding: 8px 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          line-height: 1.5;
          white-space: pre-wrap;
          width: 220px;
          z-index: 999;
          pointer-events: none;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        }
        body.info-mode [data-info]:hover::before{
          content: '';
          position: absolute;
          bottom: calc(100% + 2px);
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: #C8FF4D;
          z-index: 999;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}

export default MidiEditor3DPage
