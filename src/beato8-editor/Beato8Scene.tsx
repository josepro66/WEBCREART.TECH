import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { type Beato8ControlId, BEATO8_MESH_TO_CONTROL, BEATO8_LABELS, isBeato8Pad } from './beato8State'

export interface Beato8SceneHandle {
  setKnobValue: (id: Beato8ControlId, ccValue: number) => void
  setPadLit: (id: Beato8ControlId, on: boolean) => void
}

interface Props {
  selectedId: Beato8ControlId | null
  onSelect: (id: Beato8ControlId) => void
  showLabels?: boolean
}

const LED_ON_COLOR = 0x00e5ff
const LED_OFF_COLOR = 0x1a1a1a

const Beato8Scene = forwardRef<Beato8SceneHandle, Props>(({ selectedId, onSelect, showLabels = true }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const triggerKnob = useRef<(id: Beato8ControlId, v: number) => void>(() => {})
  const triggerPad = useRef<(id: Beato8ControlId, on: boolean) => void>(() => {})
  useImperativeHandle(ref, () => ({
    setKnobValue: (id, v) => triggerKnob.current(id, v),
    setPadLit: (id, on) => triggerPad.current(id, on),
  }))
  const meshesByControlRef = useRef<Record<string, THREE.Mesh[]>>({})
  const pressStateRef = useRef<Record<string, { current: number; target: number; restY: number }>>({})
  const selectedRef = useRef(selectedId)
  const showLabelsRef = useRef(showLabels)
  const onSelectRef = useRef(onSelect)

  useEffect(() => { selectedRef.current = selectedId }, [selectedId])
  useEffect(() => { showLabelsRef.current = showLabels }, [showLabels])
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = null

    const w = mount.clientWidth
    const h = mount.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.6
    mount.appendChild(renderer.domElement)

    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100)
    camera.position.set(0, 2.9, 0.78)
    camera.lookAt(0, 0, 0)
    const camDir = camera.position.clone().normalize()
    let modelSize: { x: number; y: number; z: number } | null = null

    const fitCameraToModel = () => {
      if (!modelSize || !mount) return
      const aspect = mount.clientWidth / mount.clientHeight
      const fovV = (camera.fov * Math.PI) / 180
      const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect)
      const distV = (modelSize.z / 2) / Math.tan(fovV / 2)
      const distH = (modelSize.x / 2) / Math.tan(fovH / 2)
      const dist = Math.max(distV, distH) * 1.08 // margen mínimo → modular
      camera.position.copy(camDir).multiplyScalar(dist)
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld(true)
    }

    scene.add(new THREE.HemisphereLight(0xf2f4f8, 0x0a0b0d, 0.8))
    const key = new THREE.DirectionalLight(0xffffff, 2.8)
    key.position.set(3, 5, 4); scene.add(key)
    const fill = new THREE.DirectionalLight(0xe8ecf2, 1.2)
    fill.position.set(-0.5, 0.5, 5); scene.add(fill)
    const back = new THREE.DirectionalLight(0xd8dee8, 0.7)
    back.position.set(-4, 2, -3); scene.add(back)
    const rimCyan = new THREE.PointLight(0x00e5ff, 1.6, 12)
    rimCyan.position.set(-2.5, 0.6, -1.5); scene.add(rimCyan)

    let envMap: THREE.Texture | null = null
    const loadEnv = async () => {
      try {
        const { RGBELoader } = await import('three/examples/jsm/loaders/RGBELoader.js')
        new RGBELoader().load(`${import.meta.env.BASE_URL}textures/studio_small_03_1k.hdr`, (tex) => {
          tex.mapping = THREE.EquirectangularReflectionMapping
          envMap = tex; scene.environment = tex
        })
      } catch {}
    }
    loadEnv()

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let hoveredId: string | null = null

    const labelCanvas = document.createElement('canvas')
    labelCanvas.width = 512; labelCanvas.height = 512
    const labelCtx = labelCanvas.getContext('2d')!
    const labelTexture = new THREE.CanvasTexture(labelCanvas)
    labelTexture.minFilter = THREE.LinearFilter
    const labelPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, depthTest: false })
    )
    labelPlane.position.set(0, 1.7, 0)
    labelPlane.rotation.x = -Math.PI / 2 + 0.26
    labelPlane.renderOrder = 999
    scene.add(labelPlane)

    const drawLabels = () => {
      const ctx = labelCtx
      ctx.clearRect(0, 0, 512, 512)
      if (!showLabelsRef.current) { labelTexture.needsUpdate = true; return }
      for (const [ctrlId, ms] of Object.entries(meshesByControlRef.current)) {
        if (!ms.length) continue
        const worldPos = new THREE.Vector3()
        ms[0].getWorldPosition(worldPos)
        const ndc = worldPos.clone().project(camera)
        const sx = (ndc.x * 0.5 + 0.5) * 512
        const sy = (1 - (ndc.y * 0.5 + 0.5)) * 512
        const isSel = ctrlId === selectedRef.current
        ctx.font = `bold ${isSel ? 14 : 11}px JetBrains Mono, monospace`
        ctx.fillStyle = isSel ? '#00E5FF' : 'rgba(255,255,255,0.45)'
        ctx.textAlign = 'center'
        ctx.fillText(BEATO8_LABELS[ctrlId as Beato8ControlId] || ctrlId, sx, sy - 12)
      }
      labelTexture.needsUpdate = true
    }

    const loadModel = async () => {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js')
      const loader = new GLTFLoader()
      loader.setMeshoptDecoder(MeshoptDecoder)

      loader.load(`${import.meta.env.BASE_URL}models/BEATO.glb`, (gltf) => {
        const model = gltf.scene
        model.rotation.y = -Math.PI / 2

        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const scale = 1.5 / Math.max(size.x, size.y, size.z)
        model.position.sub(center.multiplyScalar(scale))
        model.scale.setScalar(scale)
        modelSize = { x: size.x * scale, y: size.y * scale, z: size.z * scale }
        fitCameraToModel()

        const byCtrl: Record<string, THREE.Mesh[]> = {}

        model.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return
          obj.castShadow = true; obj.receiveShadow = true
          const name = obj.name

          const ctrlId = Object.entries(BEATO8_MESH_TO_CONTROL).find(
            ([meshName]) => name.toLowerCase().startsWith(meshName.toLowerCase())
          )?.[1]

          if (ctrlId) {
            if (!byCtrl[ctrlId]) byCtrl[ctrlId] = []
            byCtrl[ctrlId].push(obj)

            if (isBeato8Pad(ctrlId)) {
              obj.position.y += 0.008
              obj.material = new THREE.MeshPhysicalMaterial({
                color: '#111111',
                emissive: new THREE.Color(0x222222),
                emissiveIntensity: 0.3,
                metalness: 0.6,
                roughness: 0.2,
                clearcoat: 1.0,
                clearcoatRoughness: 0.05,
                side: THREE.DoubleSide,
              })
              const wp = new THREE.Vector3()
              obj.getWorldPosition(wp)
              pressStateRef.current[ctrlId] = { current: 0, target: 0, restY: wp.y }
            }
          }
        })

        meshesByControlRef.current = byCtrl
        scene.add(model)
      })
    }
    loadModel()

    const onPointerMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    const onClick = () => {
      raycaster.setFromCamera(pointer, camera)
      const allMeshes: THREE.Mesh[] = []
      for (const ms of Object.values(meshesByControlRef.current)) allMeshes.push(...ms)
      const hits = raycaster.intersectObjects(allMeshes, false)
      if (hits.length) {
        const hit = hits[0].object as THREE.Mesh
        for (const [ctrlId, ms] of Object.entries(meshesByControlRef.current)) {
          if (ms.includes(hit)) { onSelectRef.current(ctrlId as Beato8ControlId); return }
        }
      }
    }

    const onPointerCheck = () => {
      raycaster.setFromCamera(pointer, camera)
      const allMeshes: THREE.Mesh[] = []
      for (const ms of Object.values(meshesByControlRef.current)) allMeshes.push(...ms)
      const hits = raycaster.intersectObjects(allMeshes, false)
      let newId: string | null = null
      if (hits.length) {
        const hit = hits[0].object as THREE.Mesh
        for (const [ctrlId, ms] of Object.entries(meshesByControlRef.current)) {
          if (ms.includes(hit)) { newId = ctrlId; break }
        }
      }
      if (newId !== hoveredId) { hoveredId = newId; mount.style.cursor = hoveredId ? 'pointer' : 'default' }
    }

    mount.addEventListener('pointermove', onPointerMove)
    mount.addEventListener('click', onClick)

    const rotateKnob = (id: Beato8ControlId, value: number) => {
      const ms = meshesByControlRef.current[id]
      if (!ms) return
      const angle = -((value / 127) * Math.PI * 1.5 - Math.PI * 0.75)
      ms.forEach((m) => { m.rotation.y = angle })
    }

    const pressButton = (id: Beato8ControlId) => {
      const ms = meshesByControlRef.current[id]
      if (!ms) return
      const s = pressStateRef.current[id]
      if (s) s.target = 1
      ms.forEach((m) => {
        if (m.material instanceof THREE.MeshStandardMaterial) {
          m.material.emissive = new THREE.Color(LED_ON_COLOR)
          m.material.emissiveIntensity = 2.0
        }
      })
    }

    const releaseButton = (id: Beato8ControlId) => {
      const ms = meshesByControlRef.current[id]
      if (!ms) return
      const s = pressStateRef.current[id]
      if (s) s.target = 0
      ms.forEach((m) => {
        if (m.material instanceof THREE.MeshStandardMaterial) {
          m.material.emissive = new THREE.Color(0x222222)
          m.material.emissiveIntensity = 0.3
        }
      })
    }

    let frameId = 0
    const PRESS_DEPTH = 0.015

    const tick = () => {
      onPointerCheck()

      for (const [id, s] of Object.entries(pressStateRef.current)) {
        const ms = meshesByControlRef.current[id]
        if (!ms) continue
        s.current += (s.target - s.current) * 0.25
        const offset = s.current * PRESS_DEPTH
        ms.forEach((m) => {
          const wp = new THREE.Vector3()
          m.getWorldPosition(wp)
          m.position.y = s.restY / (m.parent?.scale.y || 1) - offset
        })
      }

      drawLabels()
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(tick)
    }
    tick()

    const ro = new ResizeObserver(() => {
      const nw = mount.clientWidth, nh = mount.clientHeight
      camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh)
      fitCameraToModel()
    })
    ro.observe(mount)

    triggerKnob.current = (id, v) => rotateKnob(id, v)
    triggerPad.current = (id, on) => { if (on) pressButton(id); else releaseButton(id) }

    return () => {
      triggerKnob.current = () => {}; triggerPad.current = () => {}
      cancelAnimationFrame(frameId); ro.disconnect()
      mount.removeEventListener('pointermove', onPointerMove); mount.removeEventListener('click', onClick)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose(); if (envMap) envMap.dispose()
    }
  }, [])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
})

Beato8Scene.displayName = 'Beato8Scene'
export default Beato8Scene
