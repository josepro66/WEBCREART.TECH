import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import {
  MESH_TO_CONTROL,
  type ControlId,
  type ControlState,
  type Bank,
} from './midiState'
import { DAW_ACTIONS } from './dawData'

interface CustomShiftKey {
  keyLabel?: string
  label?: string
}

interface Props {
  selectedId: ControlId | null
  onSelect: (id: ControlId) => void
  bank?: Bank
  onBankChange?: (b: Bank) => void
  /** SHIFT presionado o modo sticky activo → el botón SH (c3) se pinta rojo. */
  shiftActive?: boolean
  /** Pad que disparó el modo shift-sticky → parpadea en rojo. */
  stickyPadId?: ControlId | null
  /** Estado MIDI completo para mostrar etiquetas sobre los controles. */
  midiState?: ControlState
  /** Mostrar/ocultar las etiquetas de mapeo. */
  showLabels?: boolean
  /** Mapeo pad → id de acción shift (DAW_ACTIONS.id). */
  shiftActions?: Record<string, string>
  /** Mapeo pad → tecla personalizada cuando shiftActions[id] === 'custom'. */
  customShiftKeys?: Record<string, CustomShiftKey>
}

const HIGHLIGHT_COLOR = new THREE.Color(0x39ff14)
const PRESS_COLOR = new THREE.Color(0xff3366)
// Rojo del SHIFT — promedio del gradiente del HTML (#ff8a78 → #cc4433)
const SHIFT_RED = new THREE.Color(0xe66b54)
const PRESS_INTENSITY = 0.38


function physicalLabel(id: ControlId): string {
  if (id.startsWith('p')) return String(parseInt(id.slice(1)) + 1)
  if (id.startsWith('k')) return `K${parseInt(id.slice(1)) + 1}`
  if (id === 'f0') return 'F'
  if (id === 'c0') return 'A'
  if (id === 'c1') return 'B'
  if (id === 'c2') return 'C'
  if (id === 'c3') return 'SH'
  return id
}

/** Etiqueta del pad cuando SHIFT está sostenido — replica HTML: shortName de la acción. */
function shiftShortLabel(
  padId: string,
  shiftActions?: Record<string, string>,
  customShiftKeys?: Record<string, CustomShiftKey>
): string {
  const actionId = shiftActions?.[padId]
  if (!actionId || actionId === 'none') return ''
  if (actionId === 'custom') {
    const captured = customShiftKeys?.[padId]
    return captured?.label || 'Custom'
  }
  const action = DAW_ACTIONS.find(a => a.id === actionId)
  return action ? (action.shortName || action.name) : ''
}

