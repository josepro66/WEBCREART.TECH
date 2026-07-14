import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { MIXO_MESH_TO_CONTROL, type MixoControlId } from './mixoState'

export interface MixoSceneHandle {
  /** Mueve el fader a la posición proporcional (0-127). */
  setFaderValue: (id: MixoControlId, ccValue: number) => void
  /** Gira el knob a la posición proporcional (0-127). */
  setKnobValue: (id: MixoControlId, ccValue: number) => void
  /** Enciende/apaga el LED del pad. */
  setPadLit: (id: MixoControlId, on: boolean) => void
}

interface Props {
  selectedId: MixoControlId | null
  onSelect: (id: MixoControlId) => void
}

const HIGHLIGHT = new THREE.Color(0x39ff14)
const PRESS_COLOR = new THREE.Color(0xff9f43)
const PRESS_INTENSITY = 0.45
const LED_ON_COLOR = new THREE.Color(0x00ff40)
const LED_ON_INTENSITY = 4.0

/** Paleta del configurador — misma que MixoConfigurator.tsx */
const PALETTE_HEX: Record<string, string> = {
  Verde:'#7CBA40', Amarillo:'#F3E600', Azul:'#325EB7', Blanco:'#F5F5F5',
  Naranja:'#F47119', Morado:'#7B217E', Rojo:'#E52421', Negro:'#1C1C1C',
  Rosa:'#FF007F', Gris:'#808080',
}

/** Itera sobre el/los material(es) de un mesh (pueden venir como array). */
const forEachMat = (mesh: THREE.Mesh, fn: (m: THREE.MeshStandardMaterial) => void) => {
  const mm = mesh.material
  if (Array.isArray(mm)) mm.forEach((m) => fn(m as THREE.MeshStandardMaterial))
  else if (mm) fn(mm as THREE.MeshStandardMaterial)
}

