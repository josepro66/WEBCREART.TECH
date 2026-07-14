/**
 * ConfigPanel.tsx — Panel lateral del editor MIDI 3D.
 * Portado a TS/React del HTML standalone. Incluye Ruteo MIDI,
 * Comportamiento, Velocity/Rango CC y Funciones (shift+pad).
 */

import React, { useState, useEffect } from 'react'
import {
  type Bank,
  type ControlId,
  type ControlState,
  behaviorsFor,
  isPad,
  labelFor,
  PARAM_LABELS,
} from './midiState'
import { DAW_ACTIONS, DAWS, shortcutLabel } from './dawData'

export interface CustomShiftKey {
  keyLabel: string
  code: string
  label: string
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
}

interface Props {
  selectedId: ControlId | null
  bank: Bank
  state: ControlState
  onUpdate: (id: ControlId, bank: Bank, patch: Partial<ControlState[ControlId][Bank]>) => void
  onApplyVelAll: (id: ControlId, bank: Bank) => void
  // Shift config
  shiftHeld: boolean
  shiftConfigSticky: boolean
  shiftActions: Record<string, string>
  customShiftKeys: Record<string, CustomShiftKey>
  currentDaw: string
  onUpdateShiftAction: (padId: string, actionId: string) => void
  onUpdateCustomKey: (padId: string, key: CustomShiftKey) => void
  onUpdateCustomKeyLabel: (padId: string, label: string) => void
  // DAW
  onChangeDaw: (dawId: string) => void
  // Save/load/export
  onSaveConfig: () => void
  onLoadConfig: () => void
  onExportJson: () => void
  onSaveToDevice: () => void
  onFactoryReset: () => void
  deviceSaveStatus: string
  deviceSaveProgress: number | null
}