const Beato16Scene: React.FC<Props> = ({ selectedId, onSelect, bank, onBankChange, shiftActive, stickyPadId, midiState, showLabels, shiftActions, customShiftKeys }) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const meshesByControlRef = useRef<Record<string, THREE.Mesh[]>>({})
  const pressTargetsRef = useRef<Partial<Record<ControlId, THREE.Object3D>>>({})
  const pressStateRef = useRef<Record<string, { current: number; target: number; restY: number; depth: number }>>({})
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const actionsRef = useRef<Partial<Record<ControlId, THREE.AnimationAction>>>({})
  const onSelectRef = useRef(onSelect)
  const onBankChangeRef = useRef(onBankChange)
  const selectedIdRef = useRef(selectedId)
  const shiftActiveRef = useRef(shiftActive)
  const stickyPadIdRef = useRef(stickyPadId)
  const midiStateRef = useRef(midiState)
  const bankRef = useRef(bank)
  const showLabelsRef = useRef(showLabels)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const modelSizeRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const camDirRef = useRef<THREE.Vector3 | null>(null)
  const controlCentersRef = useRef<Record<string, THREE.Vector3>>({})
  // Compartido con el useEffect MIDI: animación del fader y valor actual 0-127
  const moveFaderRef = useRef<(id: ControlId, value: number) => void>(() => {})
  const faderValueRef = useRef(0)
  // Animación GLB del fader: acción pausada que se scrubea según CC 0-127
  const faderAnimRef = useRef<{ action: THREE.AnimationAction; duration: number } | null>(null)
  const labelPixelsRef = useRef<Record<string, { x: number; y: number }>>({})
  const labelElsRef = useRef<Record<string, HTMLElement>>({})
  const [labelsReady, setLabelsReady] = useState(false)
  const [resizeTick, setResizeTick] = useState(0)
  onSelectRef.current = onSelect
  onBankChangeRef.current = onBankChange
  selectedIdRef.current = selectedId
  shiftActiveRef.current = shiftActive
  stickyPadIdRef.current = stickyPadId
  midiStateRef.current = midiState
  bankRef.current = bank
  showLabelsRef.current = showLabels

  // ── Setup de la escena (una sola vez) ─────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(
      38,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    )
    // Vista top con 15° de inclinación desde el cénit.
    camera.position.set(0, 2.9, 0.78)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera
    camDirRef.current = camera.position.clone().normalize()

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const key = new THREE.DirectionalLight(0xffffff, 1.4)
    key.position.set(4, 6, 3)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xb0d4ff, 0.5)
    fill.position.set(-4, 2, -3)
    scene.add(fill)
    const front = new THREE.DirectionalLight(0xffffff, 0.35)
    front.position.set(0, 1, 4)
    scene.add(front)
    const rim = new THREE.PointLight(0x00e5ff, 0.9, 10)
    rim.position.set(-1, 0.5, -2)
    scene.add(rim)

    // OrbitControls deshabilitado — la vista cenital queda fija
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enabled = false
    controls.enableRotate = false
    controls.enablePan = false
    controls.enableZoom = false
    controls.target.set(0, 0, 0)

    const clock = new THREE.Clock()

    // Auto-fit para vista TOP: encaja X (horizontal) y Z (vertical-pantalla)
    const fitCameraToModel = () => {
      const size = modelSizeRef.current
      const dir = camDirRef.current
      if (!size || !dir || !mount) return
      const aspect = mount.clientWidth / mount.clientHeight
      const fovV = (camera.fov * Math.PI) / 180
      const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect)
      const distV = (size.z / 2) / Math.tan(fovV / 2)
      const distH = (size.x / 2) / Math.tan(fovH / 2)
      const dist = Math.max(distV, distH) * 1.08
      camera.position.copy(dir).multiplyScalar(dist)
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld(true)
    }

    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(`${import.meta.env.BASE_URL}models/BEATO16.glb`, (gltf) => {
      const model = gltf.scene
      // En el GLB los knobs forman una columna vertical en x≈-0.42.
      // Rotamos -90° en Y para que esa columna pase a ser una fila horizontal
      // arriba del dispositivo (vista cenital → coincide con la vista clásica).
      model.rotation.y = -Math.PI / 2
      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const scale = 1.5 / Math.max(size.x, size.y, size.z)
      model.position.sub(center.multiplyScalar(scale))
      model.scale.setScalar(scale)
      // Guardar el tamaño normalizado del modelo para el auto-fit de cámara
      modelSizeRef.current = { x: size.x * scale, y: size.y * scale, z: size.z * scale }
      fitCameraToModel()

      const BLACK  = '#111111'
      const PURPLE = '#7B217E'
      const WHITE  = '#F5F5F5'

      const BUTTON_COLORS: Record<number, string> = {
        1: BLACK,  2: BLACK, 3: BLACK, 4: BLACK,
        5: BLACK, 6: BLACK,  7: BLACK,  8: BLACK,
        9: BLACK, 10: BLACK, 11: BLACK, 12: BLACK,
        13: BLACK, 14: BLACK, 15: BLACK, 16: BLACK,
      }
      const KEY_COLORS: Record<number, string> = {
        1: PURPLE, 2: PURPLE, 3: PURPLE, 4: PURPLE,
      }

      model.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return

        const name = obj.name.toLowerCase()
        // Los meshes de los botones son hijos sin nombre del nodo boton1-16
        // (Blender exporta el transform como nodo y la geometría como hijo)
        const parentName = (obj.parent?.name || '').toLowerCase()

        if (name.includes('cubechasis')) {
          obj.material = new THREE.MeshPhysicalMaterial({
            color: WHITE, metalness: 0.5, roughness: 0.25,
            clearcoat: 1.0, clearcoatRoughness: 0.08,
          })
        } else if (/^b?oton\d+$/.test(name) || /^b?oton\d+$/.test(parentName)) {
          // Cubre boton1-16 y el typo oton4 del GLB (falta la 'b')
          const source = /^b?oton\d+$/.test(name) ? name : parentName
          const numStr = source.match(/\d+$/)?.[0]
          const num = numStr ? parseInt(numStr) : 1
          const col = BUTTON_COLORS[num] ?? '#111111'
          obj.material = new THREE.MeshPhysicalMaterial({
            color: col,
            emissive: new THREE.Color(0x222222),
            emissiveIntensity: 0.3,
            metalness: 0.6, roughness: 0.2,
            clearcoat: 1.0, clearcoatRoughness: 0.05,
            side: THREE.DoubleSide,
          })
        } else if (/^tapa\d+$/.test(name)) {
          const numStr = name.match(/\d+$/)?.[0]
          const num = numStr ? parseInt(numStr) : 1
          const col = BUTTON_COLORS[num] ?? '#111111'
          obj.material = new THREE.MeshPhysicalMaterial({
            color: col,
            emissive: new THREE.Color(0x1a1a1a),
            emissiveIntensity: 0.2,
            metalness: 0.5, roughness: 0.25,
            clearcoat: 1.0, clearcoatRoughness: 0.04,
          })
        } else if (name.includes('knob')) {
          obj.material = new THREE.MeshPhysicalMaterial({
            color: BLACK, metalness: 0.1, roughness: 0.55,
            clearcoat: 0.7, clearcoatRoughness: 0.1,
          })
        } else if (name.includes('tecla')) {
          obj.material = new THREE.MeshPhysicalMaterial({
            color: BLACK,
            metalness: 0.0, roughness: 0.45,
            clearcoat: 1.0, clearcoatRoughness: 0.06,
          })
        } else if (name.includes('fader')) {
          obj.material = new THREE.MeshPhysicalMaterial({
            color: PURPLE, metalness: 0.0, roughness: 0.35,
            clearcoat: 0.9, clearcoatRoughness: 0.08,
          })
        }
      })

      // Agrupar mallas por ControlId para highlighting e interacción.
      // pressTarget = objeto que baja al presionar:
      //   - boton/oton padre cuando el mesh es hijo sin nombre del nodo
      //   - tecla mesh directamente
      //   - tapa* NO es press target (es el aro fijo)
      const meshes: Record<string, THREE.Mesh[]> = {}
      const pressTargets: Partial<Record<ControlId, THREE.Object3D>> = {}
      model.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return
        const nameLc = obj.name.toLowerCase()
        let id: ControlId | undefined = MESH_TO_CONTROL[obj.name]
        let pressTarget: THREE.Object3D | null = null

        if (id) {
          // Mesh propio. Tapas son estáticas; teclas/knobs/fader sí se mueven.
          if (!/^tapa\d+$/.test(nameLc)) pressTarget = obj
        } else if (obj.parent && MESH_TO_CONTROL[obj.parent.name]) {
          // Mesh hijo del nodo boton — la animación mueve el padre
          id = MESH_TO_CONTROL[obj.parent.name]
          pressTarget = obj.parent
        }
        if (!id) return

        ;(obj.userData as Record<string, unknown>).controlId = id
        ;(meshes[id] ||= []).push(obj)
        if (pressTarget && !pressTargets[id]) pressTargets[id] = pressTarget
        const mat = obj.material as THREE.MeshStandardMaterial
        if (mat && 'emissive' in mat) {
          ;(obj.userData as Record<string, unknown>).origEmissive = mat.emissive.clone()
          ;(obj.userData as Record<string, unknown>).origEmissiveIntensity = mat.emissiveIntensity ?? 1
        }
      })
      meshesByControlRef.current = meshes
      pressTargetsRef.current = pressTargets

      // Los encoders (knobs) en el GLB pueden tener el origen del pivote
      // desplazado del centro visual — al rotar en Y hacen un bamboleo.
      // Solución: recentrar la geometría al centro de su bounding box local y
      // compensar la posición del mesh, de modo que la rotación quede fija en
      // el centro visual del knob.
      const _bbox = new THREE.Box3()
      const _c = new THREE.Vector3()
      for (const knobId of ['k0', 'k1', 'k2', 'k3'] as ControlId[]) {
        const knobMeshes = meshes[knobId]
        if (!knobMeshes) continue
        for (const m of knobMeshes) {
          m.geometry.computeBoundingBox()
          if (!m.geometry.boundingBox) continue
          _bbox.copy(m.geometry.boundingBox)
          _bbox.getCenter(_c)
          // Solo recentrar en X y Z; en Y se mantiene la altura original del knob
          if (Math.abs(_c.x) < 1e-6 && Math.abs(_c.z) < 1e-6) continue
          m.geometry.translate(-_c.x, 0, -_c.z)
          m.position.x += _c.x
          m.position.z += _c.z
        }
      }

      actionsRef.current = {}

      // Crear mixer y configurar animación del fader para scrubbing por valor MIDI
      const mixer = new THREE.AnimationMixer(model)
      mixerRef.current = mixer
      faderAnimRef.current = null

      const faderClip = gltf.animations?.find(a => a.name === 'fader1Action')
      if (faderClip) {
        const action = mixer.clipAction(faderClip)
        action.play()
        action.paused = true
        action.clampWhenFinished = true
        action.time = 0
        mixer.update(0) // evaluar en t=0 para posición inicial
        faderAnimRef.current = { action, duration: faderClip.duration }
      }

      scene.add(model)
      // Forzar actualización de matrices ANTES de calcular Box3
      // (sin esto, las posiciones quedan en el origen)
      model.updateMatrixWorld(true)

      // Calcular centro 3D de cada control (en coordenadas mundo)
      const centers: Record<string, THREE.Vector3> = {}
      for (const [id, ms] of Object.entries(meshes)) {
        const box = new THREE.Box3()
        ms.forEach(m => box.expandByObject(m))
        centers[id] = box.getCenter(new THREE.Vector3())
      }
      controlCentersRef.current = centers

      if (selectedIdRef.current) applyHighlight(selectedIdRef.current)
      setLabelsReady(true)
    })

    // Raycaster para clic
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let pressedClickId: ControlId | null = null
    // Estado de drag para el fader: posición Y inicial del pointer y valor inicial
    let faderDragStartY: number | null = null
    let faderDragStartValue = 0

    const hitControl = (e: PointerEvent): ControlId | null => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      for (const h of hits) {
        const id = (h.object.userData as { controlId?: ControlId }).controlId
        if (id) return id
      }
      return null
    }

    const onPointerDown = (e: PointerEvent) => {
      const id = hitControl(e)
      if (!id) return
      pressedClickId = id

      // Fader: iniciar drag-Y desde el pointer actual sin animar press
      if (id === 'f0') {
        faderDragStartY = e.clientY
        faderDragStartValue = faderValueRef.current
        renderer.domElement.setPointerCapture(e.pointerId)
        onSelectRef.current(id)
        return
      }

      // Animar pulsación (posición Y) para botones/teclas
      const pt = pressTargetsRef.current[id]
      if (pt) {
        let s = pressStateRef.current[id]
        if (!s) {
          s = { current: 0, target: 0, restY: pt.position.y, depth: 0.015 }
          pressStateRef.current[id] = s
        }
        s.target = 1
      }
      // Flash emissive rojo — feedback visual visible desde vista cenital
      const ms = meshesByControlRef.current[id]
      ms?.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat && 'emissive' in mat) {
          mat.emissive.set(0xff3366)
          if ('emissiveIntensity' in mat) mat.emissiveIntensity = PRESS_INTENSITY
        }
      })
      // Seleccionar inmediatamente al presionar
      onSelectRef.current(id)
    }

    // Drag del fader: 150px de recorrido = todo el rango 0-127
    const onPointerMove = (e: PointerEvent) => {
      if (faderDragStartY === null || pressedClickId !== 'f0') return
      const dy = faderDragStartY - e.clientY  // arriba = + valor
      const delta = (dy / 150) * 127
      const next = Math.max(0, Math.min(127, Math.round(faderDragStartValue + delta)))
      moveFaderRef.current('f0', next)
    }

    const onPointerUp = () => {
      faderDragStartY = null
      if (!pressedClickId) return
      const id = pressedClickId
      pressedClickId = null
      const s = pressStateRef.current[id]
      if (s) s.target = 0
      // Restaurar emissive: highlight de selección si está seleccionado, o color original
      const ms = meshesByControlRef.current[id]
      ms?.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial
        if (!mat || !('emissive' in mat)) return
        const ud = m.userData as { origEmissive?: THREE.Color; origEmissiveIntensity?: number; controlId?: ControlId }
        if (ud.controlId && ud.controlId === selectedIdRef.current) {
          const hasColor = ud.origEmissive && ud.origEmissive.getHex() !== 0x000000
          if (hasColor) {
            mat.emissive.copy(ud.origEmissive!)
            mat.emissiveIntensity = 0.28
          } else {
            mat.emissive.copy(HIGHLIGHT_COLOR)
            mat.emissiveIntensity = 0.10
          }
        } else if (ud.origEmissive) {
          mat.emissive.copy(ud.origEmissive)
          if ('emissiveIntensity' in mat) mat.emissiveIntensity = ud.origEmissiveIntensity ?? 1
        }
      })
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)

    const onResize = () => {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      fitCameraToModel()
      setResizeTick(t => t + 1)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    let frameId = 0
    const tick = () => {
      const delta = clock.getDelta()
      mixerRef.current?.update(delta)
      // Interpolar press state hacia su target (suaviza la bajada y subida)
      const pressStates = pressStateRef.current
      const speed = Math.min(1, delta * 18) // ~55ms para llegar al target
      for (const id in pressStates) {
        const s = pressStates[id]
        if (s.current === s.target) continue
        s.current += (s.target - s.current) * speed
        if (Math.abs(s.current - s.target) < 0.001) s.current = s.target
        const target = pressTargetsRef.current[id as ControlId]
        if (target) target.position.y = s.restY - s.current * s.depth
      }

      // Pulso de selección: el control seleccionado brilla en verde pulsante
      const selNow = selectedIdRef.current
      if (selNow) {
        const pulse = 0.55 + 0.55 * (0.5 + 0.5 * Math.sin(performance.now() * 0.006))
        const selMeshes = meshesByControlRef.current[selNow]
        selMeshes?.forEach((m) => {
          const mat = m.material as THREE.MeshStandardMaterial
          if (!mat || !('emissive' in mat)) return
          mat.emissive.copy(HIGHLIGHT_COLOR)
          mat.emissiveIntensity = pulse
        })
      }

      // SHIFT rojo: el SH (c3) y el pad sticky parpadean en rojo mientras shift está activo
      if (shiftActiveRef.current || stickyPadIdRef.current) {
        const blink = 0.22 + 0.30 * (0.5 + 0.5 * Math.sin(performance.now() * 0.006))
        const paintRed = (cid: ControlId) => {
          const ms = meshesByControlRef.current[cid]
          ms?.forEach((m) => {
            const mat = m.material as THREE.MeshStandardMaterial
            if (mat && 'emissive' in mat) {
              mat.emissive.copy(SHIFT_RED)
              if ('emissiveIntensity' in mat) mat.emissiveIntensity = blink
            }
          })
        }
        if (shiftActiveRef.current) paintRed('c3')
        if (stickyPadIdRef.current) paintRed(stickyPadIdRef.current)
      }

      controls.update()
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(frameId)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      mixerRef.current?.stopAllAction()
      mixerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Resaltar control seleccionado ─────────────────────────────────
  const applyHighlight = (id: ControlId) => {
    const meshes = meshesByControlRef.current
    Object.values(meshes).flat().forEach((m) => {
      const mat = m.material as THREE.MeshStandardMaterial
      if (mat && 'emissive' in mat) {
        const ud = m.userData as { origEmissive?: THREE.Color; origEmissiveIntensity?: number }
        if (ud.origEmissive) mat.emissive.copy(ud.origEmissive)
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = ud.origEmissiveIntensity ?? 1
      }
    })
    const sel = meshes[id] || []
    for (const m of sel) {
      const mat = m.material as THREE.MeshStandardMaterial
      if (!mat || !('emissive' in mat)) continue
      const ud = m.userData as { origEmissive?: THREE.Color }
      const hasColor = ud.origEmissive && ud.origEmissive.getHex() !== 0x000000
      if (hasColor) {
        mat.emissive.copy(ud.origEmissive!)
        mat.emissiveIntensity = 0.28
      } else {
        mat.emissive.copy(HIGHLIGHT_COLOR)
        mat.emissiveIntensity = 0.10
      }
    }
  }

  useEffect(() => {
    if (selectedId) applyHighlight(selectedId)
  }, [selectedId])

  // Al apagar shift / cambiar el pad sticky, restaura los meshes que estaban
  // en rojo (el loop deja de pintarlos, pero hay que devolverles su emissive).
  const prevShiftRef = useRef(shiftActive)
  const prevStickyRef = useRef(stickyPadId)
  useEffect(() => {
    const restore = (id: ControlId) => {
      const ms = meshesByControlRef.current[id]
      ms?.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial
        if (!mat || !('emissive' in mat)) return
        const ud = m.userData as { origEmissive?: THREE.Color; origEmissiveIntensity?: number }
        if (ud.origEmissive) mat.emissive.copy(ud.origEmissive)
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = ud.origEmissiveIntensity ?? 1
      })
    }
    if (prevShiftRef.current && !shiftActive) restore('c3')
    if (prevStickyRef.current && prevStickyRef.current !== stickyPadId) restore(prevStickyRef.current)
    prevShiftRef.current = shiftActive
    prevStickyRef.current = stickyPadId
    // Re-aplica el highlight de selección (el loop volverá a pintar rojo si sigue activo)
    if (selectedIdRef.current) applyHighlight(selectedIdRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftActive, stickyPadId])

  // ── Web MIDI: el modelo 3D reacciona al BEATO16 físico ────────────
  useEffect(() => {
    const nav = navigator as Navigator & {
      requestMIDIAccess?: (opts?: { sysex?: boolean }) => Promise<MIDIAccess>
    }
    if (!nav.requestMIDIAccess) return

    const originalY = new Map<string, number>()
    const autoRelease = new Map<string, ReturnType<typeof setTimeout>>()
    let pressDepth = 0.02
    let faderTravel = 0.1

    const captureOrig = (m: THREE.Object3D) => {
      if (!originalY.has(m.uuid)) originalY.set(m.uuid, m.position.y)
    }

    const padIndexFromNote = (n: number): { idx: number; bank: Bank } | null => {
      if (n >= 36 && n <= 51) return { idx: n - 36, bank: 'A' }
      if (n >= 52 && n <= 67) return { idx: n - 52, bank: 'B' }
      if (n >= 68 && n <= 83) return { idx: n - 68, bank: 'C' }
      return null
    }

    const knobIndexFromCC = (cc: number): { idx: number; bank: Bank } | null => {
      if (cc >= 30 && cc <= 33) return { idx: cc - 30, bank: 'A' }
      if (cc >= 40 && cc <= 43) return { idx: cc - 40, bank: 'B' }
      if (cc >= 50 && cc <= 53) return { idx: cc - 50, bank: 'C' }
      return null
    }

    const restoreEmissive = (m: THREE.Mesh) => {
      const mat = m.material as THREE.MeshStandardMaterial
      if (!mat || !('emissive' in mat)) return
      const ud = m.userData as { origEmissive?: THREE.Color; origEmissiveIntensity?: number; controlId?: ControlId }
      if (ud.controlId && ud.controlId === selectedIdRef.current) {
        const hasColor = ud.origEmissive && ud.origEmissive.getHex() !== 0x000000
        if (hasColor) {
          mat.emissive.copy(ud.origEmissive!)
          mat.emissiveIntensity = 0.28
        } else {
          mat.emissive.copy(HIGHLIGHT_COLOR)
          mat.emissiveIntensity = 0.10
        }
      } else if (ud.origEmissive) {
        mat.emissive.copy(ud.origEmissive)
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = ud.origEmissiveIntensity ?? 1
      }
    }

    const applyPressEmissive = (id: ControlId, withAutoRelease: boolean) => {
      const ms = meshesByControlRef.current[id]
      if (!ms) return
      ms.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat && 'emissive' in mat) {
          mat.emissive.copy(PRESS_COLOR)
          if ('emissiveIntensity' in mat) mat.emissiveIntensity = PRESS_INTENSITY
        }
        // Auto-release solo para controles sin animación (failsafe toggle/SysEx)
        if (withAutoRelease) {
          const existing = autoRelease.get(m.uuid)
          if (existing) clearTimeout(existing)
          autoRelease.set(m.uuid, setTimeout(() => releaseControl(id), 1500))
        }
      })
    }

    const ensurePressState = (id: ControlId) => {
      const target = pressTargetsRef.current[id]
      if (!target) return null
      let s = pressStateRef.current[id]
      if (!s) {
        s = { current: 0, target: 0, restY: target.position.y, depth: pressDepth }
        pressStateRef.current[id] = s
      } else {
        // Refrescar depth por si ensureDepths terminó después
        s.depth = pressDepth
      }
      return s
    }

    const pressControl = (id: ControlId) => {
      const s = ensurePressState(id)
      if (s) s.target = 1
      // Si hay animación de bajada, esa es la pista visual — saltarse el flash
      // emissive rojo (tapaba el movimiento del dome). El highlight emissive solo
      // se aplica a controles sin animación (auto-release para no quedarse pegado)
      if (!s) applyPressEmissive(id, true)
    }

    const releaseControl = (id: ControlId) => {
      const s = ensurePressState(id)
      if (s) s.target = 0
      const ms = meshesByControlRef.current[id]
      if (ms) ms.forEach((m) => {
        restoreEmissive(m)
        const t = autoRelease.get(m.uuid)
        if (t) { clearTimeout(t); autoRelease.delete(m.uuid) }
      })
    }

    const rotateKnob = (id: ControlId, value: number) => {
      const ms = meshesByControlRef.current[id]
      if (!ms) return
      // Signo negativo: en el GLB el eje Y mira al revés respecto al giro físico.
      // Sweep 4π (720° = 2 vueltas) para que cada paso de CC (una detente física
      // del encoder) produzca ~5.7° visibles — se siente responsivo en vez de
      // "lento" (con el sweep original de 270°, cada detente daba solo ~2°).
      const angle = -((value / 127) * Math.PI * 4 - Math.PI * 2)
      ms.forEach((m) => { m.rotation.y = angle })
    }

    const moveFader = (id: ControlId, value: number) => {
      if (id === 'f0') {
        // Scrubbing de la animación GLB: busca el tiempo proporcional al valor CC
        const anim = faderAnimRef.current
        if (anim) {
          anim.action.time = (1 - value / 127) * anim.duration
          mixerRef.current?.update(0)
        }
        faderValueRef.current = value
        return
      }
      const allMs = meshesByControlRef.current[id]
      if (!allMs || allMs.length === 0) return
      allMs.forEach((m) => {
        captureOrig(m)
        const orig = originalY.get(m.uuid) ?? 0
        m.position.y = orig - faderTravel * 0.5 + (value / 127) * faderTravel
      })
    }
    // Exponer al pointer handler (otro useEffect) para drag-Y interactivo
    moveFaderRef.current = moveFader

    const ensureDepths = (() => {
      let ready = false
      return () => {
        if (ready) return
        const target = pressTargetsRef.current['p0']
        if (!target) return
        // pressDepth se aplica como cambio de position.y en el frame LOCAL del
        // press target. Como el modelo está escalado (~3x), tenemos que dividir
        // la altura mundo del dome por la escala mundo del padre del target.
        const bbox = new THREE.Box3().setFromObject(target)
        const worldH = bbox.getSize(new THREE.Vector3()).y
        const ws = new THREE.Vector3()
        target.parent?.getWorldScale(ws)
        const localScale = ws.y || 1
        // Bajamos ~25% de la altura local del dome — visible sin desaparecer
        pressDepth = Math.min(0.02, Math.max(0.002, (worldH / localScale) * 0.25))

        ready = true
      }
    })()

    const handleMessage = (msg: MIDIMessageEvent) => {
      const data = msg.data
      if (!data || data.length < 2) return
      ensureDepths()
      const status = data[0] & 0xf0
      const num = data[1]
      const val = data[2] ?? 0
      // Diagnóstico temporal: ver si llega MIDI del Beato y qué contiene.
      console.log('[Beato16Scene] MIDI in:', 'status=0x' + status.toString(16), 'num=' + num, 'val=' + val)

      if (status === 0x90 && val > 0) {
        const m = padIndexFromNote(num)
        if (!m) return
        if (m.bank !== bank && onBankChangeRef.current) onBankChangeRef.current(m.bank)
        const padId = `p${m.idx}` as ControlId
        pressControl(padId)
        onSelectRef.current(padId)
        return
      }
      if (status === 0x80 || (status === 0x90 && val === 0)) {
        const m = padIndexFromNote(num)
        if (!m) return
        releaseControl(`p${m.idx}` as ControlId)
        return
      }
      if (status === 0xb0) {
        if (num >= 116 && num <= 118 && val > 0) {
          const targetBank: Bank = num === 116 ? 'A' : num === 117 ? 'B' : 'C'
          if (onBankChangeRef.current) onBankChangeRef.current(targetBank)
          const id = `c${num - 116}` as ControlId
          pressControl(id)
          onSelectRef.current(id)
          setTimeout(() => releaseControl(id), 200)
          return
        }
        if (num === 119) {
          if (val > 0) { pressControl('c3'); onSelectRef.current('c3') }
          else releaseControl('c3')
          return
        }
        const k = knobIndexFromCC(num)
        if (k) {
          if (k.bank !== bank && onBankChangeRef.current) onBankChangeRef.current(k.bank)
          const knobId = `k${k.idx}` as ControlId
          rotateKnob(knobId, val)
          onSelectRef.current(knobId)
          return
        }
        if (num === 34 || num === 44 || num === 54) {
          const targetBank: Bank = num === 34 ? 'A' : num === 44 ? 'B' : 'C'
          if (targetBank !== bank && onBankChangeRef.current) onBankChangeRef.current(targetBank)
          moveFader('f0', val)
          onSelectRef.current('f0')
        }
      }
    }

    const isCrart = (n: string | null) => /beato|creart|arduino/i.test(n || '')
    const subscribed: MIDIInput[] = []
    let access: MIDIAccess | null = null
    let onState: ((e: Event) => void) | null = null

    // addEventListener (no `.onmidimessage =`) para coexistir con el handler
    // de lógica del editor en el mismo puerto sin sobrescribirlo.
    const subscribe = (input: MIDIInput) => {
      if (subscribed.includes(input)) return
      input.addEventListener('midimessage', handleMessage as EventListener)
      subscribed.push(input)
    }

    nav
      .requestMIDIAccess({ sysex: false })
      .then((a) => {
        access = a
        const all = Array.from(a.inputs.values())
        const targets = all.filter((i) => isCrart(i.name))
        const inputs = targets.length ? targets : all
        inputs.forEach(subscribe)
        onState = (e) => {
          const p = (e as MIDIConnectionEvent).port
          if (p && p.type === 'input' && p.state === 'connected') {
            if (isCrart(p.name) || !targets.length) subscribe(p as MIDIInput)
          }
        }
        a.addEventListener('statechange', onState)
        console.log('[Beato16Scene] MIDI:', inputs.map((i) => i.name).join(', ') || 'sin dispositivos')
      })
      .catch((err) => {
        console.warn('[Beato16Scene] MIDI no disponible:', err?.message || err)
      })

    return () => {
      subscribed.forEach((i) => { try { i.removeEventListener('midimessage', handleMessage as EventListener) } catch { /* noop */ } })
      autoRelease.forEach((t) => clearTimeout(t))
      Object.values(meshesByControlRef.current).flat().forEach((m) => {
        const oy = originalY.get(m.uuid)
        if (oy !== undefined) m.position.y = oy
      })
      if (access && onState) access.removeEventListener('statechange', onState)
    }
  }, [bank])

  // ── Etiquetas flotantes (reactivas, fuera del tick loop) ────────
  useEffect(() => {
    const overlay = overlayRef.current
    const cam = cameraRef.current
    const mount = mountRef.current
    if (!overlay || !cam || !mount || !labelsReady) return

    // Si labels desactivados, limpiar
    if (!showLabels || !midiState) {
      while (overlay.firstChild) overlay.removeChild(overlay.firstChild)
      labelElsRef.current = {}
      return
    }

    const centers = controlCentersRef.current
    const w = mount.clientWidth
    const h = mount.clientHeight
    const bk = bank || 'A'

    // Posiciones 2D: el label se sitúa POR ENCIMA del control (no lo tapa para
    // que se vea la animación de pulso/press del mesh 3D).
    const pixels: Record<string, { x: number; y: number }> = {}
    for (const id of Object.keys(centers)) {
      const pos = centers[id].clone().project(cam)
      pixels[id] = {
        x: (pos.x * 0.5 + 0.5) * w,
        y: (-pos.y * 0.5 + 0.5) * h - 14,  // 14px arriba del centro
      }
    }
    labelPixelsRef.current = pixels

    // Crear o actualizar elementos. Texto pequeño, blanco semitransparente,
    // sin fondo, con sombra para legibilidad sobre cualquier color del modelo.
    const els = labelElsRef.current
    for (const id of Object.keys(centers)) {
      const cfg = midiState[id as ControlId]?.[bk]
      if (!cfg) continue
      let el = els[id]
      if (!el) {
        el = document.createElement('div')
        el.style.cssText = 'position:absolute;pointer-events:none;font-family:"JetBrains Mono",monospace;font-size:10px;font-weight:700;letter-spacing:0.02em;white-space:nowrap;transform:translate(-50%,-100%);'
        overlay.appendChild(el)
        els[id] = el
      }
      const px = pixels[id]
      el.style.left = px.x + 'px'
      el.style.top = px.y + 'px'
      const isSel = selectedId === id
      // En modo shift, los pads (p*) muestran el shortName de su acción asignada
      // (igual que el HTML). Los demás controles mantienen su etiqueta física.
      const inShift = !!shiftActive && id.startsWith('p')
      const text = inShift
        ? shiftShortLabel(id, shiftActions, customShiftKeys)
        : physicalLabel(id as ControlId)
      el.textContent = text
      // En shift mode, los pads con acción usan color shift (rojo cálido como el HTML),
      // los pads sin asignar quedan ocultos. Resto: lógica normal (verde si seleccionado).
      if (inShift) {
        const hasAction = text !== ''
        el.style.display = hasAction ? '' : 'none'
        el.style.color = hasAction ? '#ffb09c' : ''
        el.style.textShadow = hasAction
          ? '0 0 10px rgba(255,138,120,0.9), 0 0 4px rgba(204,68,51,0.7), 0 1px 2px rgba(0,0,0,0.9)'
          : ''
      } else {
        el.style.display = ''
        el.style.color = isSel ? '#39ff14' : 'rgba(255,255,255,0.72)'
        el.style.textShadow = isSel
          ? '0 0 10px rgba(57,255,20,1), 0 0 4px rgba(57,255,20,0.8), 0 1px 2px rgba(0,0,0,0.9)'
          : '0 1px 2px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.6)'
      }
    }

    // Eliminar elementos de controles que ya no existen
    for (const id of Object.keys(els)) {
      if (!centers[id]) {
        els[id].remove()
        delete els[id]
      }
    }
  }, [showLabels, midiState, bank, selectedId, labelsReady, resizeTick, shiftActive, shiftActions, customShiftKeys])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <div ref={overlayRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} />
    </div>
  )
}

export default Beato16Scene