const MixoScene = forwardRef<MixoSceneHandle, Props>(({ selectedId, onSelect }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null)
  // Puentes al mundo Three.js — el editor llama estos vía el handle imperativo.
  const triggerFader = useRef<(id: MixoControlId, v: number) => void>(() => {})
  const triggerKnob = useRef<(id: MixoControlId, v: number) => void>(() => {})
  const triggerPad = useRef<(id: MixoControlId, on: boolean) => void>(() => {})
  useImperativeHandle(ref, () => ({
    setFaderValue: (id, v) => triggerFader.current(id, v),
    setKnobValue: (id, v) => triggerKnob.current(id, v),
    setPadLit: (id, on) => triggerPad.current(id, on),
  }))
  const meshesByControlRef = useRef<Record<string, THREE.Mesh[]>>({})
  const pressStateRef = useRef<Record<string, { current: number; target: number; restY: number }>>({})
  const faderKeyframesRef = useRef<Record<string, { node: THREE.Object3D; startPos: THREE.Vector3; endPos: THREE.Vector3 }>>({})
  const buttonKeyframesRef = useRef<Record<string, { node: THREE.Object3D; startPos: THREE.Vector3; endPos: THREE.Vector3 }>>({})
  const faderValueRef = useRef<Record<string, number>>({})
  const moveFaderRef = useRef<(id: MixoControlId, val: number) => void>(() => {})
  const modelSizeRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const camDirRef = useRef<THREE.Vector3 | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const onSelectRef = useRef(onSelect)
  const selectedIdRef = useRef(selectedId)
  onSelectRef.current = onSelect
  selectedIdRef.current = selectedId

  const lastInterRef  = useRef(performance.now())
  const demoActiveRef = useRef(false)
  const demoPrevPhase = useRef(-1)

  // ── Setup de la escena (una sola vez) ─────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 2.9, 0.78) // 15° desde el cénit
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

    // ── IBL: RoomEnvironment → reflejos del chasis blanco y cúpulas ──
    const pmrem = new THREE.PMREMGenerator(renderer)
    pmrem.compileEquirectangularShader()
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envMap
    scene.environmentIntensity = 0.85

    // Luces idénticas al WAVO para look consistente
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const key = new THREE.DirectionalLight(0xffffff, 1.4)
    key.position.set(4, 6, 3); scene.add(key)
    const fill = new THREE.DirectionalLight(0xb0d4ff, 0.5)
    fill.position.set(-4, 2, -3); scene.add(fill)
    const front = new THREE.DirectionalLight(0xffffff, 0.35)
    front.position.set(0, 1, 4); scene.add(front)
    const rim = new THREE.PointLight(0xff9f43, 0.9, 10)
    rim.position.set(-1, 0.5, -2); scene.add(rim)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enabled = false

    const clock = new THREE.Clock()

    const fitCamera = () => {
      const sz = modelSizeRef.current
      const dir = camDirRef.current
      if (!sz || !dir || !mount) return
      const aspect = mount.clientWidth / mount.clientHeight
      const fovV = (camera.fov * Math.PI) / 180
      const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect)
      const distV = (sz.z / 2) / Math.tan(fovV / 2)
      const distH = (sz.x / 2) / Math.tan(fovH / 2)
      camera.position.copy(dir).multiplyScalar(Math.max(distV, distH) * 1.08) // margen mínimo → modular
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld(true)
    }

    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(`${import.meta.env.BASE_URL}models/MIXO.glb`, (gltf) => {
      const model = gltf.scene
      model.rotation.y = -Math.PI / 2

      // Rechazo de outliers: en el .blend hay objetos sueltos (Button:Screw.001
      // en X=-7.5, humano de referencia) que inflan el bbox y dejan el Mixo
      // diminuto. Recolectamos el centro world de cada mesh; luego calculamos la
      // mediana y descartamos meshes muy lejos de ella para computar el bbox
      // "real" del Mixo.
      model.updateMatrixWorld(true)
      type MInfo = { mesh: THREE.Mesh; center: THREE.Vector3; box: THREE.Box3 }
      const meshInfo: MInfo[] = []
      model.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return
        const b = new THREE.Box3().setFromObject(o)
        if (b.isEmpty()) return
        const sz = b.getSize(new THREE.Vector3())
        if (Math.max(sz.x, sz.y, sz.z) < 1e-6) return
        meshInfo.push({ mesh: o, center: b.getCenter(new THREE.Vector3()), box: b })
      })

      const box = new THREE.Box3()
      const hiddenSet = new Set<THREE.Object3D>()
      if (meshInfo.length > 0) {
        const median = (arr: number[]) => {
          const s = [...arr].sort((a, b) => a - b)
          return s[Math.floor(s.length / 2)]
        }
        const medCenter = new THREE.Vector3(
          median(meshInfo.map((m) => m.center.x)),
          median(meshInfo.map((m) => m.center.y)),
          median(meshInfo.map((m) => m.center.z)),
        )
        const dists = meshInfo.map((m) => m.center.distanceTo(medCenter))
        const medDist = median(dists) || 0.1
        // Umbral generoso: 8× la mediana o 0.5 unidades, lo que sea mayor.
        // El Mixo mide ~0.2 unidades → 0.5 es más que suficiente.
        const threshold = Math.max(medDist * 8, 0.5)
        meshInfo.forEach((m) => {
          if (m.center.distanceTo(medCenter) <= threshold) {
            box.union(m.box)
          } else {
            m.mesh.visible = false
            hiddenSet.add(m.mesh)
          }
        })
      }
      if (box.isEmpty()) box.setFromObject(model)

      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 1.5 / maxDim
      model.position.sub(center.multiplyScalar(scale))
      model.scale.setScalar(scale)
      modelSizeRef.current = { x: size.x * scale, y: size.y * scale, z: size.z * scale }
      fitCamera()

      // ── REALISMO: conservar los materiales PBR originales del GLB ──
      // El modelo fue autorizado en Blender con texturas (normal, metal-rough),
      // caps de colores en knobs/faders y LEDs cyan emisivos. Reemplazarlos por
      // materiales planos mata el realismo. Aquí solo clonamos (para que el
      // resaltado de un control no afecte a otros que comparten material) y
      // afinamos: reflejos del IBL + intensidad de los LEDs reales.
      const eachMat = (obj: THREE.Mesh, fn: (m: THREE.MeshStandardMaterial) => void) => {
        const mm = obj.material
        if (Array.isArray(mm)) mm.forEach((m) => fn(m as THREE.MeshStandardMaterial))
        else if (mm) fn(mm as THREE.MeshStandardMaterial)
      }

      model.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return
        // Clonar para aislar (materiales compartidos: Material.002, .015, .014…)
        if (Array.isArray(obj.material)) obj.material = obj.material.map((m) => m.clone())
        else if (obj.material) obj.material = (obj.material as THREE.Material).clone()

        eachMat(obj, (m) => {
          const nm = (m.name || '').toLowerCase()
          m.envMapIntensity = 1.15 // reflejos nítidos del estudio (IBL)

          // LED interno del botón arcade (Material.014): APAGADO por defecto.
          // Se enciende brillante al oprimir (ver pressButton / onPointerDown).
          if (nm.includes('material.014')) {
            m.emissive = new THREE.Color(0x00ff40)
            m.emissiveIntensity = 0.0
            m.envMapIntensity = 0.05
            m.toneMapped = true
          }
          // Domo frosted del botón arcade.
          // roughness=0.9 → sin highlights especulares GGX que dispararían el bloom.
          // Sin clearcoat, sin transmission, sin IBL → solo luz directa difusa (~0.5 linear).
          // emissiveIntensity=0 por defecto; sube a 4.0 al presionar → bloom se activa.
          else if (nm.includes('transpareny')) {
            const pm = m as THREE.MeshPhysicalMaterial
            pm.color = new THREE.Color(0x7dd87d)   // verde translúcido frosted
            pm.emissive = new THREE.Color(0x00ff40) // verde LED (cambia con color guardado)
            pm.emissiveIntensity = 0.0
            pm.envMapIntensity = 0.0
            pm.transparent = true
            pm.opacity = 0.9
            pm.roughness = 0.9       // muy rugoso → specular prácticamente 0
            pm.metalness = 0.0
            if ('transmission' in pm) (pm as any).transmission = 0.0
            if ('clearcoat' in pm) pm.clearcoat = 0.0
          }
          // Logos serigrafiados retroiluminados: brillo sutil, sin saturar bloom
          else if (nm.includes('crearttech') || nm.includes('logo') || nm.includes('mixo_mesa')) {
            m.emissiveIntensity = 0.85
          }

          // Guardar emissive original para restaurar tras resaltar/presionar
          if (m.emissive) {
            m.userData.origEmissive = m.emissive.clone()
            m.userData.origEmissiveIntensity = m.emissiveIntensity ?? 1
          }
        })
      })

      // Agrupar meshes por ControlId
      const meshes: Record<string, THREE.Mesh[]> = {}
      // Tapas huérfanas: cilindros sueltos dentro de Cube008 con material
      // "amarillos.*" que son los aros de los pads (el usuario solo alcanzó
      // a renombrar tapa1). Se asignan al pad más cercano por posición.
      const orphanTapas: THREE.Mesh[] = []
      // Meshes ya mapeados por nombre (tapa1, boton1-4, etc.)
      const applyTapaMat = (m: THREE.MeshStandardMaterial) => {
        m.color.set(0x7dd87d)
        m.metalness = 0.15
        m.roughness = 0.45
        m.envMapIntensity = 1.0
      }
      const paintTapa = (obj: THREE.Mesh) => {
        if (Array.isArray(obj.material)) {
          (obj.material as THREE.Material[]).forEach(m => applyTapaMat(m as THREE.MeshStandardMaterial))
        } else if (obj.material) {
          applyTapaMat(obj.material as THREE.MeshStandardMaterial)
        }
      }
      const isAmarillosMat = (obj: THREE.Mesh) => {
        const check = (m: THREE.Material) => (m.name || '').toLowerCase().includes('amarillos')
        return Array.isArray(obj.material)
          ? (obj.material as THREE.Material[]).some(check)
          : obj.material ? check(obj.material as THREE.Material) : false
      }
      model.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return
        const parentName = obj.parent?.name ?? ''
        const id: MixoControlId | undefined =
          MIXO_MESH_TO_CONTROL[obj.name] ?? MIXO_MESH_TO_CONTROL[parentName]
        const isTapaByName = /^tapa\d/i.test(parentName) || /^tapa\d/i.test(obj.name)
        // Cilindro suelto en Cube008 con material amarillos = tapa huérfana
        const isOrphanTapa = !id && parentName === 'Cube008' &&
          !/^boton/i.test(obj.name) && isAmarillosMat(obj)
        if (isOrphanTapa) {
          orphanTapas.push(obj)
          paintTapa(obj)
          ;(obj.userData as Record<string, unknown>).isTapa = true
          return
        }
        if (!id) return
        ;(obj.userData as Record<string, unknown>).controlId = id
        if (isTapaByName) {
          ;(obj.userData as Record<string, unknown>).isTapa = true
          paintTapa(obj)
        }
        ;(meshes[id] ||= []).push(obj)
      })
      // Asignar cada tapa huérfana al pad más cercano por posición mundial
      if (orphanTapas.length > 0) {
        model.updateMatrixWorld(true)
        const padPositions: { id: MixoControlId; pos: THREE.Vector3 }[] = []
        for (const pid of ['p0','p1','p2','p3'] as MixoControlId[]) {
          const padMeshes = meshes[pid]
          if (!padMeshes || padMeshes.length === 0) continue
          const b = new THREE.Box3()
          padMeshes.forEach(m => b.expandByObject(m))
          padPositions.push({ id: pid, pos: b.getCenter(new THREE.Vector3()) })
        }
        for (const tapa of orphanTapas) {
          const tapaPos = new THREE.Box3().setFromObject(tapa).getCenter(new THREE.Vector3())
          let best: { id: MixoControlId; d: number } | null = null
          for (const p of padPositions) {
            const d = tapaPos.distanceTo(p.pos)
            if (!best || d < best.d) best = { id: p.id, d }
          }
          if (best) {
            ;(tapa.userData as Record<string, unknown>).controlId = best.id
            ;(meshes[best.id] ||= []).push(tapa)
          }
        }
      }
      meshesByControlRef.current = meshes

      model.updateMatrixWorld(true)
      scene.add(model)

      // Extraer posiciones min/max de keyframes de cada fader
      // para interpolación directa (bypass AnimationMixer).
      // Los faders están nombrados fader1..fader4 en el GLB. Buscamos el nodo
      // por nombre exacto y luego el clip cuyo track de translation apunta ahí.
      const clipsWithNodes: { node: THREE.Object3D; startPos: THREE.Vector3; endPos: THREE.Vector3; fid: MixoControlId }[] = []
      for (let i = 0; i < 4; i++) {
        const nodeName = `fader${i + 1}`
        let node: THREE.Object3D | null = null
        model.traverse((o) => { if (o.name === nodeName) node = o })
        if (!node) continue
        for (const clip of gltf.animations) {
          const posTrack = clip.tracks.find((t) => {
            if (!t.name.endsWith('.position') && !t.name.endsWith('.translation')) return false
            const trackNodeName = t.name.substring(0, t.name.lastIndexOf('.'))
            return trackNodeName === nodeName
          })
          if (!posTrack) continue
          const v = posTrack.values
          const startPos = new THREE.Vector3(v[0], v[1], v[2])
          const endPos = new THREE.Vector3(v[v.length - 3], v[v.length - 2], v[v.length - 1])
          clipsWithNodes.push({ node, startPos, endPos, fid: ('f' + i) as MixoControlId })
          break
        }
      }
      console.log('[MixoScene] fader clips found:', clipsWithNodes.length, clipsWithNodes.map(c => c.fid))

      // Extraer keyframes de botones — el artista ya autorizó "hundirse" al
      // presionar. Usarlos evita el hack manual que movía el mesh en el eje
      // equivocado (algunos venían mostrando el botón saliendo).
      for (let i = 0; i < 4; i++) {
        const nodeName = `boton${i + 1}`
        let node: THREE.Object3D | null = null
        model.traverse((o) => { if (o.name === nodeName) node = o })
        if (!node) continue
        for (const clip of gltf.animations) {
          const posTrack = clip.tracks.find((t) => {
            if (!t.name.endsWith('.position') && !t.name.endsWith('.translation')) return false
            const trackNodeName = t.name.substring(0, t.name.lastIndexOf('.'))
            return trackNodeName === nodeName
          })
          if (!posTrack) continue
          const v = posTrack.values
          const startPos = new THREE.Vector3(v[0], v[1], v[2])
          const endPos = new THREE.Vector3(v[v.length - 3], v[v.length - 2], v[v.length - 1])
          buttonKeyframesRef.current[('p' + i) as MixoControlId] = { node, startPos, endPos }
          break
        }
      }
      // Registrar keyframes + meshes interactivos por fid (mapeo directo de
      // fader1..fader4 → f0..f3, sin sortear por posición)
      clipsWithNodes.forEach((kf) => {
        faderKeyframesRef.current[kf.fid] = { node: kf.node, startPos: kf.startPos, endPos: kf.endPos }
        kf.node.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            ;(o.userData as Record<string, unknown>).controlId = kf.fid
            ;(meshes[kf.fid] ||= []).push(o)
          }
        })
      })
      meshesByControlRef.current = meshes

      // ── Aplicar colores guardados del configurador ────────────────
      try {
        const saved = JSON.parse(localStorage.getItem('mixo_chosenColors') || '{}')
        model.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return
          const mn = obj.name.toLowerCase()

          // Chasis → blanco aluminio.
          // Three.js sanitiza los nombres (quita puntos), así "Cube.006" queda
          // como "Cube006". Detectamos por nombre de mesh o por material
          // ("Plastic Grey 25" en el GLB actual).
          const matNames = Array.isArray(obj.material)
            ? (obj.material as THREE.Material[]).map(m => (m.name || '').toLowerCase()).join(' ')
            : ((obj.material as THREE.Material)?.name || '').toLowerCase()
          const isChasis =
            mn.includes('chasis') || mn.includes('chassis') ||
            mn === 'cube006' || mn === 'cube.006' ||
            matNames.includes('plastic grey')
          if (isChasis) {
            eachMat(obj, (m) => {
              m.color.set(0xF0F0F0)
              m.metalness = 0.55
              m.roughness = 0.32
              m.envMapIntensity = 1.05
            })
          }

          // Domo del botón — LED emissive color según color guardado
          // El material se llama 'transpareny'; el padre es 'boton1'/'boton2'...
          const matNm = Array.isArray(obj.material)
            ? (obj.material as THREE.Material[]).map(m => (m as any).name || '').join(' ')
            : ((obj.material as any)?.name || '')
          if (matNm.toLowerCase().includes('transpareny') || mn.includes('boton')) {
            const btnKey = obj.parent?.name ?? obj.name
            const colorName: string | undefined =
              (saved.buttons as Record<string,string> | undefined)?.[btnKey] ??
              (saved.buttons as Record<string,string> | undefined)?.[btnKey.toLowerCase()]
            if (colorName) {
              const hex = PALETTE_HEX[colorName]
              if (hex) {
                eachMat(obj, (m) => {
                  if (!('emissive' in m)) return
                  m.emissive.set(hex)
                  m.userData.origEmissive = new THREE.Color(hex)
                })
              }
            }
          }

          // Knobs — caps oscuros
          const isKnobCap = ['knob1_','knob2_','knob3_','knob4_'].some(p => mn.startsWith(p))
          if (isKnobCap) {
            const colorName: string | undefined =
              (saved.knobs as Record<string,string> | undefined)?.[obj.name] ??
              (saved.knobs as Record<string,string> | undefined)?.[mn]
            if (colorName) {
              const hex = PALETTE_HEX[colorName]
              if (hex) eachMat(obj, (m) => m.color.set(hex))
            }
          }

          // Faders — caps
          const isFaderCap = ['fader1_1','fader2_1','fader3_1','fader4_1'].includes(mn)
          if (isFaderCap) {
            const colorName: string | undefined =
              (saved.faders as Record<string,string> | undefined)?.[obj.name] ??
              (saved.faders as Record<string,string> | undefined)?.[mn]
            if (colorName) {
              const hex = PALETTE_HEX[colorName]
              if (hex) eachMat(obj, (m) => m.color.set(hex))
            }
          }
        })
      } catch (_) { /* localStorage no disponible */ }

      if (selectedIdRef.current) applyHighlight(selectedIdRef.current)
    })

    // ── Raycaster ────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let pressedId: MixoControlId | null = null
    // Drag de faders: guardamos qué fader se está arrastrando
    let dragFaderId: MixoControlId | null = null
    let dragStartY = 0
    let dragStartValue = 0

    const hitControl = (e: PointerEvent): MixoControlId | null => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      for (const h of hits) {
        const id = (h.object.userData as { controlId?: MixoControlId }).controlId
        if (id) return id
      }
      return null
    }

    const resetIdle = () => {
      lastInterRef.current = performance.now()
      if (demoActiveRef.current) {
        demoActiveRef.current = false
        demoPrevPhase.current = -1
        ;(['f0','f1','f2','f3'] as MixoControlId[]).forEach(id => {
          moveFaderRef.current(id, 64)
        })
        // Restaurar botones
        ;(['p0','p1','p2','p3'] as MixoControlId[]).forEach(id => {
          const s = pressStateRef.current[id]
          if (s) s.target = 0
          restoreEmissive(id)
        })
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      resetIdle()
      const id = hitControl(e)
      if (!id) return
      pressedId = id
      onSelectRef.current(id)

      if (id.startsWith('f')) {
        // Iniciar drag de fader
        dragFaderId = id
        dragStartY = e.clientY
        dragStartValue = faderValueRef.current[id] ?? 64
        renderer.domElement.setPointerCapture(e.pointerId)
        return
      }

      // Press de botón o knob
      if (id.startsWith('p')) {
        let s = pressStateRef.current[id]
        const ms = meshesByControlRef.current[id]
        if (!s && ms?.[0]) {
          s = { current: 0, target: 1, restY: ms[0].position.y }
          pressStateRef.current[id] = s
        } else if (s) {
          s.target = 1
        }
      }
      // Botón arcade → usa el color LED guardado (origEmissive); resto → flash naranja
      const isButton = id.startsWith('p')
      const ms = meshesByControlRef.current[id]
      ms?.forEach((m) => {
        // Tapas: no encienden LED (son parte del chasis)
        if ((m.userData as { isTapa?: boolean }).isTapa) return
        forEachMat(m, (mat) => {
          if (!('emissive' in mat)) return
          if (isButton) {
            const orig = (mat.userData as { origEmissive?: THREE.Color }).origEmissive
            mat.emissive.copy(orig ?? LED_ON_COLOR)
            mat.emissiveIntensity = LED_ON_INTENSITY
          } else {
            mat.emissive.copy(PRESS_COLOR)
            mat.emissiveIntensity = PRESS_INTENSITY
          }
        })
      })
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragFaderId) return
      const dy = dragStartY - e.clientY // arriba = + valor
      const delta = (dy / 140) * 127
      const next = Math.max(0, Math.min(127, Math.round(dragStartValue + delta)))
      moveFaderRef.current(dragFaderId, next)
    }

    const onPointerUp = () => {
      dragFaderId = null
      if (!pressedId) return
      const id = pressedId
      pressedId = null
      const s = pressStateRef.current[id]
      if (s) s.target = 0
      restoreEmissive(id)
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)

    const ro = new ResizeObserver(() => {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      fitCamera()
    })
    ro.observe(mount)

    // ── Tick ─────────────────────────────────────────────────────────
    let frameId = 0
    const tick = () => {
      const delta = clock.getDelta()
      const speed = Math.min(1, delta * 18)

      // Animar press de botones
      for (const [id, s] of Object.entries(pressStateRef.current)) {
        if (s.current === s.target) continue
        s.current += (s.target - s.current) * speed
        if (Math.abs(s.current - s.target) < 0.001) s.current = s.target
        // Preferir keyframes autorizados en Blender (respetan el eje correcto).
        // Fallback al hack manual si el botón no tiene animación de press.
        const kf = buttonKeyframesRef.current[id]
        if (kf) {
          kf.node.position.lerpVectors(kf.startPos, kf.endPos, s.current)
        } else {
          const ms = meshesByControlRef.current[id]
          ms?.forEach((m) => { m.position.y = s.restY - s.current * 0.012 })
        }
      }

      // Pulso del seleccionado. Si es un pad oprimido (LED encendido), lo
      // pintamos con el color LED guardado en vez del verde de highlight —
      // así el usuario ve el pad "prender" con su color real al presionar.
      const sel = selectedIdRef.current
      if (sel) {
        const isButton = sel.startsWith('p')
        const press = pressStateRef.current[sel]
        const litAmount = press ? press.current : 0
        const pulse = 0.55 + 0.55 * (0.5 + 0.5 * Math.sin(performance.now() * 0.006))
        meshesByControlRef.current[sel]?.forEach((m) => {
          // Tapas no se iluminan como LED (son el aro fijo del chasis)
          if ((m.userData as { isTapa?: boolean }).isTapa && isButton && litAmount > 0.01) return
          forEachMat(m, (mat) => {
            if (!('emissive' in mat)) return
            if (isButton && litAmount > 0.01) {
              // Botón oprimido → color LED (origEmissive) a intensidad alta
              const orig = (mat.userData as { origEmissive?: THREE.Color }).origEmissive
              mat.emissive.copy(orig ?? LED_ON_COLOR)
              mat.emissiveIntensity = LED_ON_INTENSITY * litAmount
            } else {
              mat.emissive.copy(HIGHLIGHT)
              mat.emissiveIntensity = pulse
            }
          })
        })
      } else {
        // Pads no seleccionados pero oprimidos también deben alumbrar
        for (const [id, s] of Object.entries(pressStateRef.current)) {
          if (!id.startsWith('p') || s.current < 0.01) continue
          meshesByControlRef.current[id]?.forEach((m) => {
            if ((m.userData as { isTapa?: boolean }).isTapa) return
            forEachMat(m, (mat) => {
              if (!('emissive' in mat)) return
              const orig = (mat.userData as { origEmissive?: THREE.Color }).origEmissive
              mat.emissive.copy(orig ?? LED_ON_COLOR)
              mat.emissiveIntensity = LED_ON_INTENSITY * s.current
            })
          })
        }
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
      pmrem.dispose()
      envMap.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Resaltar seleccionado ─────────────────────────────────────────
  const restoreMatEmissive = (mat: THREE.MeshStandardMaterial) => {
    if (!('emissive' in mat)) return
    const ud = mat.userData as { origEmissive?: THREE.Color; origEmissiveIntensity?: number }
    if (ud.origEmissive) mat.emissive.copy(ud.origEmissive)
    mat.emissiveIntensity = ud.origEmissiveIntensity ?? 1
  }

  const applyHighlight = (id: MixoControlId) => {
    const meshes = meshesByControlRef.current
    // Restaurar todos a su emissive original (preserva los LEDs)
    Object.values(meshes).flat().forEach((m) => forEachMat(m, restoreMatEmissive))
    // Resaltar el seleccionado en verde pulsante
    meshes[id]?.forEach((m) => forEachMat(m, (mat) => {
      if (!('emissive' in mat)) return
      mat.emissive.copy(HIGHLIGHT)
      mat.emissiveIntensity = 0.10
    }))
  }

  const restoreEmissive = (id: MixoControlId) => {
    meshesByControlRef.current[id]?.forEach((m) => forEachMat(m, (mat) => {
      if (!('emissive' in mat)) return
      if (id === selectedIdRef.current) {
        mat.emissive.copy(HIGHLIGHT)
        mat.emissiveIntensity = 0.10
      } else {
        restoreMatEmissive(mat)
      }
    }))
  }

  useEffect(() => {
    if (selectedId) applyHighlight(selectedId)
  }, [selectedId])

  // ── Puentes de animación (llamados por el editor vía handle) ──────
  useEffect(() => {
    const moveFader = (id: MixoControlId, value: number) => {
      const kf = faderKeyframesRef.current[id]
      const t = Math.max(0, Math.min(127, value)) / 127
      console.log('[MixoScene.moveFader]', id, 'val:', value, 'kf?', !!kf, 'node:', kf?.node.name)
      if (kf) {
        kf.node.position.lerpVectors(kf.startPos, kf.endPos, 1 - t)
      }
      faderValueRef.current[id] = value
    }
    moveFaderRef.current = moveFader

    const rotateKnob = (id: MixoControlId, value: number) => {
      const ms = meshesByControlRef.current[id]
      if (!ms) return
      const angle = -((value / 127) * Math.PI * 1.5 - Math.PI * 0.75)
      ms.forEach((m) => { m.rotation.y = angle })
    }

    const pressButton = (id: MixoControlId) => {
      const ms = meshesByControlRef.current[id]
      if (!ms?.[0]) return
      let s = pressStateRef.current[id]
      if (!s) {
        s = { current: 0, target: 1, restY: ms[0].position.y }
        pressStateRef.current[id] = s
      }
      s.target = 1
      // Note On → enciende el LED en el color guardado del configurador
      ms.forEach((m) => forEachMat(m, (mat) => {
        if (!('emissive' in mat)) return
        const orig = (mat.userData as { origEmissive?: THREE.Color }).origEmissive
        mat.emissive.copy(orig ?? LED_ON_COLOR)
        mat.emissiveIntensity = LED_ON_INTENSITY
      }))
    }

    const releaseButton = (id: MixoControlId) => {
      const s = pressStateRef.current[id]
      if (s) s.target = 0
      restoreEmissive(id)
    }

    // Exponer las funciones internas al handle imperativo. El MIDI de hardware
    // lo maneja MixoEditorPage (único dueño del puerto), que traduce CC/nota a
    // id lógico según el banco y llama estos puentes.
    triggerFader.current = (id, v) => moveFader(id, v)
    triggerKnob.current = (id, v) => rotateKnob(id, v)
    triggerPad.current = (id, on) => { if (on) pressButton(id); else releaseButton(id) }

    return () => {
      triggerFader.current = () => {}
      triggerKnob.current = () => {}
      triggerPad.current = () => {}
    }
  }, [])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
})

MixoScene.displayName = 'MixoScene'

export default MixoScene