const ConfigPanel: React.FC<Props> = ({
  selectedId,
  bank,
  state,
  onUpdate,
  onApplyVelAll,
  shiftHeld,
  shiftConfigSticky,
  shiftActions,
  customShiftKeys,
  currentDaw,
  onUpdateShiftAction,
  onUpdateCustomKey,
  onUpdateCustomKeyLabel,
  onChangeDaw,
  onSaveConfig,
  onLoadConfig,
  onExportJson,
  onSaveToDevice,
  onFactoryReset,
  deviceSaveStatus,
  deviceSaveProgress,
}) => {
  const [capturingFor, setCapturingFor] = useState<string | null>(null)

  // Captura de tecla personalizada
  useEffect(() => {
    if (!capturingFor) return
    const handler = (e: KeyboardEvent) => {
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return
      e.preventDefault()
      const parts: string[] = []
      if (e.ctrlKey) parts.push('Ctrl')
      if (e.metaKey) parts.push('Cmd')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
      const keyLabel = parts.join('+')
      const existing = customShiftKeys[capturingFor]
      onUpdateCustomKey(capturingFor, {
        keyLabel,
        code: e.code,
        label: existing?.label || '',
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      })
      setCapturingFor(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [capturingFor, customShiftKeys, onUpdateCustomKey])

  const showShiftBlock =
    selectedId !== null && isPad(selectedId) && (shiftHeld || shiftConfigSticky)
  const showMidiBlock = !showShiftBlock

  if (!selectedId) {
    return (
      <div>
        <SetupSection
          currentDaw={currentDaw}
          onChangeDaw={onChangeDaw}
          onSaveConfig={onSaveConfig}
          onLoadConfig={onLoadConfig}
          onExportJson={onExportJson}
          onSaveToDevice={onSaveToDevice}
          onFactoryReset={onFactoryReset}
          deviceSaveStatus={deviceSaveStatus}
          deviceSaveProgress={deviceSaveProgress}
        />
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center', padding: '48px 0' }}>
          <div
            style={{
              width: 46, height: 46, borderRadius: 12,
              border: '1px dashed rgba(200,255,77,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#C8FF4D', fontSize: 18,
            }}
          >◉</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: '#D8DBE0', textTransform: 'uppercase' }}>
            Selecciona un control
          </div>
          <div style={{ color: '#8A919E', fontSize: 12.5, lineHeight: 1.6, maxWidth: 280 }}>
            Haz clic en un pad, knob o fader del modelo 3D — o tócalo en el hardware — para configurar su ruteo MIDI.
          </div>
        </div>
      </div>
    )
  }

  const s = state[selectedId][bank]
  const pad = isPad(selectedId)
  const isEncoder = selectedId.startsWith('k') || selectedId.startsWith('f')
  const isFader = selectedId === 'f0'
  const behaviors = behaviorsFor(selectedId)

  // Visibility helpers
  const showPcLabel = pad && s.type === 'pc'
  const showModeRow = pad && s.type !== 'pc' && s.type !== 'pb'
  const hideVelBlock = pad && (s.type === 'pc' || s.type === 'pb')

  return (
    <div style={{ color: '#F2F1ED', fontFamily: 'Inter, sans-serif' }}>
      <SetupSection
        currentDaw={currentDaw}
        onChangeDaw={onChangeDaw}
        onSaveConfig={onSaveConfig}
        onLoadConfig={onLoadConfig}
        onExportJson={onExportJson}
        onSaveToDevice={onSaveToDevice}
        onFactoryReset={onFactoryReset}
        deviceSaveStatus={deviceSaveStatus}
        deviceSaveProgress={deviceSaveProgress}
      />

      <p style={titleStyle}>CONTROL SELECCIONADO · BANCO {bank}</p>
      <p style={nameStyle}>{labelFor(selectedId)}</p>

      {/* ── Ruteo MIDI + Comportamiento ── */}
      {showMidiBlock && (
        <>
          <p style={sectionTitle}>Ruteo MIDI</p>
          <div style={cardStyle}>
            <div style={rowStyle}>
              {/* Tipo */}
              <Field label="Tipo" info={"Note: dispara notas musicales.\nCC: controla parámetros como volumen.\nPC: cambia de programa/preset en el DAW."}>
                <select
                  value={s.type}
                  onChange={(e) =>
                    onUpdate(selectedId, bank, { type: e.target.value as 'note' | 'cc' | 'pc' | 'pb' })
                  }
                  style={inputStyle}
                >
                  <option value="note">Note</option>
                  <option value="cc">CC</option>
                  <option value="pc">PC</option>
                  {isFader && <option value="pb">Pitch Bend</option>}
                </select>
              </Field>
              {/* Número — oculto (no eliminado) para PB, igual que el HTML */}
              <Field
                label={s.type === 'note' ? 'Nota' : s.type === 'pc' ? 'Programa' : s.type === 'pb' ? '—' : 'CC'}
                info={"El número que identifica exactamente\nqué nota o control se activa (0-127).\nDebe coincidir con lo que espera tu DAW."}
              >
                <input
                  type="number"
                  min={0}
                  max={127}
                  value={s.num}
                  onChange={(e) =>
                    onUpdate(selectedId, bank, { num: parseInt(e.target.value || '0') })
                  }
                  style={{ ...inputStyle, visibility: s.type === 'pb' ? 'hidden' : 'visible' }}
                />
              </Field>
              {/* Canal */}
              <Field label="Canal" info={"Es como una 'línea' separada de\ncomunicación. Pon el mismo número\nque tienes configurado en tu DAW."}>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={s.chan}
                  onChange={(e) =>
                    onUpdate(selectedId, bank, { chan: Math.max(1, Math.min(16, parseInt(e.target.value || '1'))) })
                  }
                  style={inputStyle}
                />
              </Field>
            </div>

            {/* Nombre del preset (pad + PC) */}
            {showPcLabel && (
              <div style={{ marginTop: 10 }}>
                <Field label="Nombre del preset" info={"Nombre que aparece en el pad.\nAyuda a identificar el preset\nque carga este pad en live."}>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="ej: Cuerdas"
                    value={s.pcLabel || ''}
                    onChange={(e) => onUpdate(selectedId, bank, { pcLabel: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
              </div>
            )}

            {/* Modo (solo pads, no para pc/pb) */}
            {showModeRow && (
              <div style={{ ...rowStyle, marginTop: 10 }}>
                <Field label="Modo" info={"Momentáneo: suena mientras lo aprietas\ny para cuando sueltas.\nToggle: un toque enciende, otro apaga."}>
                  <select
                    value={s.mode}
                    onChange={(e) =>
                      onUpdate(selectedId, bank, { mode: e.target.value as 'momentary' | 'toggle' })
                    }
                    style={inputStyle}
                  >
                    <option value="momentary">Momentáneo</option>
                    <option value="toggle">Toggle</option>
                  </select>
                </Field>
              </div>
            )}
          </div>

          {/* Comportamiento */}
          <p style={sectionTitle}>Comportamiento</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {behaviors.map((beh) => {
              const active = beh.id === s.behavior
              return (
                <button
                  key={beh.id}
                  data-info={beh.info}
                  onClick={() => {
                    const patch: Partial<ControlState[ControlId][Bank]> = { behavior: beh.id }
                    // Reset vel ranges when switching behavior
                    if (isEncoder) {
                      if (beh.id === 'random') {
                        patch.velMin = 0
                        patch.velMax = 0
                      } else {
                        patch.velMin = 0
                        patch.velMax = 127
                      }
                    }
                    onUpdate(selectedId, bank, patch)
                  }}
                  style={{
                    ...behaviorBtn,
                    borderColor: active ? '#C8FF4D' : '#2E2E33',
                    background: active ? 'rgba(200,255,77,0.08)' : '#232327',
                  }}
                >
                  <div style={{ ...iconCircle, color: active ? '#C8FF4D' : '#9A9890' }}>
                    {beh.icon}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{beh.name}</div>
                    <div style={{ fontSize: 12, color: '#9A9890', marginTop: 2 }}>{beh.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Param slider */}
          {s.behavior !== 'directo' && (
            <div style={{ marginBottom: 20 }} data-info={"Mueve este control para ajustar\nla intensidad o velocidad del\nefecto que elegiste arriba."}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  color: '#9A9890',
                  marginBottom: 8,
                }}
              >
                <span>{PARAM_LABELS[s.behavior] || 'Cantidad'}</span>
                <span>{s.param}</span>
              </div>
              <input
                type="range"
                min={0}
                max={s.behavior === 'random' && isEncoder ? 127 : 100}
                value={s.param}
                onChange={(e) =>
                  onUpdate(selectedId, bank, { param: parseInt(e.target.value) })
                }
                style={{ width: '100%', accentColor: '#C8FF4D' }}
              />
            </div>
          )}

          {/* Velocity / CC Range block */}
          {!hideVelBlock && (
            <VelBlock
              id={selectedId}
              bank={bank}
              s={s}
              isEncoder={isEncoder}
              onUpdate={onUpdate}
              onApplyVelAll={onApplyVelAll}
            />
          )}
        </>
      )}

      {/* ── Funciones (Shift + Pad) ── */}
      {showShiftBlock && selectedId.startsWith('p') && (
        <ShiftBlock
          padId={selectedId}
          currentDaw={currentDaw}
          shiftActions={shiftActions}
          customShiftKeys={customShiftKeys}
          capturingFor={capturingFor}
          onUpdateShiftAction={onUpdateShiftAction}
          onStartCapture={() => setCapturingFor(selectedId)}
          onUpdateCustomKeyLabel={onUpdateCustomKeyLabel}
        />
      )}
    </div>
  )
}

// ── Bloque Velocity / Rango CC ───────────────────────────────────

interface VelBlockProps {
  id: ControlId
  bank: Bank
  s: ControlState[ControlId][Bank]
  isEncoder: boolean
  onUpdate: (id: ControlId, bank: Bank, patch: Partial<ControlState[ControlId][Bank]>) => void
  onApplyVelAll: (id: ControlId, bank: Bank) => void
}

const VelBlock: React.FC<VelBlockProps> = ({ id, bank, s, isEncoder, onUpdate, onApplyVelAll }) => {
  const isPadCtrl = id.startsWith('p')
  const isRandomEncoder = isEncoder && s.behavior === 'random'

  let title = 'Fuerza del golpe (velocity)'
  if (isRandomEncoder) title = 'Configuración del salto'
  else if (isEncoder) title = 'Rango de salida (CC)'

  const applyLabel = isPadCtrl
    ? '→ Aplicar a todos los pads'
    : id.startsWith('k')
    ? '→ Aplicar a todos los knobs'
    : '→ Aplicar a todos los knobs y fader'

  const clamp = (v: number) => Math.max(0, Math.min(127, v))

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ ...sectionTitle, marginBottom: 8 }}>{title}</p>

      {/* Modo sliders (knob random) */}
      {isRandomEncoder ? (
        <div>
          <SliderRow
            label="Velocidad"
            value={s.velMin ?? 0}
            onChange={(v) => onUpdate(id, bank, { velMin: v })}
          />
          <SliderRow
            label="Suavizado"
            value={s.velMax ?? 0}
            onChange={(v) => onUpdate(id, bank, { velMax: v })}
          />
        </div>
      ) : (
        /* Modo numérico */
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {/* Mínimo — solo si random (pads) o encoder */}
          {(isPadCtrl ? (s.velRandom ?? false) : true) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }} data-info={"El valor mínimo del rango.\nPara pads: la fuerza mínima al azar.\nPara knobs/fader: el CC mínimo de salida."}>
              <label style={labelSmall}>Mínimo</label>
              <input
                type="number"
                min={0}
                max={127}
                value={s.velMin ?? 0}
                onBlur={(e) => {
                  let v = clamp(parseInt(e.target.value) || 0)
                  if (v > (s.velMax ?? 127)) v = s.velMax ?? 127
                  onUpdate(id, bank, { velMin: v })
                }}
                onChange={(e) => onUpdate(id, bank, { velMin: clamp(parseInt(e.target.value) || 0) })}
                style={{ ...inputStyle, width: 64 }}
              />
            </div>
          )}

          {/* Máximo / Fuerza */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }} data-info={"La fuerza máxima del golpe (pads)\no el valor máximo que puede enviar\nel knob/fader (CC)."}>
            <label style={labelSmall}>{isPadCtrl && !(s.velRandom) ? 'Fuerza' : 'Máximo'}</label>
            <input
              type="number"
              min={0}
              max={127}
              value={s.velMax ?? 127}
              onBlur={(e) => {
                let v = clamp(parseInt(e.target.value) || 0)
                if (isPadCtrl && !(s.velRandom)) {
                  // Velocidad fija: min = max
                  onUpdate(id, bank, { velMax: v, velMin: v })
                } else {
                  if (v < (s.velMin ?? 0)) v = s.velMin ?? 0
                  onUpdate(id, bank, { velMax: v })
                }
              }}
              onChange={(e) => onUpdate(id, bank, { velMax: clamp(parseInt(e.target.value) || 0) })}
              style={{ ...inputStyle, width: 64 }}
            />
          </div>

          {/* Botón Aleatorio (solo pads) */}
          {isPadCtrl && (
            <button
              data-info={"Cuando está activo, cada golpe\nelige al azar una fuerza dentro\ndel rango Mínimo → Máximo."}
              onClick={() => {
                const newRandom = !(s.velRandom ?? false)
                const patch: Partial<ControlState[ControlId][Bank]> = { velRandom: newRandom }
                if (!newRandom) patch.velMin = s.velMax  // al desactivar: min=max
                onUpdate(id, bank, patch)
              }}
              style={{
                ...setupToggleStyle,
                marginBottom: 0,
                borderColor: (s.velRandom) ? '#C8FF4D' : '#2E2E33',
                color: (s.velRandom) ? '#C8FF4D' : '#9A9890',
                padding: '6px 10px',
                fontSize: 11,
              }}
            >
              Aleatorio: {(s.velRandom) ? 'On' : 'Off'}
            </button>
          )}
        </div>
      )}

      {/* Aplicar a todos */}
      <button
        data-info={"Aplica este rango a todos los controles\ndel mismo tipo en todos los bancos."}
        onClick={() => onApplyVelAll(id, bank)}
        style={{ ...setupToggleStyle, marginBottom: 0, fontSize: 11, padding: '5px 10px' }}
      >
        {applyLabel}
      </button>
    </div>
  )
}

