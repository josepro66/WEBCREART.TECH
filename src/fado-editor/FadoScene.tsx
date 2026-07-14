/**
 * FadoScene.tsx — Escena 3D interactiva del FADO (8 faders).
 *
 * Renderiza el modelo FADO.glb, mapea los 8 faders por clic y muestra
 * etiquetas físicas (F1-F8). Al recibir MIDI por hardware, el fader
 * correspondiente se mueve a la posición proporcional a su CC value.
 *
 * Estructura: idéntica al WavoScene pero simplificada para faders.
 */

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import {
  MESH_TO_FADO_CONTROL,
  type FadoControlId,
  type FadoControlState,
  type Bank,
  fadoShortLabel,
} from './fadoControlState'

export interface FadoSceneHandle {
  /** Mueve el fader a la posición proporcional (0-127). */
  setFaderValue: (id: FadoControlId, ccValue: number) => void
}

interface Props {
  selectedId: FadoControlId | null
  onSelect: (id: FadoControlId) => void
  /** Estado MIDI para etiquetas de mapeo (banked). */
  midiState?: FadoControlState
  /** Banco actual para mostrar la etiqueta correcta. */
  bank?: Bank
  /** Mostrar/ocultar etiquetas. */
  showLabels?: boolean
}

const HIGHLIGHT_COLOR = new THREE.Color(0x39ff14)

