import React, { useRef, Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, Environment, Float } from '@react-three/drei'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import HoloShowcase from './HoloShowcase'

function Logo3D() {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/logo3d.glb`)
  return (
    <Float speed={1.5} rotationIntensity={0} floatIntensity={0.12}>
      <primitive object={gltf.scene} scale={[12, 12, 12]} position={[0, 0.5, 1.5]} rotation={[0, Math.PI, 0]} />
    </Float>
  )
}

useGLTF.preload(`${import.meta.env.BASE_URL}models/logo3d.glb`)

function WavoHero() {
  const mountRef = useRef<HTMLDivElement>(null)

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
    renderer.toneMappingExposure = 1.8
    mount.appendChild(renderer.domElement)

    const camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 100)
    camera.position.set(-0.1, 0.8, 3.2)
    camera.lookAt(-0.1, -0.1, 0)

    // Iluminación de estudio: key blanca dura + fill neutro suave +
    // un solo rim cian (acento de marca). Sin luces disco moradas/rosas.
    scene.add(new THREE.HemisphereLight(0xf2f4f8, 0x0a0b0d, 0.9))

    const key = new THREE.DirectionalLight(0xffffff, 2.6)
    key.position.set(3, 5, 4)
    scene.add(key)

    const frontFill = new THREE.DirectionalLight(0xe8ecf2, 1.2)
    frontFill.position.set(-0.5, 0.5, 5)
    scene.add(frontFill)

    const backFill = new THREE.DirectionalLight(0xd8dee8, 0.7)
    backFill.position.set(-4, 2, -3)
    scene.add(backFill)

    const rimCyan = new THREE.PointLight(0x00e5ff, 1.6, 12)
    rimCyan.position.set(-2.5, 0.6, -1.5)
    scene.add(rimCyan)

    let model: THREE.Group | null = null
    let frameId = 0
    let t = 0

    const loadModel = async () => {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js')
      const loader = new GLTFLoader()
      loader.setMeshoptDecoder(MeshoptDecoder)

      loader.load(`${import.meta.env.BASE_URL}models/wavo.glb`, (gltf) => {
        model = gltf.scene

        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const scale = 1.55 / Math.max(size.x, size.y, size.z)
        model.position.sub(center.multiplyScalar(scale))
        model.scale.setScalar(scale)
        model.rotation.set(0.3, -0.45, 0)

        model.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return
          const n = obj.name.toLowerCase()

          if (n.includes('pantallawavo')) {
            obj.material = new THREE.MeshPhysicalMaterial({
              color: 0x000000, roughness: 0.05, metalness: 0.95,
              emissive: new THREE.Color(0x00e5ff), emissiveIntensity: 1.4,
            })
          } else if (n.includes('chasis')) {
            obj.material = new THREE.MeshPhysicalMaterial({
              color: '#F5F5F5', metalness: 0.05, roughness: 0.2,
              clearcoat: 1.0, clearcoatRoughness: 0.08,
            })
          } else if (n.includes('knob') || n.includes('encoder') || n.includes('dial') || n.includes('pot')) {
            obj.material = new THREE.MeshPhysicalMaterial({
              color: '#7B217E', metalness: 0.08, roughness: 0.35,
              clearcoat: 0.9, clearcoatRoughness: 0.07,
            })
          } else if (n.includes('tecla')) {
            const num = parseInt(n.replace(/\D/g, '') || '0')
            obj.material = new THREE.MeshPhysicalMaterial({
              color: num % 2 === 0 ? '#00e5ff' : '#7B217E',
              metalness: 0.05, roughness: 0.4,
              clearcoat: 0.9, clearcoatRoughness: 0.08,
              ...(num % 2 === 0 ? { emissive: new THREE.Color(0x00e5ff), emissiveIntensity: 0.3 } : {}),
            })
          } else if (n.includes('boton')) {
            const num = parseInt(n.replace(/\D/g, '') || '0')
            obj.material = new THREE.MeshPhysicalMaterial({
              color: num % 2 === 0 ? '#E52421' : '#FF007F',
              metalness: 0.0, roughness: 0.38,
              clearcoat: 1.0, clearcoatRoughness: 0.06,
            })
          } else if (n.includes('fader')) {
            obj.material = new THREE.MeshPhysicalMaterial({
              color: '#00e5ff', metalness: 0.2, roughness: 0.28,
              clearcoat: 0.9, clearcoatRoughness: 0.06,
              emissive: new THREE.Color(0x00e5ff), emissiveIntensity: 0.3,
            })
          }
        })

        // Try to load screen texture on top
        const texLoader = new THREE.TextureLoader()
        texLoader.load(
          `${import.meta.env.BASE_URL}textures/pantallawavo.png`,
          (texture) => {
            texture.flipY = false
            texture.colorSpace = THREE.SRGBColorSpace
            model!.traverse((obj) => {
              if (obj instanceof THREE.Mesh && obj.name.toLowerCase().includes('pantallawavo')) {
                obj.material = new THREE.MeshPhysicalMaterial({
                  map: texture, emissiveMap: texture,
                  color: 0xffffff, roughness: 0.05, metalness: 0.9,
                  emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.9,
                })
              }
            })
          }
        )

        scene.add(model)
      })
    }

    loadModel()

    const tick = () => {
      t += 0.008
      if (model) {
        model.position.y = Math.sin(t * 0.7) * 0.07
        model.rotation.y = -0.55 + Math.sin(t * 0.35) * 0.2
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
      cancelAnimationFrame(frameId)
      ro.disconnect()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}


const Hero: React.FC = () => {
  const navigate = useNavigate()

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#0A0B0D]">

      {/* ── Atmósfera industrial: luz de estudio + plano técnico ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Luz de estudio cayendo sobre la zona del render */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(1000px 700px at 72% 42%, #15181D 0%, #0A0B0D 58%, #060708 100%)',
          }}
        />
        {/* Rejilla de plano de ingeniería */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(140,160,185,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(140,160,185,0.05) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(1100px 750px at 60% 42%, rgba(0,0,0,0.9), transparent 82%)',
            WebkitMaskImage: 'radial-gradient(1100px 750px at 60% 42%, rgba(0,0,0,0.9), transparent 82%)',
          }}
        />
        {/* Línea de banco de trabajo */}
        <div
          className="absolute left-[6%] right-[6%] h-px"
          style={{
            top: '76%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 18%, rgba(255,255,255,0.07) 82%, transparent)',
          }}
        />
        {/* Viñeta inferior */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 62%, rgba(0,0,0,0.5) 100%)' }} />
      </div>

      {/* ── Mobile: 3D canvas como fondo ── */}
      <div className="absolute inset-0 z-0 lg:hidden">
        <Canvas camera={{ position: [0, 0, 5], fov: 95 }} style={{ touchAction: 'none' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.0} />
          <pointLight position={[10, 10, 10]} color="#00E5FF" intensity={0.5} />
          <Environment files={`${import.meta.env.BASE_URL}textures/studio_small_03_1k.hdr`} />
          <Suspense fallback={null}><Logo3D /></Suspense>
        </Canvas>
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* ── Layout ── */}
      <div className="relative z-10 w-full h-full flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-20 flex items-center gap-0 h-full">

          {/* ── Columna texto ── */}
          <div className="flex-1 flex flex-col justify-center lg:pr-12 text-center lg:text-left">


            {/* Headline: grotesca técnica, tracking cerrado */}
            <motion.h1
              className="font-grotesk font-bold leading-[0.98] tracking-[-0.03em] text-white mb-6"
              style={{ fontSize: 'clamp(2.6rem, 5.8vw, 5.2rem)' }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            >
              Controladores
              <br />
              MIDI{' '}
              <span className="text-neon-cyan">personalizados</span>
              <span className="text-gray-600">.</span>
            </motion.h1>

            {/* Subtítulo */}
            <motion.p
              className="text-gray-400 text-base md:text-lg font-inter leading-relaxed mb-10 max-w-md mx-auto lg:mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
            >
              Diseña, construye y usa tu controlador MIDI o sintetizador a tu manera.
              Chasis de metal, botones arcade, iluminación RGB — lo fabricamos para ti.
            </motion.p>

            {/* CTA */}
            <motion.div
              className="flex flex-col sm:flex-row items-center lg:items-start gap-3.5 mb-12 pointer-events-auto justify-center lg:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
            >
              <motion.button
                onClick={() => navigate('/configurator')}
                className="group px-8 py-3.5 bg-neon-cyan text-black font-plexmono font-semibold text-[13px] tracking-[0.06em] rounded-md hover:bg-cyan-300 transition-colors duration-200 shadow-[0_0_28px_-8px_rgba(0,229,255,0.55)]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                PERSONALIZAR
                <span className="inline-block ml-2 transition-transform duration-200 group-hover:translate-x-1">→</span>
              </motion.button>
              <motion.button
                onClick={() => document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-3.5 bg-transparent text-gray-300 font-plexmono text-[13px] tracking-[0.06em] rounded-md border border-white/[0.16] hover:border-white/40 hover:text-white transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                Ver productos
              </motion.button>
            </motion.div>

          </div>

          {/* ── Columna 3D (desktop) — Showcase cinematográfico ── */}
          <motion.div
            className="hidden lg:block flex-shrink-0 w-[50%] h-full relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, delay: 0.3, ease: 'easeOut' }}
          >
            {/* Spotlight primario — glow cian detrás del modelo */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(500px 380px at 50% 44%, rgba(0,229,255,0.09) 0%, rgba(0,229,255,0.02) 40%, transparent 70%)' }}
            />
            {/* Spotlight secundario — toque cálido arriba-derecha */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(300px 250px at 75% 25%, rgba(255,159,67,0.04) 0%, transparent 60%)' }}
            />
            {/* Sombra de plataforma bajo el modelo */}
            <div
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                top: '74%',
                width: '58%',
                height: 50,
                background: 'radial-gradient(ellipse at center, rgba(0,229,255,0.08) 0%, rgba(0,0,0,0.45) 30%, transparent 68%)',
                filter: 'blur(10px)',
              }}
            />
            <HoloShowcase />
            {/* Marco de inspección: esquinas con glow sutil */}
            <div className="absolute top-[8%] left-[4%] w-6 h-6 border-t border-l border-white/[0.12] pointer-events-none" style={{ boxShadow: 'inset 3px 3px 8px rgba(0,229,255,0.06)' }} />
            <div className="absolute top-[8%] right-[4%] w-6 h-6 border-t border-r border-white/[0.12] pointer-events-none" style={{ boxShadow: 'inset -3px 3px 8px rgba(0,229,255,0.06)' }} />
            <div className="absolute bottom-[8%] left-[4%] w-6 h-6 border-b border-l border-white/[0.12] pointer-events-none" style={{ boxShadow: 'inset 3px -3px 8px rgba(0,229,255,0.06)' }} />
            <div className="absolute bottom-[8%] right-[4%] w-6 h-6 border-b border-r border-white/[0.12] pointer-events-none" style={{ boxShadow: 'inset -3px -3px 8px rgba(0,229,255,0.06)' }} />
          </motion.div>

        </div>
      </div>


      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
      >
        <motion.div
          className="w-5 h-8 border border-white/20 rounded-full flex justify-center"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div
            className="w-0.5 h-2 bg-neon-cyan rounded-full mt-1.5"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>

    </section>
  )
}

export default Hero
