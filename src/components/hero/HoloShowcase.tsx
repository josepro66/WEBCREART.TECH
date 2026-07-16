/**
 * HoloShowcase — carrusel 3D del Hero con navegación por flechas.
 *
 * Canvas Three.js con modelos CREART (WAVO, BEATO16, MIXO, FADO, KNOBO)
 * controlados manualmente con flechas ← →, iluminación de estudio mejorada,
 * transiciones crossfade + zoom suaves, y materiales PBR.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'

interface Slide {
  id: string
  label: string
  code: string
  spec: string
  model: string
  scale: number
  tint: string
}

const SLIDES: Slide[] = [
  {
    id: 'wavo',
    label: 'WAVO',
    code: 'CRT-WV-01',
    spec: '7 KNOBS · TECLADO · SECUENCIADOR',
    model: 'models/wavo.glb',
    scale: 1.55,
    tint: '#00E5FF',
  },
  {
    id: 'beato16',
    label: 'BEATO 16',
    code: 'CRT-B16-04',
    spec: '16 PADS RGB · 4 KNOBS · 4 FADERS',
    model: 'models/BEATO16.glb',
    scale: 1.5,
    tint: '#C8FF4D',
  },
  {
    id: 'mixo',
    label: 'MIXO',
    code: 'CRT-MX-02',
    spec: '4 FADERS · 4 KNOBS · 4 ARCADE',
    model: 'models/MIXO.glb',
    scale: 1.55,
    tint: '#FF9F43',
  },
  {
    id: 'fado',
    label: 'FADO',
    code: 'CRT-FD-08',
    spec: '8 FADERS DE PRECISIÓN',
    model: 'models/FADO.glb',
    scale: 1.55,
    tint: '#B07CFF',
  },
  {
    id: 'knobo',
    label: 'KNOBO',
    code: 'CRT-KN-08',
    spec: '8 KNOBS · OLED · METAL',
    model: 'models/KNOBO.glb',
    scale: 1.55,
    tint: '#FF3D77',
  },
]

const TRANSITION_DURATION = 0.35
const FPS60 = 1 / 60

const HoloShowcase: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const activeRef = useRef(0)
  const modelsRef = useRef<Record<string, THREE.Group>>({})
  const transitioningRef = useRef(false)

  useEffect(() => { activeRef.current = activeIdx }, [activeIdx])

  const goNext = useCallback(() => {
    if (transitioningRef.current) return
    setActiveIdx((i) => (i + 1) % SLIDES.length)
  }, [])

  const goPrev = useCallback(() => {
    if (transitioningRef.current) return
    setActiveIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length)
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(34, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 1.1, 4.2)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // ── Iluminación estilo ProductModelViewer ──

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1)
    keyLight.position.set(3, 5, 4)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2048, 2048)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x99ccff, 0.6)
    fillLight.position.set(-4, 2, -3)
    scene.add(fillLight)

    const rimLight = new THREE.PointLight(0x00e5ff, 0.6, 8)
    rimLight.position.set(0, 1.5, -2)
    scene.add(rimLight)

    // ── Cargar modelos ──
    let cancelled = false
    const loadAll = async () => {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js')
      const loader = new GLTFLoader()
      loader.setMeshoptDecoder(MeshoptDecoder)

      const base = import.meta.env.BASE_URL
      await Promise.all(SLIDES.map((s) => new Promise<void>((resolve) => {
        loader.load(`${base}${s.model}`, (gltf) => {
          if (cancelled) return resolve()
          const model = gltf.scene

          // Remove junk objects that inflate the bounding box (MIXO GLB has SnowBall + skeleton nodes)
          const junkNames = ['snowball', 'skeleton', 'empty.001', 'empty.002', 'button:screw']
          const toRemove: THREE.Object3D[] = []
          model.traverse((child) => {
            const n = child.name.toLowerCase()
            if (junkNames.some(j => n.includes(j))) toRemove.push(child)
          })
          toRemove.forEach(obj => obj.removeFromParent())

          // Compute bounding box from mesh geometry only (avoids transform hierarchy issues)
          model.updateWorldMatrix(true, true)
          const box = new THREE.Box3()
          model.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
              child.geometry.computeBoundingBox()
              if (child.geometry.boundingBox) {
                const meshBox = child.geometry.boundingBox.clone()
                meshBox.applyMatrix4(child.matrixWorld)
                box.union(meshBox)
              }
            }
          })
          if (box.isEmpty()) box.setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = s.scale / maxDim
          model.scale.setScalar(scale)
          model.position.set(
            -center.x * scale,
            -center.y * scale,
            -center.z * scale
          )
          model.rotation.set(0.28, -0.45, 0)

          model.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return
            obj.castShadow = true
            obj.receiveShadow = true

            const meshName = (obj.name || '').toLowerCase()
            const parentName = obj.parent ? (obj.parent.name || '').toLowerCase() : ''

            if (meshName.includes('logo') || meshName.includes('beato') || meshName.includes('crearttech') || meshName.includes('custom midi') || meshName.includes('mesa de trabajo')) {
              if (obj.material && 'map' in obj.material && obj.material.map) {
                ;(obj.material as THREE.Material).transparent = true
                ;(obj.material as THREE.Material).alphaTest = 0.9
              }
              return
            }
            if (meshName.includes('pantallawavo')) return
            if (meshName.includes('bolt')) {
              obj.material = new THREE.MeshStandardMaterial({ color: '#777777', metalness: 0.9, roughness: 0.15 })
            } else if (meshName.includes('cubechasis')) {
              obj.material = new THREE.MeshPhysicalMaterial({ color: '#cc0000', metalness: 0.3, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.25 })
            } else if (meshName.includes('chasis')) {
              obj.material = new THREE.MeshPhysicalMaterial({ color: '#7CBA40', metalness: 0.8, roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.2 })
            } else if (meshName.includes('boton') || meshName.includes('tapa')) {
              const num = parseInt(meshName.replace(/\D/g, '') || '0')
              const isPink = num <= 4
              obj.material = new THREE.MeshPhysicalMaterial({ color: isPink ? '#B8005C' : '#17181c', metalness: 0.0, roughness: isPink ? 0.5 : 0.32, clearcoat: 1.0, clearcoatRoughness: 0.06 })
            } else if (meshName.includes('tecla')) {
              obj.material = new THREE.MeshPhysicalMaterial({ color: '#CC0000', metalness: 0.0, roughness: 0.08, transmission: 0.3, thickness: 1.5, ior: 1.52, clearcoat: 1.0, clearcoatRoughness: 0.01, transparent: true, opacity: 0.92, reflectivity: 0.9, attenuationColor: new THREE.Color('#FF0000'), attenuationDistance: 0.5 })
            } else if (meshName.startsWith('knob') || meshName.includes('encoder') || parentName.includes('knob')) {
              obj.material = new THREE.MeshStandardMaterial({ color: '#1C1C1C', metalness: 0.3, roughness: 0.7 })
            } else if (meshName.includes('fader')) {
              obj.material = new THREE.MeshPhysicalMaterial({ color: '#FF2D95', metalness: 0.0, roughness: 0.35, clearcoat: 0.9, clearcoatRoughness: 0.08 })
            } else if (meshName.includes('aro') || meshName.includes('cylinder')) {
              obj.material = new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0.0, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1, transparent: true, opacity: 0.7 })
            }
          })

          // Cargar textura de pantalla para el Wavo
          if (s.id === 'wavo') {
            const texLoader = new THREE.TextureLoader()
            texLoader.load(
              `${base}textures/pantallawavo.png`,
              (texture) => {
                texture.flipY = false
                texture.colorSpace = THREE.SRGBColorSpace
                model.traverse((child) => {
                  if (child instanceof THREE.Mesh && child.name.toLowerCase().includes('pantallawavo')) {
                    child.material = new THREE.MeshPhysicalMaterial({
                      map: texture,
                      emissiveMap: texture,
                      color: 0xffffff,
                      roughness: 0.1,
                      metalness: 0.9,
                      emissive: new THREE.Color(0xffffff),
                      emissiveIntensity: 0.8,
                    })
                  }
                })
              },
              undefined,
              () => {}
            )
          }

          model.visible = false
          model.userData.baseScale = scale
          model.userData.basePosition = model.position.clone()
          modelsRef.current[s.id] = model
          scene.add(model)
          resolve()
        }, undefined, () => resolve())
      })))

      const first = modelsRef.current[SLIDES[activeRef.current].id]
      if (first) first.visible = true
    }
    loadAll()

    // ── Animation loop ──
    let frameId = 0
    let t = 0
    let lastActive = activeRef.current
    let transitionProgress = 1
    let outgoingModel: THREE.Group | null = null
    let incomingModel: THREE.Group | null = null

    // Easing "back out" — overshoot que rebota como en juegos
    const easeOutBack = (x: number) => {
      const c1 = 1.70158
      const c3 = c1 + 1
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
    }

    let transitionDir = 1 // 1 = next, -1 = prev

    const tick = () => {
      t += 0.007

      // ── Detectar cambio de modelo ──
      if (lastActive !== activeRef.current) {
        const newIdx = activeRef.current
        const oldIdx = lastActive
        transitionDir = ((newIdx - oldIdx + SLIDES.length) % SLIDES.length) <= SLIDES.length / 2 ? 1 : -1

        outgoingModel = modelsRef.current[SLIDES[oldIdx]?.id] || null
        incomingModel = modelsRef.current[SLIDES[newIdx]?.id] || null

        if (incomingModel) {
          incomingModel.visible = true
          const bs = incomingModel.userData.baseScale || 1
          incomingModel.scale.setScalar(bs)
        }

        transitionProgress = 0
        transitioningRef.current = true
        lastActive = activeRef.current
      }

      // ── Transición snap lateral con overshoot ──
      if (transitionProgress < 1) {
        transitionProgress = Math.min(1, transitionProgress + FPS60 / TRANSITION_DURATION)
        const ease = easeOutBack(transitionProgress)

        if (outgoingModel) {
          const bp = outgoingModel.userData.basePosition as THREE.Vector3
          outgoingModel.position.x = bp.x + ease * 3 * transitionDir
          outgoingModel.rotation.y = -0.55 + ease * 1.2 * transitionDir

          if (transitionProgress >= 1) {
            outgoingModel.visible = false
            outgoingModel.position.copy(bp)
            outgoingModel.rotation.set(0.28, -0.55, 0)
            outgoingModel = null
          }
        }

        if (incomingModel) {
          const bp = incomingModel.userData.basePosition as THREE.Vector3
          const slideIn = (1 - ease) * -3 * transitionDir
          incomingModel.position.x = bp.x + slideIn
          incomingModel.rotation.y = -0.55 + (1 - ease) * -1.2 * transitionDir
          incomingModel.rotation.x = 0.28

          if (transitionProgress >= 1) {
            incomingModel.position.copy(bp)
            incomingModel.rotation.set(0.28, -0.55, 0)
            incomingModel = null
            transitioningRef.current = false
          }
        }
      }

      // ── Animar modelo activo (flotar suave) ──
      const activeModel = modelsRef.current[SLIDES[activeRef.current]?.id]
      if (activeModel && transitionProgress >= 1) {
        const bp = activeModel.userData.basePosition as THREE.Vector3
        activeModel.rotation.y = -0.55 + Math.sin(t * 0.35) * 0.22 + t * 0.12
        activeModel.position.y = bp.y + Math.sin(t * 0.7) * 0.05
        activeModel.rotation.x = 0.28 + Math.sin(t * 0.5) * 0.02
      }


      renderer.render(scene, camera)
      frameId = requestAnimationFrame(tick)
    }
    tick()

    const ro = new ResizeObserver(() => {
      const nw = mount.clientWidth, nh = mount.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    })
    ro.observe(mount)

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      ro.disconnect()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  const active = SLIDES[activeIdx]

  return (
    <div className="relative w-full h-full">
      {/* HUD: anillos holográficos */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center">
        <div
          className="relative"
          style={{ width: 'min(78%, 520px)', aspectRatio: '1 / 1' }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: '1px solid rgba(255,255,255,0.06)',
              animation: 'holo-spin 34s linear infinite',
            }}
          >
            <div className="absolute inset-2 rounded-full border border-dashed border-white/[0.04]" />
          </div>
          <div
            className="absolute inset-[10%] rounded-full"
            style={{
              border: `1px solid ${active.tint}15`,
              animation: 'holo-spin-rev 22s linear infinite',
              transition: 'border-color 0.8s',
            }}
          >
            {[0, 60, 120, 180, 240, 300].map(deg => (
              <span
                key={deg}
                className="absolute w-2.5 h-2.5"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) rotate(${deg}deg) translate(0, -50%)`,
                  transformOrigin: 'center',
                  borderTop: `1px solid ${active.tint}`,
                  opacity: 0.5,
                  transition: 'border-color 0.6s',
                }}
              />
            ))}
          </div>
          <div
            className="absolute inset-[24%] rounded-full"
            style={{
              border: '1px solid rgba(255,255,255,0.04)',
              animation: 'holo-spin 46s linear infinite, holo-pulse 4s ease-in-out infinite',
            }}
          />
          <div
            className="absolute inset-[12%] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${active.tint}18 0%, ${active.tint}08 40%, transparent 70%)`,
              transition: 'background 1s',
              filter: 'blur(20px)',
            }}
          />
          <div
            className="absolute inset-[30%] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${active.tint}10 0%, transparent 60%)`,
              transition: 'background 1s',
              filter: 'blur(30px)',
              animation: 'holo-pulse 3s ease-in-out infinite reverse',
            }}
          />
        </div>
      </div>

      {/* Canvas 3D */}
      <div ref={mountRef} className="absolute inset-0 z-10" />



      {/* ── Flechas de navegación ── */}
      <button
        onClick={goPrev}
        aria-label="Modelo anterior"
        className="holo-arrow holo-arrow-left"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button
        onClick={goNext}
        aria-label="Siguiente modelo"
        className="holo-arrow holo-arrow-right"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Nombre del modelo — esquina inferior izquierda */}
      <div className="absolute bottom-16 left-4 z-30 pointer-events-none">
        <div
          key={active.id}
          className="text-3xl font-grotesk font-bold tracking-[-0.02em] text-white"
          style={{ animation: 'holo-slide-in 0.6s ease-out' }}
        >
          {active.label}
        </div>
      </div>

      {/* Indicadores de posición */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => {
              if (!transitioningRef.current) setActiveIdx(i)
            }}
            aria-label={`Ver ${s.label}`}
            className="group relative overflow-hidden"
            style={{
              width: i === activeIdx ? 30 : 14,
              height: 3,
              borderRadius: 2,
              background: i === activeIdx ? s.tint : 'rgba(255,255,255,0.14)',
              boxShadow: 'none',
              transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes holo-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes holo-spin-rev {
          from { transform: rotate(360deg); }
          to   { transform: rotate(0deg); }
        }
        @keyframes holo-slide-in {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes holo-pulse {
          0%, 100% { opacity: 0.5; transform: rotate(0deg) scale(1); }
          50%      { opacity: 1; transform: rotate(180deg) scale(1.02); }
        }
        .holo-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 30;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(10, 11, 13, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .holo-arrow:hover {
          border-color: ${SLIDES[0].tint}60;
          color: #fff;
          background: rgba(0, 229, 255, 0.08);
          box-shadow: none;
        }
        .holo-arrow:active {
          transform: translateY(-50%) scale(0.92);
        }
        .holo-arrow-left {
          left: 4px;
        }
        .holo-arrow-right {
          right: 4px;
        }
      `}</style>
    </div>
  )
}

export default HoloShowcase
