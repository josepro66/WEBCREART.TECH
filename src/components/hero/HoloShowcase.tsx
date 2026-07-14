/**
 * HoloShowcase — carrusel orbital 3D del Hero.
 *
 * Canvas Three.js con modelos CREART (WAVO, BEATO16, MIXO, FADO, KNOBO)
 * en rotación automática con iluminación de estudio HDR, transiciones
 * crossfade + zoom suaves, y materiales PBR mejorados.
 */
import React, { useEffect, useRef, useState } from 'react'
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

const TRANSITION_DURATION = 1.2
const FPS60 = 1 / 60

const HoloShowcase: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const activeRef = useRef(0)
  const modelsRef = useRef<Record<string, THREE.Group>>({})
  const autoRef = useRef<number | null>(null)

  useEffect(() => { activeRef.current = activeIdx }, [activeIdx])

  useEffect(() => {
    autoRef.current = window.setTimeout(() => {
      setActiveIdx((i) => (i + 1) % SLIDES.length)
    }, 6000)
    return () => {
      if (autoRef.current) window.clearTimeout(autoRef.current)
    }
  }, [activeIdx])

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
    renderer.toneMappingExposure = 1.4
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // ── Iluminación de estudio cinematográfica ──
    const hemi = new THREE.HemisphereLight(0xe8ecf2, 0x080a0f, 0.6)
    scene.add(hemi)

    // Key light — principal, sombras nítidas
    const key = new THREE.DirectionalLight(0xffffff, 3.0)
    key.position.set(3, 6, 4)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.bias = -0.001
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 20
    scene.add(key)

    // Fill suave desde el frente
    const fill = new THREE.DirectionalLight(0xd0dae8, 1.0)
    fill.position.set(-1, 1, 5)
    scene.add(fill)

    // Back/rim light — contorno trasero
    const back = new THREE.DirectionalLight(0xb0c4e0, 0.8)
    back.position.set(-3, 3, -4)
    scene.add(back)

    // Rim cian — acento de marca que baña el borde izquierdo
    const rimCyan = new THREE.PointLight(0x00e5ff, 2.2, 14)
    rimCyan.position.set(-3, 0.8, -1.5)
    scene.add(rimCyan)

    // Acento cálido sutil desde abajo-derecha
    const warmAccent = new THREE.PointLight(0xff9f43, 0.6, 10)
    warmAccent.position.set(2.5, -0.5, 1)
    scene.add(warmAccent)

    // Spot cenital — crea un disco de luz sobre el modelo
    const spot = new THREE.SpotLight(0xffffff, 1.8, 12, Math.PI / 6, 0.7, 1)
    spot.position.set(0, 7, 1)
    spot.target.position.set(0, 0, 0)
    scene.add(spot)
    scene.add(spot.target)

    // Environment map — carga el HDR para reflejos PBR
    let envMap: THREE.Texture | null = null
    const loadEnv = async () => {
      try {
        const { RGBELoader } = await import('three/examples/jsm/loaders/RGBELoader.js')
        const rgbe = new RGBELoader()
        rgbe.load(`${import.meta.env.BASE_URL}textures/studio_small_03_1k.hdr`, (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping
          envMap = texture
          scene.environment = texture
        })
      } catch {}
    }
    loadEnv()

    // ── Cargar modelos ──
    let cancelled = false
    const loadAll = async () => {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js')
      const loader = new GLTFLoader()
      loader.setMeshoptDecoder(MeshoptDecoder)

      const base = import.meta.env.BASE_URL
      await Promise.all(SLIDES.map((s, i) => new Promise<void>((resolve) => {
        loader.load(`${base}${s.model}`, (gltf) => {
          if (cancelled) return resolve()
          const model = gltf.scene

          // Centrar y escalar
          const box = new THREE.Box3().setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          const scale = s.scale / Math.max(size.x, size.y, size.z)
          model.position.sub(center.multiplyScalar(scale))
          model.scale.setScalar(scale)
          model.rotation.set(0.28, -0.45, 0)

          // Mejorar materiales PBR
          model.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return
            obj.castShadow = true
            obj.receiveShadow = true
            if (obj.material instanceof THREE.MeshStandardMaterial) {
              obj.material.envMapIntensity = 1.2
            }
          })

          model.visible = false
          model.userData.baseScale = scale
          modelsRef.current[s.id] = model
          scene.add(model)
          resolve()
        }, undefined, () => resolve())
      })))

      // Mostrar el primer modelo
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

    const easeInOutCubic = (x: number) =>
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

    const setModelOpacity = (model: THREE.Group, opacity: number) => {
      const needsTransparency = opacity < 1
      model.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh) || !obj.material) return
        const mat = obj.material as THREE.MeshStandardMaterial
        if (mat.transparent !== needsTransparency) {
          mat.transparent = needsTransparency
          mat.needsUpdate = true
        }
        mat.opacity = opacity
      })
    }

    const tick = () => {
      t += 0.007

      // ── Detectar cambio de modelo ──
      if (lastActive !== activeRef.current) {
        outgoingModel = modelsRef.current[SLIDES[lastActive]?.id] || null
        incomingModel = modelsRef.current[SLIDES[activeRef.current]?.id] || null

        if (incomingModel) {
          incomingModel.visible = true
          const bs = incomingModel.userData.baseScale || 1
          incomingModel.scale.setScalar(bs * 0.6)
          setModelOpacity(incomingModel, 0)
        }

        transitionProgress = 0
        lastActive = activeRef.current
      }

      // ── Transición crossfade + zoom ──
      if (transitionProgress < 1) {
        transitionProgress = Math.min(1, transitionProgress + FPS60 / TRANSITION_DURATION)
        const ease = easeInOutCubic(transitionProgress)

        if (outgoingModel) {
          const bs = outgoingModel.userData.baseScale || 1
          outgoingModel.scale.setScalar(bs * (1 + ease * 0.15))
          setModelOpacity(outgoingModel, 1 - ease)

          if (transitionProgress >= 1) {
            outgoingModel.visible = false
            outgoingModel.scale.setScalar(bs)
            setModelOpacity(outgoingModel, 1)
            outgoingModel = null
          }
        }

        if (incomingModel) {
          const bs = incomingModel.userData.baseScale || 1
          incomingModel.scale.setScalar(bs * (0.6 + ease * 0.4))
          setModelOpacity(incomingModel, ease)
          incomingModel.position.y = (1 - ease) * 0.5

          if (transitionProgress >= 1) {
            incomingModel.scale.setScalar(bs)
            setModelOpacity(incomingModel, 1)
            incomingModel = null
          }
        }
      }

      // ── Animar modelo activo ──
      const activeModel = modelsRef.current[SLIDES[activeRef.current]?.id]
      if (activeModel && transitionProgress >= 1) {
        activeModel.rotation.y = -0.55 + Math.sin(t * 0.35) * 0.22 + t * 0.12
        activeModel.position.y = Math.sin(t * 0.7) * 0.05
        activeModel.rotation.x = 0.28 + Math.sin(t * 0.5) * 0.02
      } else if (incomingModel && transitionProgress < 1) {
        incomingModel.rotation.y = -0.55 + Math.sin(t * 0.35) * 0.22 + t * 0.12
        incomingModel.rotation.x = 0.28 * easeInOutCubic(transitionProgress) + Math.sin(t * 0.5) * 0.02
      }

      // ── Rim light sigue el color del acento ──
      const tintColor = new THREE.Color(SLIDES[activeRef.current]?.tint || '#00e5ff')
      rimCyan.color.lerp(tintColor, 0.03)

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
      if (envMap) envMap.dispose()
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
          {/* Anillo exterior */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: '1px solid rgba(255,255,255,0.06)',
              animation: 'holo-spin 34s linear infinite',
            }}
          >
            <div className="absolute inset-2 rounded-full border border-dashed border-white/[0.04]" />
          </div>
          {/* Anillo medio con marcas del color activo */}
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
          {/* Anillo interior pulsante */}
          <div
            className="absolute inset-[24%] rounded-full"
            style={{
              border: '1px solid rgba(255,255,255,0.04)',
              animation: 'holo-spin 46s linear infinite, holo-pulse 4s ease-in-out infinite',
            }}
          />
          {/* Halo glow del acento */}
          <div
            className="absolute inset-[12%] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${active.tint}18 0%, ${active.tint}08 40%, transparent 70%)`,
              transition: 'background 1s',
              filter: 'blur(20px)',
            }}
          />
          {/* Segundo halo más sutil */}
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

      {/* Líneas de escaneo horizontales */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent 0%, ${active.tint}40 30%, ${active.tint}60 50%, ${active.tint}40 70%, transparent 100%)`,
            animation: 'holo-scan 5s linear infinite',
            transition: 'background 0.6s',
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)`,
            animation: 'holo-scan 7s linear 2s infinite',
            opacity: 0.3,
          }}
        />
      </div>

      {/* Readout técnico — esquina superior derecha */}
      <div className="absolute top-4 right-4 z-30 text-right pointer-events-none">
        <div
          className="text-[9px] font-plexmono tracking-[0.28em] uppercase"
          style={{ color: active.tint, transition: 'color 0.6s' }}
        >
          MODEL / {String(activeIdx + 1).padStart(2, '0')} of {String(SLIDES.length).padStart(2, '0')}
        </div>
        <div className="text-[10px] font-plexmono tracking-[0.2em] text-gray-500 mt-1">
          {active.code}
        </div>
      </div>

      {/* Nombre del modelo — esquina inferior izquierda */}
      <div className="absolute bottom-16 left-4 z-30 pointer-events-none">
        <div className="text-[9px] font-plexmono tracking-[0.28em] text-gray-500 uppercase mb-1">
          ▲ Especificación
        </div>
        <div
          key={active.id}
          className="text-3xl font-grotesk font-bold tracking-[-0.02em] text-white"
          style={{ animation: 'holo-slide-in 0.6s ease-out' }}
        >
          {active.label}
        </div>
        <div
          className="text-[10px] font-plexmono tracking-[0.16em] uppercase mt-1"
          style={{ color: `${active.tint}99`, transition: 'color 0.6s' }}
        >
          {active.spec}
        </div>
      </div>

      {/* Chips selectores */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveIdx(i)}
            aria-label={`Ver ${s.label}`}
            className="group relative overflow-hidden"
            style={{
              width: i === activeIdx ? 30 : 14,
              height: 3,
              borderRadius: 2,
              background: i === activeIdx ? s.tint : 'rgba(255,255,255,0.14)',
              boxShadow: i === activeIdx ? `0 0 8px ${s.tint}60` : 'none',
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
        @keyframes holo-scan {
          0%   { top: -2%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { top: 102%; opacity: 0; }
        }
        @keyframes holo-slide-in {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes holo-pulse {
          0%, 100% { opacity: 0.5; transform: rotate(0deg) scale(1); }
          50%      { opacity: 1; transform: rotate(180deg) scale(1.02); }
        }
      `}</style>
    </div>
  )
}

export default HoloShowcase
