import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MESH_TO_WAVO_CONTROL, type WavoControlId } from './wavoControlState'

export interface WavoSceneHandle {
  pressControl: (id: WavoControlId) => void
  releaseControl: (id: WavoControlId) => void
  rotateEncoder: (id: WavoControlId, ccValue: number) => void
}

interface Props {
  selectedId: WavoControlId | null
  onSelect: (id: WavoControlId) => void
}

const HIGHLIGHT_COLOR = new THREE.Color(0x39ff14)
const PRESS_COLOR     = new THREE.Color(0xffffff)
const PRESS_INTENSITY = 2.0

const WavoScene = forwardRef<WavoSceneHandle, Props>(({ selectedId, onSelect }, ref) => {
  const mountRef       = useRef<HTMLDivElement>(null)
  const meshesByCtrl   = useRef<Record<string, THREE.Mesh[]>>({})
  const pressTargets   = useRef<Partial<Record<WavoControlId, THREE.Object3D>>>({})
  const pressState     = useRef<Record<string, { cur: number; tgt: number; restY: number; depth: number }>>({})
  const modelScaleRef  = useRef(1)
  const modelSizeRef   = useRef<{ x: number; y: number; z: number } | null>(null)
  const camDirRef      = useRef<THREE.Vector3 | null>(null)
  const onSelectRef    = useRef(onSelect)
  const selectedIdRef  = useRef(selectedId)
  const pressedIdRef   = useRef<WavoControlId | null>(null)
  onSelectRef.current  = onSelect
  selectedIdRef.current = selectedId

  // applyHighlight — respeta el control presionado actualmente
  const applyHighlight = (id: WavoControlId) => {
    const all = Object.values(meshesByCtrl.current).flat()
    all.forEach(m => {
      // No tocar el control que está siendo presionado ahora mismo
      if ((m.userData as Record<string, unknown>).controlId === pressedIdRef.current) return
      const mat = m.material as THREE.MeshStandardMaterial
      if (!mat || !('emissive' in mat)) return
      const ud = m.userData as { origEmissive?: THREE.Color; origEmissiveIntensity?: number }
      if (ud.origEmissive) mat.emissive.copy(ud.origEmissive)
      if ('emissiveIntensity' in mat) mat.emissiveIntensity = ud.origEmissiveIntensity ?? 0
    })
    // Solo aplicar highlight si ese control NO está siendo presionado
    if (id !== pressedIdRef.current) {
      const sel = meshesByCtrl.current[id] || []
      sel.forEach(m => {
        const mat = m.material as THREE.MeshStandardMaterial
        if (!mat || !('emissive' in mat)) return
        const ud = m.userData as { origEmissive?: THREE.Color }
        const hasColor = ud.origEmissive && ud.origEmissive.getHex() !== 0x000000
        mat.emissive.copy(hasColor ? ud.origEmissive! : HIGHLIGHT_COLOR)
        mat.emissiveIntensity = hasColor ? 0.4 : 0.2
      })
    }
  }

  // Función interna de press — usada tanto por click como por MIDI hardware
  const encoderAngles = useRef<Record<string, number>>({ enc1: 0, enc2: 0, enc3: 0, enc4: 0 })
  const triggerPress = useRef<(id: WavoControlId) => void>(() => {})
  const triggerRelease = useRef<(id: WavoControlId) => void>(() => {})
  const triggerRotateEncoder = useRef<(id: WavoControlId, ccValue: number) => void>(() => {})

  // Exponer pressControl / releaseControl al padre vía ref
  useImperativeHandle(ref, () => ({
    pressControl: (id: WavoControlId) => triggerPress.current(id),
    releaseControl: (id: WavoControlId) => triggerRelease.current(id),
    rotateEncoder: (id: WavoControlId, ccValue: number) => triggerRotateEncoder.current(id, ccValue),
  }))

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ── Escena ──────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100)
    // Vista casi cenital (15° de tilt) para que se vea el press y el slide
    camera.position.set(0, 2.9, 0.78)
    camera.lookAt(0, 0, 0)
    camDirRef.current = camera.position.clone().normalize()

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
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

    // OrbitControls completamente deshabilitado
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enabled      = false
    controls.enableRotate = false
    controls.enablePan    = false
    controls.enableZoom   = false
    controls.target.set(0, 0, 0)

    const clock = new THREE.Clock()

    // Auto-fit para vista TOP
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

    // ── Carga del modelo ────────────────────────────────────────────
    const loader = new GLTFLoader()
    loader.load(`${import.meta.env.BASE_URL}models/wavo.glb`, (gltf) => {
      const model = gltf.scene

      model.rotation.y = -Math.PI / 2
      const box    = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      const size   = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      // El WAVO es ancho y plano: con 1.5 se ve pequeño junto al Beato.
      // Subimos el objetivo para equilibrar su tamaño visual en el ecosistema.
      const scale  = 1.55 / maxDim
      modelScaleRef.current = scale
      model.position.sub(center.multiplyScalar(scale))
      model.scale.setScalar(scale)
      modelSizeRef.current = { x: size.x * scale, y: size.y * scale, z: size.z * scale }
      fitCameraToModel()

      const meshMap: Record<string, THREE.Mesh[]> = {}
      const ptMap:   Partial<Record<WavoControlId, THREE.Object3D>> = {}

      // Materiales pulidos — mismo acabado físico del Beato 16 (clearcoat).
      // El chasis queda blanco como el Beato; pantalla con textura emisiva.
      const assignMaterial = (obj: THREE.Mesh) => {
        const n = obj.name.toLowerCase()
        if (n.includes('pantallawavo')) {
          obj.material = new THREE.MeshPhysicalMaterial({
            color: 0x000000, roughness: 0.1, metalness: 0.9,
            emissive: 0x00ffff, emissiveIntensity: 0.25,
          })
          return
        }
        if (n.includes('bolt')) {
          obj.material = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.9, roughness: 0.15 })
          return
        }
        if (n.includes('chasis')) {
          // Igual que el chasis del Beato 16
          obj.material = new THREE.MeshPhysicalMaterial({
            color: '#F5F5F5', metalness: 0.5, roughness: 0.25,
            clearcoat: 1.0, clearcoatRoughness: 0.08,
          })
          return
        }
        // Resto (botones, encoders, teclas): conserva color/textura del GLB
        // pero sube el acabado a físico con clearcoat para que brille igual.
        const old = obj.material as THREE.MeshStandardMaterial
        if (!old || Array.isArray(obj.material)) return
        obj.material = new THREE.MeshPhysicalMaterial({
          color: old.color ? old.color.clone() : new THREE.Color('#cccccc'),
          map: old.map ?? null,
          emissive: old.emissive ? old.emissive.clone() : new THREE.Color(0x000000),
          emissiveIntensity: old.emissiveIntensity ?? 0,
          metalness: 0.15, roughness: 0.5,
          clearcoat: 0.6, clearcoatRoughness: 0.12,
        })
      }

      model.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return
        const nameLc       = obj.name.toLowerCase()
        const parentNameLc = (obj.parent?.name || '').toLowerCase()

        // Pulir el material ANTES de guardar origEmissive (para el highlight).
        assignMaterial(obj)

        let id: WavoControlId | undefined =
          MESH_TO_WAVO_CONTROL[obj.name] ?? MESH_TO_WAVO_CONTROL[nameLc]
        let pressTarget: THREE.Object3D | null = null

        if (id) {
          if (!/^tapa\d+/.test(nameLc)) pressTarget = obj
        } else if (obj.parent) {
          id = MESH_TO_WAVO_CONTROL[obj.parent.name] ?? MESH_TO_WAVO_CONTROL[parentNameLc]
          if (id) pressTarget = obj.parent
        }
        if (!id) return

        ;(obj.userData as Record<string, unknown>).controlId = id
        ;(meshMap[id] ||= []).push(obj)
        if (pressTarget && !ptMap[id]) ptMap[id] = pressTarget

        const mat = obj.material as THREE.MeshStandardMaterial
        if (mat && 'emissive' in mat) {
          ;(obj.userData as Record<string, unknown>).origEmissive = mat.emissive.clone()
          ;(obj.userData as Record<string, unknown>).origEmissiveIntensity = mat.emissiveIntensity ?? 0
        }
      })

      meshesByCtrl.current = meshMap
      pressTargets.current  = ptMap
      console.log('[WavoScene] Controles mapeados:', Object.keys(meshMap))

      scene.add(model)
      if (selectedIdRef.current) applyHighlight(selectedIdRef.current)

      // Textura de la pantalla (emisiva) — se aplica aparte, sin bloquear la carga.
      new THREE.TextureLoader().load(
        `${import.meta.env.BASE_URL}textures/pantallawavo.png`,
        (texture) => {
          texture.flipY = false
          texture.colorSpace = THREE.SRGBColorSpace
          model.traverse((child) => {
            if (child instanceof THREE.Mesh && child.name.toLowerCase().includes('pantallawavo')) {
              child.material = new THREE.MeshPhysicalMaterial({
                map: texture, emissiveMap: texture, color: 0xffffff,
                roughness: 0.1, metalness: 0.9,
                emissive: 0xffffff, emissiveIntensity: 0.8,
              })
            }
          })
        },
        undefined,
        () => console.warn('[WavoScene] Textura de pantalla no disponible')
      )
    })

    // ── Helpers internos de press/release ───────────────────────────
    const doPress = (id: WavoControlId) => {
      pressedIdRef.current = id          // marcar como presionado antes del render
      const ms = meshesByCtrl.current[id]
      ms?.forEach(m => {
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat && 'emissive' in mat) {
          mat.emissive.copy(PRESS_COLOR)
          if ('emissiveIntensity' in mat) mat.emissiveIntensity = PRESS_INTENSITY
        }
      })
    }

    const doRelease = (id: WavoControlId) => {
      pressedIdRef.current = null        // liberar estado presionado
      // Restaurar emissive: highlight si es el seleccionado, original si no
      const selId = selectedIdRef.current
      if (selId) applyHighlight(selId)
      else {
        // No hay selección: solo restaurar el control soltado
        const ms = meshesByCtrl.current[id]
        ms?.forEach(m => {
          const mat = m.material as THREE.MeshStandardMaterial
          if (!mat || !('emissive' in mat)) return
          const ud = m.userData as { origEmissive?: THREE.Color; origEmissiveIntensity?: number }
          if (ud.origEmissive) mat.emissive.copy(ud.origEmissive)
          if ('emissiveIntensity' in mat) mat.emissiveIntensity = ud.origEmissiveIntensity ?? 0
        })
      }
    }

    // Rotación de encoders — un step fijo por mensaje MIDI, sin importar la magnitud del delta
    const doRotateEncoder = (id: WavoControlId, ccValue: number) => {
      if (!id.startsWith('enc')) return
      const dir = ccValue > 64 ? 1 : -1        // solo dirección, ignora magnitud
      encoderAngles.current[id] = (encoderAngles.current[id] ?? 0) + dir * (Math.PI / 20)
      const ms = meshesByCtrl.current[id]
      ms?.forEach(m => { m.rotation.y = encoderAngles.current[id] })
    }

    // Conectar refs expuestos al padre
    triggerPress.current          = doPress
    triggerRelease.current        = doRelease
    triggerRotateEncoder.current  = doRotateEncoder

    // ── Raycaster ───────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const pointer   = new THREE.Vector2()
    let pressedClickId: WavoControlId | null = null

    const hitControl = (e: PointerEvent): WavoControlId | null => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x  = ((e.clientX - rect.left) / rect.width)  * 2 - 1
      pointer.y  = -((e.clientY - rect.top)  / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      for (const h of hits) {
        const id = (h.object.userData as { controlId?: WavoControlId }).controlId
        if (id) return id
      }
      return null
    }

    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      const px = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const py = -((e.clientY - rect.top) / rect.height) * 2 + 1
      console.log('[WAVO click] NDC:', px.toFixed(2), py.toFixed(2),
        'canvas:', Math.round(rect.width) + 'x' + Math.round(rect.height),
        'meshMap keys:', Object.keys(meshesByCtrl.current).length)
      const id = hitControl(e)
      console.log('[WAVO click] → id:', id)
      if (!id) return
      pressedClickId = id
      selectedIdRef.current = id   // sync before doRelease fires so highlight persists
      doPress(id)
      onSelectRef.current(id)
    }

    const onPointerUp = () => {
      if (!pressedClickId) return
      const id = pressedClickId
      pressedClickId = null
      doRelease(id)
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup',   onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)

    const onResize = () => {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      fitCameraToModel()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    let frameId = 0
    const tick = () => {
      // Pulso de selección: el control seleccionado brilla en verde pulsante
      const selNow = selectedIdRef.current
      if (selNow && pressedIdRef.current !== selNow) {
        const pulse = 0.55 + 0.55 * (0.5 + 0.5 * Math.sin(performance.now() * 0.006))
        const selMeshes = meshesByCtrl.current[selNow]
        selMeshes?.forEach(m => {
          const mat = m.material as THREE.MeshStandardMaterial
          if (!mat || !('emissive' in mat)) return
          mat.emissive.copy(HIGHLIGHT_COLOR)
          mat.emissiveIntensity = pulse
        })
      }
      controls.update()
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      triggerPress.current          = () => {}
      triggerRelease.current        = () => {}
      triggerRotateEncoder.current  = () => {}
      cancelAnimationFrame(frameId)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup',   onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedId) applyHighlight(selectedId)
  }, [selectedId])

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', background: 'transparent', cursor: 'crosshair' }}
    />
  )
})

WavoScene.displayName = 'WavoScene'
export default WavoScene