const FadoScene = forwardRef<FadoSceneHandle, Props>(
  ({ selectedId, onSelect, midiState, bank = 'A', showLabels = true }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    const meshesByCtrl = useRef<Record<FadoControlId, THREE.Mesh[]>>({} as Record<FadoControlId, THREE.Mesh[]>)
    const faderKeyframesRef = useRef<Record<FadoControlId, { node: THREE.Object3D; startPos: THREE.Vector3; endPos: THREE.Vector3 }>>({} as any)

    const onSelectRef = useRef(onSelect)
    const selectedIdRef = useRef(selectedId)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const modelSizeRef = useRef<{ x: number; y: number; z: number } | null>(null)
    const camDirRef = useRef<THREE.Vector3 | null>(null)
    const controlCentersRef = useRef<Record<string, THREE.Vector3>>({})
    const labelElsRef = useRef<Record<string, HTMLElement>>({})
    const [labelsReady, setLabelsReady] = useState(false)
    const [resizeTick, setResizeTick] = useState(0)
    onSelectRef.current = onSelect
    selectedIdRef.current = selectedId

    const triggerSetValue = useRef<(id: FadoControlId, v: number) => void>(() => {})
    useImperativeHandle(ref, () => ({
      setFaderValue: (id, v) => triggerSetValue.current(id, v),
    }))

    useEffect(() => {
      const mount = mountRef.current
      if (!mount) return

      const scene = new THREE.Scene()
      scene.background = null

      const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100)
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
      renderer.toneMappingExposure = 1.2
      mount.appendChild(renderer.domElement)

      scene.add(new THREE.AmbientLight(0xffffff, 0.5))
      const key = new THREE.DirectionalLight(0xffffff, 1.4)
      key.position.set(4, 6, 3); scene.add(key)
      const fill = new THREE.DirectionalLight(0xb0d4ff, 0.5)
      fill.position.set(-4, 2, -3); scene.add(fill)
      const front = new THREE.DirectionalLight(0xffffff, 0.35)
      front.position.set(0, 1, 4); scene.add(front)
      const rim = new THREE.PointLight(0xb07cff, 0.9, 10)
      rim.position.set(-1, 0.5, -2); scene.add(rim)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enabled = false
      controls.enableRotate = false; controls.enablePan = false; controls.enableZoom = false
      controls.target.set(0, 0, 0)

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
        const dist = Math.max(distV, distH) * 1.08 // margen mínimo → modular
        camera.position.copy(dir).multiplyScalar(dist)
        camera.lookAt(0, 0, 0)
        camera.updateMatrixWorld(true)
      }

      const loader = new GLTFLoader()
      loader.setMeshoptDecoder(MeshoptDecoder)
      loader.load(`${import.meta.env.BASE_URL}models/FADO.glb`, (gltf) => {
        const model = gltf.scene
        model.rotation.y = -Math.PI / 2
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        // Igualada al Beato16Scene (1.5 / maxDim) para que ambos modelos
        // aparezcan a la misma escala visual en el ecosistema.
        const scale = 1.5 / maxDim
        model.position.sub(center.multiplyScalar(scale))
        model.scale.setScalar(scale)
        modelSizeRef.current = { x: size.x * scale, y: size.y * scale, z: size.z * scale }
        fitCameraToModel()

        const isLogo = (obj: THREE.Mesh) => {
          // Revisar nombre propio Y del padre (Three.js puede cargar el nodo
          // "logo.003" como Group con un Mesh hijo de nombre vacío)
          const names = [obj.name, obj.parent?.name ?? ''].map(s => s.toLowerCase())
          return names.some(n =>
            n.includes('crearttech') || n.includes('logo') ||
            (n.includes('fado') && !n.includes('fader'))
          )
        }

        const assignMaterial = (obj: THREE.Mesh) => {
          const n = obj.name.toLowerCase()
          if (n.includes('chasis')) {
            obj.material = new THREE.MeshPhysicalMaterial({
              color: '#F5F5F5', metalness: 0.5, roughness: 0.25,
              clearcoat: 1.0, clearcoatRoughness: 0.08,
            })
            return
          }
          if (n.includes('aro')) {
            obj.material = new THREE.MeshPhysicalMaterial({
              color: 0x1a1a1a, metalness: 0.7, roughness: 0.4,
              clearcoat: 0.8, clearcoatRoughness: 0.15,
            })
            return
          }
          // Logos serigrafiados: preservar la textura PNG embebida en el GLB
          // (el material trae baseColorFactor=[0,0,0,1] que multiplica la
          // textura a negro; ponemos color blanco para que el PNG se vea).
          if (isLogo(obj)) {
            const oldLogo = obj.material as THREE.MeshStandardMaterial
            const logoMap = oldLogo && !Array.isArray(obj.material) ? oldLogo.map : null
            if (logoMap) {
              logoMap.premultiplyAlpha = false
              logoMap.needsUpdate = true
            }
            obj.material = new THREE.MeshPhysicalMaterial({
              color: 0xffffff,
              map: logoMap ?? null,
              transparent: !!logoMap,
              alphaTest: logoMap ? 0.5 : 0,
              depthWrite: true,
              metalness: 0.15, roughness: 0.55,
              clearcoat: 0.4, clearcoatRoughness: 0.2,
            })
            return
          }
          const old = obj.material as THREE.MeshStandardMaterial
          if (!old || Array.isArray(obj.material)) return
          // Cualquier mesh restante muy claro/blanco → integrarlo al chassis
          const col = old.color
          if (col && col.r > 0.88 && col.g > 0.88 && col.b > 0.88) {
            obj.material = new THREE.MeshPhysicalMaterial({
              color: '#C8C8C8', metalness: 0.4, roughness: 0.35,
              clearcoat: 0.9, clearcoatRoughness: 0.08,
            })
            return
          }
          obj.material = new THREE.MeshPhysicalMaterial({
            color: old.color ? old.color.clone() : new THREE.Color('#cccccc'),
            map: old.map ?? null,
            emissive: old.emissive ? old.emissive.clone() : new THREE.Color(0x000000),
            emissiveIntensity: old.emissiveIntensity ?? 0,
            metalness: 0.2, roughness: 0.4,
            clearcoat: 0.7, clearcoatRoughness: 0.1,
          })
        }

        const meshMap: Record<string, THREE.Mesh[]> = {}
        model.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return
          const nameLc = obj.name.toLowerCase()
          assignMaterial(obj)

          // Check mesh name, then parent name (GLB nodes like "fader1"
          // often contain a child mesh with a generic name like "Mesh")
          const parentName = obj.parent?.name ?? ''
          const parentLc = parentName.toLowerCase()
          const id: FadoControlId | undefined =
            MESH_TO_FADO_CONTROL[obj.name] ??
            MESH_TO_FADO_CONTROL[nameLc] ??
            MESH_TO_FADO_CONTROL[parentName] ??
            MESH_TO_FADO_CONTROL[parentLc]
          if (!id) return

          ;(obj.userData as Record<string, unknown>).controlId = id
          ;(meshMap[id] ||= []).push(obj)

          const mat = obj.material as THREE.MeshStandardMaterial
          if (mat && 'emissive' in mat) {
            ;(obj.userData as Record<string, unknown>).origEmissive = mat.emissive.clone()
            ;(obj.userData as Record<string, unknown>).origEmissiveIntensity = mat.emissiveIntensity ?? 0
          }
        })
        meshesByCtrl.current = meshMap
        scene.add(model)
        model.updateMatrixWorld(true)

        // Extraer posiciones min/max de los keyframes de cada fader
        // para interpolación directa (bypass AnimationMixer)
        for (const clip of gltf.animations) {
          const match = clip.name.match(/^fader(\d)Action$/i)
          if (!match) continue
          const id = ('fader' + match[1]) as FadoControlId
          const posTrack = clip.tracks.find(t => t.name.endsWith('.position'))
          if (!posTrack) continue
          const nodeName = posTrack.name.split('.')[0]
          let node: THREE.Object3D | null = null
          model.traverse(o => { if (o.name === nodeName) node = o })
          if (!node) continue
          const v = posTrack.values
          const startPos = new THREE.Vector3(v[0], v[1], v[2])
          const endPos = new THREE.Vector3(v[v.length - 3], v[v.length - 2], v[v.length - 1])
          faderKeyframesRef.current[id] = { node, startPos, endPos }
        }

        // Centros de cada control para etiquetas flotantes
        const centers: Record<string, THREE.Vector3> = {}
        for (const [id, ms] of Object.entries(meshMap)) {
          const b = new THREE.Box3()
          ms.forEach((m) => b.expandByObject(m))
          centers[id] = b.getCenter(new THREE.Vector3())
        }
        controlCentersRef.current = centers
        setLabelsReady(true)

        if (selectedIdRef.current) applyHighlight(selectedIdRef.current)
      })

      const applyHighlight = (id: FadoControlId) => {
        const all = Object.values(meshesByCtrl.current).flat()
        all.forEach((m) => {
          const mat = m.material as THREE.MeshStandardMaterial
          if (!mat || !('emissive' in mat)) return
          const ud = m.userData as { origEmissive?: THREE.Color; origEmissiveIntensity?: number }
          if (ud.origEmissive) mat.emissive.copy(ud.origEmissive)
          if ('emissiveIntensity' in mat) mat.emissiveIntensity = ud.origEmissiveIntensity ?? 0
        })
        const sel = meshesByCtrl.current[id] || []
        sel.forEach((m) => {
          const mat = m.material as THREE.MeshStandardMaterial
          if (mat && 'emissive' in mat) {
            mat.emissive.copy(HIGHLIGHT_COLOR)
            mat.emissiveIntensity = 0.4
          }
        })
      }

      const setFaderValue = (id: FadoControlId, ccValue: number) => {
        const kf = faderKeyframesRef.current[id]
        const t = Math.max(0, Math.min(127, ccValue)) / 127
        if (kf) {
          kf.node.position.lerpVectors(kf.startPos, kf.endPos, 1 - t)
        }
      }
      triggerSetValue.current = setFaderValue

      // Raycaster para clic
      const raycaster = new THREE.Raycaster()
      const pointer = new THREE.Vector2()
      const hitControl = (e: PointerEvent): FadoControlId | null => {
        const rect = renderer.domElement.getBoundingClientRect()
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        raycaster.setFromCamera(pointer, camera)
        const hits = raycaster.intersectObjects(scene.children, true)
        for (const h of hits) {
          const id = (h.object.userData as { controlId?: FadoControlId }).controlId
          if (id) return id
        }
        return null
      }
      const onPointerDown = (e: PointerEvent) => {
        const id = hitControl(e)
        if (id) onSelectRef.current(id)
      }
      renderer.domElement.addEventListener('pointerdown', onPointerDown)

      const onResize = () => {
        if (!mount) return
        camera.aspect = mount.clientWidth / mount.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(mount.clientWidth, mount.clientHeight)
        fitCameraToModel()
        setResizeTick((t) => t + 1)
      }
      const ro = new ResizeObserver(onResize)
      ro.observe(mount)

      let frameId = 0
      const tmpV = new THREE.Vector3()
      const tick = () => {
        // Pulso verde sobre control seleccionado
        const selNow = selectedIdRef.current
        if (selNow) {
          const pulse = 0.55 + 0.55 * (0.5 + 0.5 * Math.sin(performance.now() * 0.006))
          const ms = meshesByCtrl.current[selNow]
          ms?.forEach((m) => {
            const mat = m.material as THREE.MeshStandardMaterial
            if (mat && 'emissive' in mat) {
              mat.emissive.copy(HIGHLIGHT_COLOR)
              mat.emissiveIntensity = pulse
            }
          })
        }

        // Actualizar posiciones de etiquetas cada frame
        const overlay = overlayRef.current
        if (overlay && mount) {
          const w = mount.clientWidth
          const h = mount.clientHeight
          const els = labelElsRef.current
          for (const [id, meshes] of Object.entries(meshesByCtrl.current)) {
            if (!meshes || meshes.length === 0) continue
            const el = els[id]
            if (!el) continue
            const box = new THREE.Box3()
            meshes.forEach((m) => box.expandByObject(m))
            box.getCenter(tmpV)
            tmpV.project(camera)
            el.style.left = ((tmpV.x * 0.5 + 0.5) * w) + 'px'
            el.style.top = ((-tmpV.y * 0.5 + 0.5) * h - 14) + 'px'
          }
        }

        controls.update()
        renderer.render(scene, camera)
        frameId = requestAnimationFrame(tick)
      }
      tick()

      return () => {
        triggerSetValue.current = () => {}
        cancelAnimationFrame(frameId)
        ro.disconnect()
        renderer.domElement.removeEventListener('pointerdown', onPointerDown)
        controls.dispose()
        renderer.dispose()
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Re-aplicar highlight estático al cambiar selección
    useEffect(() => {
      const all = Object.values(meshesByCtrl.current).flat()
      all.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial
        if (!mat || !('emissive' in mat)) return
        const ud = m.userData as { origEmissive?: THREE.Color; origEmissiveIntensity?: number }
        if (ud.origEmissive) mat.emissive.copy(ud.origEmissive)
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = ud.origEmissiveIntensity ?? 0
      })
      if (selectedId) {
        const sel = meshesByCtrl.current[selectedId] || []
        sel.forEach((m) => {
          const mat = m.material as THREE.MeshStandardMaterial
          if (mat && 'emissive' in mat) {
            mat.emissive.copy(HIGHLIGHT_COLOR)
            mat.emissiveIntensity = 0.4
          }
        })
      }
    }, [selectedId])

    // Etiquetas flotantes — F1-F8 sobre cada fader
    useEffect(() => {
      const overlay = overlayRef.current
      const cam = cameraRef.current
      const mount = mountRef.current
      if (!overlay || !cam || !mount || !labelsReady) return

      if (!showLabels) {
        while (overlay.firstChild) overlay.removeChild(overlay.firstChild)
        labelElsRef.current = {}
        return
      }

      const centers = controlCentersRef.current
      const w = mount.clientWidth
      const h = mount.clientHeight
      const els = labelElsRef.current
      for (const id of Object.keys(centers)) {
        const pos = centers[id].clone().project(cam)
        const x = (pos.x * 0.5 + 0.5) * w
        const y = (-pos.y * 0.5 + 0.5) * h - 14
        let el = els[id]
        if (!el) {
          el = document.createElement('div')
          el.style.cssText = 'position:absolute;pointer-events:none;font-family:"JetBrains Mono",monospace;font-size:10px;font-weight:700;letter-spacing:0.02em;white-space:nowrap;transform:translate(-50%,-100%);'
          overlay.appendChild(el)
          els[id] = el
        }
        el.style.left = x + 'px'
        el.style.top = y + 'px'
        const isSel = selectedId === id
        const shortLbl = fadoShortLabel(id as FadoControlId)
        const userLbl = midiState?.[id as FadoControlId]?.[bank]?.label ?? ''
        const isDefault = !userLbl || userLbl.startsWith('Fader ')
        el.style.color = isSel ? '#39ff14' : 'rgba(255,255,255,0.72)'
        el.style.textShadow = isSel
          ? '0 0 10px rgba(57,255,20,1), 0 0 4px rgba(57,255,20,0.8), 0 1px 2px rgba(0,0,0,0.9)'
          : '0 1px 2px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.6)'
        el.style.textAlign = 'center'
        el.style.lineHeight = '1.3'
        // Rebuild content via safe DOM (evita XSS con input de usuario)
        while (el.firstChild) el.removeChild(el.firstChild)
        if (!isDefault) {
          const top = document.createElement('span')
          top.style.cssText = 'display:block;font-size:9px;opacity:0.5'
          top.textContent = shortLbl
          el.appendChild(top)
          const bot = document.createElement('span')
          bot.style.cssText = 'display:block;font-size:11px;font-weight:800'
          bot.textContent = userLbl
          el.appendChild(bot)
        } else {
          el.textContent = shortLbl
        }
      }
    }, [showLabels, midiState, bank, selectedId, labelsReady, resizeTick])

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%', background: 'transparent', cursor: 'crosshair' }} />
        <div ref={overlayRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} />
      </div>
    )
  }
)

FadoScene.displayName = 'FadoScene'
export default FadoScene