const SliderRow: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({
  label, value, onChange,
}) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9A9890', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
      <span>{label}</span><span>{value}</span>
    </div>
    <input
      type="range" min={0} max={100} value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      style={{ width: '100%', accentColor: '#C8FF4D' }}
    />
  </div>
)

// ── Sección de configuración / DAW ──────────────────────────────

interface SetupProps {
  currentDaw: string
  onChangeDaw: (id: string) => void
  onSaveConfig: () => void
  onLoadConfig: () => void
  onExportJson: () => void
  onSaveToDevice: () => void
  onFactoryReset: () => void
  deviceSaveStatus: string
  deviceSaveProgress: number | null
}

const SetupSection: React.FC<SetupProps> = ({
  currentDaw,
  onChangeDaw,
  onSaveConfig,
  onLoadConfig,
  onExportJson,
  onSaveToDevice,
  onFactoryReset,
  deviceSaveStatus,
  deviceSaveProgress,
}) => {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        data-info={"Abre el menú de ajustes: elige\ntu programa de música, guarda\ntus configuraciones y más."}
        style={{
          ...setupToggleStyle,
          borderColor: open ? '#C8FF4D' : '#2E2E33',
          color: open ? '#C8FF4D' : '#9A9890',
        }}
      >
        ⚙ Configuración
      </button>

      {open && (
        <div style={setupPanelStyle}>
          <div style={{ marginBottom: 12 }} data-info={"Elige el programa de música que usas\n(Ableton, Logic, etc.) y los controles\nse adaptan solos a ese programa."}>
            <label style={labelSmall}>DAW</label>
            <select
              value={currentDaw}
              onChange={(e) => onChangeDaw(e.target.value)}
              style={{ ...inputStyle, width: '100%', marginTop: 4 }}
            >
              {DAWS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A9890', margin: '6px 0 0', lineHeight: 1.5 }}>
              Elegir un DAW carga su ruteo de funciones. Podés editar cualquier control y guardar.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            <SetupBtn onClick={onSaveConfig} info={"Guarda todos tus ajustes en un\narchivo en tu computador. Puedes\nabrirlo después cuando quieras."}>Guardar config</SetupBtn>
            <SetupBtn onClick={onLoadConfig} info={"Carga un archivo de ajustes\nque hayas guardado antes.\nTodo vuelve exactamente igual."}>Abrir config</SetupBtn>
            <SetupBtn onClick={onExportJson} info={"Crea una copia extra de tus ajustes\ncomo archivo de texto. Es solo un\nrespaldo adicional por si acaso."}>Exportar JSON</SetupBtn>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <SetupBtn primary onClick={onSaveToDevice} info={"Graba los ajustes dentro del Beato 16.\nAsí funcionará igual aunque lo conectes\na otro computador sin esta app."}>Guardar en Beato 16</SetupBtn>
            <SetupBtn danger onClick={onFactoryReset} info={"Borra toda la configuración actual\ny vuelve a los valores de fábrica.\nEsta acción no se puede deshacer."}>↺ Valores de fábrica</SetupBtn>
          </div>

          {deviceSaveStatus && (
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A9890', margin: '8px 0 0' }}>
              {deviceSaveStatus}
            </p>
          )}
          {deviceSaveProgress !== null && (
            <div style={{ marginTop: 8 }}>
              <div style={{ background: '#2E2E33', borderRadius: 3, height: 4 }}>
                <div
                  style={{
                    height: '100%',
                    width: `${deviceSaveProgress}%`,
                    background: '#C8FF4D',
                    borderRadius: 3,
                    transition: 'width 0.2s',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Shift block ──────────────────────────────────────────────────

interface ShiftBlockProps {
  padId: string
  currentDaw: string
  shiftActions: Record<string, string>
  customShiftKeys: Record<string, CustomShiftKey>
  capturingFor: string | null
  onUpdateShiftAction: (padId: string, actionId: string) => void
  onStartCapture: () => void
  onUpdateCustomKeyLabel: (padId: string, label: string) => void
}

const ShiftBlock: React.FC<ShiftBlockProps> = ({
  padId,
  currentDaw,
  shiftActions,
  customShiftKeys,
  capturingFor,
  onUpdateShiftAction,
  onStartCapture,
  onUpdateCustomKeyLabel,
}) => {
  const currentAction = shiftActions[padId] || 'none'
  const captured = customShiftKeys[padId]

  const visibleActions = DAW_ACTIONS.filter(
    (a) =>
      a.id === 'none' ||
      a.id === 'custom' ||
      a.id === currentAction ||
      shortcutLabel(a.id, currentDaw) !== 'sin atajo nativo'
  )

  return (
    <div>
      <p style={sectionTitle}>Funciones</p>
      <div style={cardStyle}>
        <Field label="Comando al presionar SHIFT + este pad" info={"Escoge qué hace este pad cuando\nlo presionas junto con SHIFT:\nplay, stop, grabar, cuantizar, etc."}>
          <select
            value={currentAction}
            onChange={(e) => onUpdateShiftAction(padId, e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          >
            {visibleActions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.isCustom || a.id === 'none'
                  ? a.name
                  : `${a.name} (${shortcutLabel(a.id, currentDaw)})`}
              </option>
            ))}
          </select>
        </Field>

        {currentAction !== 'none' && currentAction !== 'custom' && (
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#9A9890', margin: '6px 0 0' }}>
            Atajo nativo en {DAWS.find((d) => d.id === currentDaw)?.name}: {shortcutLabel(currentAction, currentDaw)}
          </p>
        )}

        {currentAction === 'custom' && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={onStartCapture}
                data-info={"Presiona la combinación de teclas\nque quieres y quedará guardada.\nEl Beato la ejecutará con SHIFT+pad."}
                style={setupToggleStyle}
              >
                {capturingFor === padId ? 'Presiona una tecla...' : 'Asignar tecla'}
              </button>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#F2F1ED' }}>
                {captured ? captured.keyLabel : 'Sin tecla asignada'}
              </span>
            </div>
            <Field label="Nombre del atajo (para identificarlo fácil)">
              <input
                type="text"
                placeholder="ej. Mi Macro, Toggle FX..."
                value={captured?.label || ''}
                onChange={(e) => onUpdateCustomKeyLabel(padId, e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>
        )}
      </div>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A9890', margin: '8px 0 0', lineHeight: 1.5 }}>
        Mientras SHIFT está presionado este pad ejecuta el comando en vez de su nota/CC normal.
        Al soltar SHIFT vuelve a su asignación MIDI habitual. Este combo es el mismo en cualquier banco (A, B o C).
      </p>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

const SetupBtn: React.FC<{
  children: React.ReactNode
  onClick: () => void
  primary?: boolean
  danger?: boolean
  info?: string
}> = ({ children, onClick, primary, danger, info }) => (
  <button
    onClick={onClick}
    data-info={info}
    style={{
      fontFamily: 'JetBrains Mono, monospace',
      background: primary ? '#C8FF4D' : '#232327',
      color: primary ? '#0E0E10' : danger ? '#ff6b6b' : '#F2F1ED',
      border: `1px solid ${primary ? '#C8FF4D' : danger ? '#ff6b6b' : '#2E2E33'}`,
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
      cursor: 'pointer',
      fontWeight: primary ? 700 : 400,
    }}
  >
    {children}
  </button>
)

const Field: React.FC<{ label: string; children: React.ReactNode; info?: string }> = ({ label, children, info }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }} data-info={info}>
    <label style={labelSmall}>{label}</label>
    {children}
  </div>
)

// ── Estilos ──────────────────────────────────────────────────────

const titleStyle: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 12,
  color: '#9A9890',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  margin: '0 0 4px',
}

const nameStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 500,
  margin: '0 0 20px',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  margin: '0 0 10px',
  color: '#9A9890',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const cardStyle: React.CSSProperties = {
  background: '#232327',
  border: '1px solid #2E2E33',
  borderRadius: 10,
  padding: 14,
  marginBottom: 20,
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'JetBrains Mono, monospace',
  background: '#0E0E10',
  color: '#F2F1ED',
  border: '1px solid #2E2E33',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 13,
  boxSizing: 'border-box',
}

const labelSmall: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 11,
  color: '#9A9890',
}

const setupToggleStyle: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 12,
  background: '#232327',
  color: '#9A9890',
  border: '1px solid #2E2E33',
  borderRadius: 8,
  padding: '7px 12px',
  cursor: 'pointer',
  marginBottom: 12,
}

const setupPanelStyle: React.CSSProperties = {
  background: '#18181B',
  border: '1px solid #2E2E33',
  borderRadius: 10,
  padding: '14px',
  marginBottom: 16,
}

const behaviorBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 10,
  textAlign: 'left',
  border: '1px solid #2E2E33',
  color: '#F2F1ED',
  cursor: 'pointer',
  transition: 'border-color .15s, background .15s',
}

const iconCircle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: '#0E0E10',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 13,
}

export default ConfigPanel
