/**
 * UnifiedEditorPage.tsx — Ecosistema de editores Creart (vista unificada).
 *
 * Detecta por Web MIDI qué controladores Creart están conectados y los reúne en
 * UNA sola vista: todos los modelos 3D juntos a la izquierda y UN solo menú a la
 * derecha. Cada editor conserva su estado/MIDI intactos pero "teletransporta"
 * (portal) su escena 3D al área común y su menú al panel derecho cuando es el
 * dispositivo activo. Al hacer clic en un control de cualquier modelo, ese
 * dispositivo se vuelve el activo y su menú aparece a la derecha.
 *
 * Extensible: añade una entrada a DEVICE_REGISTRY con su detector y su editor.
 */

import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import MidiEditor3DPage from './MidiEditor3DPage'
import WavoEditorPage from './WavoEditorPage'
import FadoEditorPage from './FadoEditorPage'
import MixoEditorPage from './MixoEditorPage'
import KnoboEditorPage from './KnoboEditorPage'
import Beato8EditorPage from './Beato8EditorPage'
import { ECO, DEVICE_TINT, ECO_KEYFRAMES } from '../editor-shared/ecosystem'

type DeviceKind = 'beato16' | 'wavo' | 'fado' | 'mixo' | 'knobo' | 'beato8'

/** Props que cada editor recibe para integrarse al ecosistema vía portales. */
export interface EmbeddedSlots {
  embedded: true
  embeddedTitle: string
  embeddedTint: string
  /** Contenedor donde el editor monta su escena 3D (siempre visible). */
  sceneSlot: HTMLElement | null
  /** Contenedor del menú derecho (el editor monta su panel solo si active). */
  panelSlot: HTMLElement | null
  /** True si este es el dispositivo cuyo menú se muestra a la derecha. */
  active: boolean
  /** El editor lo llama al seleccionarse un control → se vuelve el activo. */
  onActivate: () => void
}

interface DeviceDef {
  kind: DeviceKind
  label: string
  match: (name: string) => boolean
  render: (slots: EmbeddedSlots) => React.ReactNode
}

// Orden de detección: dispositivos con nombre específico antes que los genéricos
// (un "Creart Fado" no debe caer en el patrón Beato).
const DEVICE_REGISTRY: DeviceDef[] = [
  {
    kind: 'wavo',
    label: 'WAVO',
    match: (n) => /wavo|syntesp|esp32/i.test(n),
    render: (s) => <WavoEditorPage {...s} />,
  },
  {
    kind: 'fado',
    label: 'FADO',
    match: (n) => /fado|fader/i.test(n),
    render: (s) => <FadoEditorPage {...s} />,
  },
  {
    kind: 'mixo',
    label: 'MIXO',
    match: (n) => /mixo/i.test(n),
    render: (s) => <MixoEditorPage {...s} />,
  },
  {
    kind: 'knobo',
    label: 'KNOBO',
    match: (n) => /knobo/i.test(n),
    render: (s) => <KnoboEditorPage {...s} />,
  },
  {
    kind: 'beato8',
    label: 'BEATO 8',
    match: (n) => /beato\s*8/i.test(n),
    render: (s) => <Beato8EditorPage {...s} />,
  },
  {
    kind: 'beato16',
    label: 'Beato 16',
    match: (n) => /beato|creart|arduino/i.test(n),
    render: (s) => <MidiEditor3DPage {...s} />,
  },
]

function classify(name: string): DeviceKind | null {
  for (const d of DEVICE_REGISTRY) if (d.match(name)) return d.kind
  return null
}

const UnifiedEditorPage: React.FC = () => {
  const [detected, setDetected] = useState<Set<DeviceKind>>(new Set())
  const [midiSupported, setMidiSupported] = useState(true)
  const [active, setActive] = useState<DeviceKind | null>(null)
  // Slots (callback refs en estado → los portales se re-renderizan al montar).
  const [sceneSlot, setSceneSlot] = useState<HTMLElement | null>(null)
  const [panelSlot, setPanelSlot] = useState<HTMLElement | null>(null)

  const scan = useCallback((access: MIDIAccess) => {
    const found = new Set<DeviceKind>()
    const ports = [
      ...Array.from(access.inputs.values()),
      ...Array.from(access.outputs.values()),
    ]
    for (const p of ports) {
      const kind = classify(p.name || '')
      if (kind) found.add(kind)
    }
    setDetected(found)
  }, [])

  useEffect(() => {
    const nav = navigator as Navigator & {
      requestMIDIAccess?: (opts?: { sysex?: boolean }) => Promise<MIDIAccess>
    }
    if (!nav.requestMIDIAccess) {
      setMidiSupported(false)
      return
    }
    let access: MIDIAccess | null = null
    const onState = () => { if (access) scan(access) }
    nav
      .requestMIDIAccess({ sysex: true })
      .then((a) => {
        access = a
        scan(a)
        a.addEventListener('statechange', onState)
      })
      .catch(() => setMidiSupported(false))
    return () => {
      if (access) access.removeEventListener('statechange', onState)
    }
  }, [scan])

  const shown = DEVICE_REGISTRY.filter(
    (d) => detected.has(d.kind)
  )
  // Firma estable (string) para deps de efectos — evita re-correr en cada render.
  const shownKey = shown.map((d) => d.kind).join(',')

  // Mantener un dispositivo activo válido: si el activo deja de mostrarse,
  // pasar al primero disponible.
  useEffect(() => {
    const kinds = shownKey ? (shownKey.split(',') as DeviceKind[]) : []
    if (kinds.length === 0) {
      setActive((a) => (a === null ? a : null))
      return
    }
    if (!active || !kinds.includes(active)) setActive(kinds[0])
  }, [shownKey, active])

  // Grid adaptativo: 1→1×1, 2→2×1, 3→3×1, 4→2×2, 5→3×2, 6→3×2
  const n = shown.length
  const gridCols = n <= 1 ? 1 : n <= 3 ? n : n <= 4 ? 2 : 3
  const gridRows = n <= 3 ? 1 : n <= 4 ? 2 : 2

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        color: ECO.text,
        fontFamily: ECO.fontBody,
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        background: ECO.void,
      }}
    >
      <TechBackground />

      {/* ── Barra / menú único del ecosistema ───────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '0 18px',
          height: 56,
          borderBottom: `1px solid ${ECO.line}`,
          background: 'rgba(9,9,11,0.82)',
          backdropFilter: 'blur(14px)',
          position: 'relative',
          zIndex: 3,
        }}
      >
        <Link
          to="/"
          aria-label="Volver al inicio"
          style={{
            fontFamily: ECO.fontMono,
            fontSize: 16,
            color: ECO.dim,
            textDecoration: 'none',
            border: `1px solid ${ECO.line}`,
            width: 34,
            height: 34,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ←
        </Link>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0 }}>
          <span
            style={{
              fontFamily: ECO.fontDisplay,
              fontSize: 19,
              fontWeight: 800,
              letterSpacing: '0.14em',
              background: ECO.accentGrad,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            CREART.TECH
          </span>
          <span
            style={{
              fontFamily: ECO.fontMono,
              fontSize: 10,
              letterSpacing: '0.34em',
              color: ECO.dim,
              textTransform: 'uppercase',
            }}
          >
            MIDI Editor
          </span>
        </div>

        <div style={{ width: 1, height: 26, background: ECO.line, flexShrink: 0 }} />

        {/* Módulos de dispositivo: solo los conectados por MIDI (o añadidos
            manualmente). Click selecciona el dispositivo activo. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {shown.length === 0 && (
            <span style={{ fontFamily: ECO.fontMono, fontSize: 11, color: ECO.dim, letterSpacing: '0.08em' }}>
              Conecta un dispositivo Creart…
            </span>
          )}
          {shown.map((d) => {
            const isDetected = detected.has(d.kind)
            const isActive = active === d.kind
            const tint = DEVICE_TINT[d.kind]
            return (
              <button
                key={d.kind}
                onClick={() => setActive(d.kind)}
                title="Conectado por MIDI"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  fontFamily: ECO.fontMono,
                  fontSize: 11,
                  padding: '6px 12px 6px 10px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  background: isActive ? ECO.elevated : 'transparent',
                  color: ECO.text,
                  border: `1px solid ${isActive ? tint + '88' : ECO.line}`,
                  borderLeft: `2px solid ${isActive ? tint : ECO.line}`,
                  boxShadow: isActive ? `inset 0 0 18px -10px ${tint}` : 'none',
                  transition: 'all .15s',
                }}
              >
                {/* LED de conexión */}
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: isDetected ? tint : '#3A3D45',
                    boxShadow: isDetected ? `0 0 8px ${tint}, 0 0 2px ${tint}` : 'inset 0 0 2px #000',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {d.label}
                </span>
                {/* Estado de conexión: redundante al LED, legible en penumbra */}
                <span
                  style={{
                    fontSize: 8,
                    letterSpacing: '0.12em',
                    fontWeight: 700,
                    color: isDetected ? '#0B0C0E' : ECO.dim,
                    background: isDetected ? tint : 'transparent',
                    border: isDetected ? 'none' : `1px solid ${ECO.line}`,
                    borderRadius: 3,
                    padding: '1.5px 5px',
                    opacity: isDetected ? 1 : 0.6,
                  }}
                >
                  {isDetected ? 'LIVE' : 'OFF'}
                </span>
              </button>
            )
          })}
        </div>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontFamily: ECO.fontMono,
            fontSize: 11,
            color: ECO.dim,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: detected.size > 0 ? ECO.accent : '#4A4A52',
              animation: detected.size > 0 ? 'eco-pulse 2s infinite' : undefined,
            }}
          />
          <span>
            {detected.size > 0
              ? `${detected.size} conectado${detected.size > 1 ? 's' : ''}`
              : 'Sin dispositivos'}
          </span>
        </div>
      </header>


      {/* ── Cuerpo: sistema modular unificado ──────────────────── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: 0,
          display: shown.length === 0 ? 'flex' : 'grid',
          gridTemplateRows: shown.length === 0 ? undefined : '1fr auto',
        }}
      >
        {shown.length === 0 ? (
          <EmptyState midiSupported={midiSupported} />
        ) : (
          <>
            {/* ── Rack modular: escenas 3D en fila + panel lateral ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 370px', minHeight: 0 }}>
              {/* Área 3D: módulos en fila horizontal como un rack */}
              <div style={{ position: 'relative', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
                {/* Fondo del rack */}
                <div aria-hidden style={{
                  position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                  background: `radial-gradient(ellipse 120% 80% at 50% 60%, #111418 0%, ${ECO.void} 70%)`,
                }} />
                {/* Rejilla técnica sutil */}
                <div aria-hidden style={{
                  position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                  backgroundImage: `linear-gradient(${ECO.grid} 1px, transparent 1px), linear-gradient(90deg, ${ECO.grid} 1px, transparent 1px)`,
                  backgroundSize: '32px 32px',
                  maskImage: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(0,0,0,0.7), transparent 80%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(0,0,0,0.7), transparent 80%)',
                }} />

                {/* Módulos 3D: grid adaptativo según dispositivos conectados */}
                <div
                  ref={setSceneSlot}
                  className="eco-rack-grid"
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '100%',
                    height: '100%',
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                    gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                    minHeight: 0,
                    minWidth: 0,
                    gap: 0,
                  }}
                />

                {/* Bus horizontal: conecta los módulos */}
                {shown.length > 1 && (
                  <div aria-hidden style={{
                    position: 'absolute',
                    top: gridRows > 1 ? '50%' : '85%',
                    left: 0, right: 0,
                    zIndex: 3,
                    pointerEvents: 'none',
                    height: 0,
                    transform: 'translateY(-50%)',
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: 0, right: 0,
                      height: 1,
                      background: `linear-gradient(90deg, ${ECO.accent}33 0%, ${ECO.accent}66 20%, ${ECO.accent2}77 50%, ${ECO.accent}66 80%, ${ECO.accent}33 100%)`,
                      boxShadow: `0 0 10px ${ECO.accent}44, 0 0 24px ${ECO.accent}18`,
                    }} />
                    <div style={{
                      position: 'absolute',
                      left: 0, right: 0,
                      top: -20, height: 40,
                      background: `linear-gradient(90deg, transparent, ${ECO.accentSoft} 20%, ${ECO.accentSoft} 80%, transparent)`,
                      filter: 'blur(12px)',
                    }} />
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{
                        position: 'absolute', top: 0,
                        width: 3, height: 3, borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: '#fff',
                        boxShadow: `0 0 5px #fff, 0 0 12px ${ECO.accent}`,
                        animation: `eco-bus-flow ${3.5 + i * 1}s linear infinite`,
                        animationDelay: `${i * 1.4}s`,
                      }} />
                    ))}
                  </div>
                )}

                {/* Líneas verticales de separación entre columnas */}
                {Array.from({ length: gridCols - 1 }, (_, i) => i + 1).map((col) => (
                  <div key={col} aria-hidden style={{
                    position: 'absolute',
                    top: '4%', bottom: '4%',
                    left: `${(col / gridCols) * 100}%`,
                    width: 1,
                    zIndex: 3,
                    pointerEvents: 'none',
                    background: `linear-gradient(180deg, transparent 0%, ${ECO.line} 15%, ${ECO.accent}44 48%, ${ECO.accent2}44 52%, ${ECO.line} 85%, transparent 100%)`,
                  }} />
                ))}
              </div>

              {/* Panel lateral: menú del módulo activo */}
              <div style={{
                minHeight: 0, minWidth: 0,
                borderLeft: `1px solid ${ECO.line}`,
                background: ECO.panel,
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ height: 2, background: ECO.accentGrad, flexShrink: 0, opacity: 0.9 }} />
                {/* Indicador del módulo activo */}
                {active && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px',
                    borderBottom: `1px solid ${ECO.line}`,
                    background: ECO.elevated,
                    flexShrink: 0,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: DEVICE_TINT[active],
                      boxShadow: `0 0 8px ${DEVICE_TINT[active]}`,
                    }} />
                    <span style={{
                      fontFamily: ECO.fontMono, fontSize: 10,
                      letterSpacing: '0.16em', textTransform: 'uppercase',
                      color: DEVICE_TINT[active], fontWeight: 700,
                    }}>
                      {DEVICE_REGISTRY.find(d => d.kind === active)?.label}
                    </span>
                    <span style={{
                      fontFamily: ECO.fontMono, fontSize: 8,
                      letterSpacing: '0.1em', color: ECO.dim,
                      marginLeft: 'auto',
                    }}>
                      EDITANDO
                    </span>
                  </div>
                )}
                <div
                  ref={setPanelSlot}
                  className="eco-panel-scroll"
                  style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Editores montados (renderizan vía portales a los slots) */}
      {shown.map((d) => (
        <React.Fragment key={d.kind}>
          {d.render({
            embedded: true,
            embeddedTitle: d.label,
            embeddedTint: DEVICE_TINT[d.kind],
            sceneSlot,
            panelSlot,
            active: active === d.kind,
            onActivate: () => setActive(d.kind),
          })}
        </React.Fragment>
      ))}

      <style>{ECO_KEYFRAMES}</style>
    </div>
  )
}

/**
 * Fondo técnico del ecosistema: gradiente grafito neutro + micro-rejilla de
 * plano de ingeniería + viñeta. Sustituye el starfield: cero puntos de color
 * que compitan con los LEDs de estado reales.
 */
const TechBackground: React.FC = () => (
  <div
    aria-hidden
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
      background: `radial-gradient(1400px 900px at 32% 18%, #101318 0%, ${ECO.void} 55%, #050607 100%)`,
    }}
  >
    {/* Micro-rejilla de plano técnico */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(${ECO.grid} 1px, transparent 1px),
          linear-gradient(90deg, ${ECO.grid} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(1200px 800px at 40% 30%, rgba(0,0,0,0.9), transparent 80%)',
        WebkitMaskImage: 'radial-gradient(1200px 800px at 40% 30%, rgba(0,0,0,0.9), transparent 80%)',
      }}
    />
    {/* Viñeta inferior: asienta la composición */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.5) 100%)',
      }}
    />
  </div>
)

/**
 * Escenario de inspección técnica del área 3D: piso de rejilla en
 * perspectiva, línea de horizonte y marco de esquinas tipo visor industrial
 * con readout de estado. Da soporte físico a los modelos (dejan de "flotar").
 */
const BenchStage: React.FC<{ deviceCount: number }> = ({ deviceCount }) => (
  <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
    {/* Piso técnico en perspectiva (mitad inferior) */}
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '46%',
        perspective: '520px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '-40% -30% 0',
          transform: 'rotateX(58deg)',
          transformOrigin: 'bottom',
          backgroundImage: `
            linear-gradient(${ECO.gridStrong} 1px, transparent 1px),
            linear-gradient(90deg, ${ECO.gridStrong} 1px, transparent 1px)`,
          backgroundSize: '52px 52px',
          maskImage: 'linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 78%)',
          WebkitMaskImage: 'linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 78%)',
        }}
      />
    </div>
    {/* Línea de horizonte del banco */}
    <div
      style={{
        position: 'absolute',
        left: '4%',
        right: '4%',
        bottom: '46%',
        height: 1,
        background: `linear-gradient(90deg, transparent, ${ECO.hair} 20%, ${ECO.hair} 80%, transparent)`,
      }}
    />
    {/* Marco de inspección: esquinas tipo visor */}
    {([
      { top: 14, left: 14, bt: true, bl: true },
      { top: 14, right: 14, bt: true, br: true },
      { bottom: 14, left: 14, bb: true, bl: true },
      { bottom: 14, right: 14, bb: true, br: true },
    ] as const).map((c, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          ...('top' in c ? { top: c.top } : {}),
          ...('bottom' in c ? { bottom: c.bottom } : {}),
          ...('left' in c ? { left: c.left } : {}),
          ...('right' in c ? { right: c.right } : {}),
          width: 18,
          height: 18,
          borderTop: 'bt' in c ? `1px solid ${ECO.line}` : 'none',
          borderBottom: 'bb' in c ? `1px solid ${ECO.line}` : 'none',
          borderLeft: 'bl' in c ? `1px solid ${ECO.line}` : 'none',
          borderRight: 'br' in c ? `1px solid ${ECO.line}` : 'none',
        }}
      />
    ))}
    {/* Readout de estado del banco */}
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 42,
        fontFamily: ECO.fontMono,
        fontSize: 9,
        letterSpacing: '0.22em',
        color: ECO.dim,
        textTransform: 'uppercase',
        opacity: 0.8,
      }}
    >
      Banco de pruebas · {deviceCount} {deviceCount === 1 ? 'unidad' : 'unidades'}
    </div>
  </div>
)

/**
 * Riel de docking del ecosistema: barra luminosa cerca del borde inferior a
 * la que cada dispositivo se "acopla". Cada modelo tiene su puerto en el riel,
 * una placa de identificación (nombre + estado) centrada bajo el modelo y un
 * haz vertical que sube del puerto hacia el dispositivo. Pulsos de datos
 * recorren el riel entre puertos. Todo anclado al borde inferior para que el
 * layout sea estable sin importar el tamaño de cada modelo 3D.
 */
interface DockDevice {
  kind: DeviceKind
  label: string
  tint: string
  active: boolean
  live: boolean
}

const RAIL_Y = 74      // px desde el borde inferior hasta el riel
const PLATE_Y = 22     // px desde el borde inferior hasta la placa

const EcosystemDock: React.FC<{
  devices: DockDevice[]
  onSelect: (k: DeviceKind) => void
}> = ({ devices, onSelect }) => {
  // Los canvases son flex children iguales → sus centros están en fracciones
  // regulares de la anchura del contenedor.
  const n = devices.length
  const centers = devices.map((_, i) => ((i + 0.5) / n) * 100)
  const first = centers[0]
  const last = centers[n - 1]
  const railWidth = last - first
  const multi = n > 1

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      {multi && (
        <>
          {/* Halo suave del riel */}
          <div
            style={{
              position: 'absolute',
              bottom: RAIL_Y - 40,
              left: `${first}%`,
              width: `${railWidth}%`,
              height: 90,
              background: `radial-gradient(ellipse at center, ${ECO.accentSoft} 0%, transparent 70%)`,
              filter: 'blur(16px)',
            }}
          />
          {/* Línea principal del riel */}
          <div
            style={{
              position: 'absolute',
              bottom: RAIL_Y,
              left: `${first}%`,
              width: `${railWidth}%`,
              height: 1,
              background: `linear-gradient(90deg,
                transparent 0%,
                ${ECO.accent}77 6%,
                ${ECO.accent2}99 50%,
                ${ECO.accent}77 94%,
                transparent 100%)`,
              boxShadow: `0 0 10px ${ECO.accent}77, 0 0 22px ${ECO.accent}33`,
            }}
          />
          {/* Pulsos de datos: contenedor que abarca el riel; los puntos
              animan `left` 0→100% dentro de él */}
          <div
            style={{
              position: 'absolute',
              bottom: RAIL_Y,
              left: `${first}%`,
              width: `${railWidth}%`,
              height: 0,
              overflow: 'visible',
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: 0,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: '#fff',
                  boxShadow: `0 0 8px #fff, 0 0 16px ${ECO.accent}`,
                  animation: `eco-bus-flow ${3.2 + i * 0.9}s linear infinite`,
                  animationDelay: `${i * 1.3}s`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {devices.map((d, i) => (
        <React.Fragment key={d.kind}>
          {/* Haz vertical: del puerto hacia el modelo (más intenso si activo) */}
          <div
            style={{
              position: 'absolute',
              bottom: RAIL_Y,
              left: `${centers[i]}%`,
              width: 1,
              height: '32%',
              transform: 'translateX(-50%)',
              background: `linear-gradient(0deg, ${d.tint}${d.active ? '66' : '26'} 0%, transparent 100%)`,
              transition: 'background 0.3s',
            }}
          />
          {/* Puerto en el riel */}
          <div
            style={{
              position: 'absolute',
              bottom: RAIL_Y,
              left: `${centers[i]}%`,
              width: d.active ? 11 : 8,
              height: d.active ? 11 : 8,
              borderRadius: '50%',
              transform: 'translate(-50%, 50%)',
              background: d.tint,
              opacity: d.active ? 1 : 0.55,
              boxShadow: d.active
                ? `0 0 12px ${d.tint}, 0 0 28px ${d.tint}88`
                : `0 0 6px ${d.tint}66`,
              animation: d.active ? 'eco-port-pulse 2.4s ease-in-out infinite' : undefined,
              transition: 'all 0.3s',
            }}
          />
          {/* Placa de identificación: clicable, activa el editor */}
          <button
            onClick={() => onSelect(d.kind)}
            style={{
              position: 'absolute',
              bottom: PLATE_Y,
              left: `${centers[i]}%`,
              transform: 'translateX(-50%)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 999,
              border: `1px solid ${d.active ? d.tint : ECO.line}`,
              background: d.active ? 'rgba(14,14,18,0.88)' : 'rgba(14,14,18,0.62)',
              backdropFilter: 'blur(10px)',
              boxShadow: d.active ? `0 0 18px -4px ${d.tint}` : '0 2px 10px rgba(0,0,0,0.4)',
              transition: 'all 0.25s',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: d.live ? d.tint : '#4A4A52',
                boxShadow: d.live ? `0 0 8px ${d.tint}` : 'none',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: ECO.fontMono,
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: d.active ? d.tint : ECO.dim,
                fontWeight: d.active ? 700 : 500,
                whiteSpace: 'nowrap',
              }}
            >
              {d.label}
            </span>
            {d.active && (
              <span
                style={{
                  fontFamily: ECO.fontMono,
                  fontSize: 8,
                  letterSpacing: '0.1em',
                  color: '#0E0E10',
                  background: d.tint,
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontWeight: 700,
                }}
              >
                EDITANDO
              </span>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  )
}

const EmptyState: React.FC<{ midiSupported: boolean }> = ({ midiSupported }) => (
  <div
    style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      color: ECO.dim,
      gap: 14,
      padding: 24,
    }}
  >
    <div
      style={{
        fontFamily: ECO.fontDisplay,
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: '0.1em',
        background: ECO.accentGrad,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      {midiSupported ? 'CONECTA TU CREART' : 'WEB MIDI NO SOPORTADO'}
    </div>
    <p style={{ maxWidth: 440, fontSize: 14, lineHeight: 1.6, margin: 0, fontFamily: ECO.fontBody }}>
      {midiSupported
        ? 'Conecta tu Beato 16, BEATO 8, WAVO, FADO, MIXO o KNOBO por USB y aparecerá automáticamente en tu ecosistema. ' +
          'También puedes abrir un editor desde los botones de arriba.'
        : 'Usa Chrome o Edge para acceder a tus controladores por Web MIDI.'}
    </p>
  </div>
)

export default UnifiedEditorPage
