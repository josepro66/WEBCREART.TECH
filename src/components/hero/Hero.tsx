import React, { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial, useGLTF, Environment, Float } from '@react-three/drei'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'

// Componente de partículas animadas
function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null)
  
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(2000)
    for (let i = 0; i < 2000; i++) {
      positions[i] = (Math.random() - 0.5) * 20
    }
    return positions
  }, [])

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.05
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.075
    }
  })

  return (
    <Points ref={pointsRef} positions={particlesPosition} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#D0FF00"
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.8}
      />
    </Points>
  )
}

// Componente de plasma background
function PlasmaBackground() {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 0, -5]}>
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial
        color="#FF47E2"
        transparent
        opacity={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Componente del logo 3D
function Logo3D() {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/logo3d.glb`)

  return (
    <Float speed={1.5} rotationIntensity={0} floatIntensity={0.1}>
      <primitive object={gltf.scene} scale={[12, 12, 12]} position={[0, 0.5, 1.5]} rotation={[0, Math.PI, 0]} />
    </Float>
  )
}

// Preload del modelo
useGLTF.preload(`${import.meta.env.BASE_URL}models/logo3d.glb`)

const Hero: React.FC = () => {
  const navigate = useNavigate()

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* WebGL Background */}
      <div className="absolute inset-0 z-0 hero-3d-model">
        <Canvas camera={{ position: [0, 0, 5], fov: 95 }} style={{ touchAction: 'none' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
          <pointLight position={[-10, -10, -10]} color="#FF47E2" intensity={0.8} />
          <pointLight position={[10, 10, 10]} color="#00F5FF" intensity={0.8} />
          <pointLight position={[0, 10, 0]} color="#D0FF00" intensity={0.6} />
          <Environment files={`${import.meta.env.BASE_URL}textures/studio_small_03_1k.hdr`} />
          <PlasmaBackground />
          <ParticleField />
          <Suspense fallback={null}>
            <Logo3D />
          </Suspense>
        </Canvas>
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-holo z-10 pointer-events-none" />

      {/* Aurora effect */}
      <div className="absolute inset-0 aurora z-20 pointer-events-none" />

      {/* Content */}
      <div className="relative z-30 flex items-center justify-center h-full px-4 pointer-events-none">
        <div className="text-center max-w-4xl mx-auto">
          {/* Subtitle */}
          <motion.p
            className="text-3xl md:text-4xl lg:text-5xl text-gray-300 mb-4 font-bold mt-64"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          >
            CONTROLADORES MIDI PERSONALIZADOS
          </motion.p>

          {/* Sub-subtitle */}
          <motion.p
            className="text-lg md:text-xl text-gray-400 mb-8 font-inter"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
          >
            Tecnología musical hecha a medida
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-8 pointer-events-auto hero-buttons relative"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1, ease: "easeOut" }}
          >
            {/* Conexión entre botones */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 animate-pulse"></div>
            
            {/* Botón Ver Productos - Estilo tecnológico cian */}
            <motion.button
              className="relative px-8 py-4 bg-cyan-500 text-white font-bold rounded-lg text-lg font-orbitron overflow-hidden group tech-button-cyan"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {/* Efecto de partículas en el fondo */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-cyan-300/30 to-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Contorno de circuito */}
              <div className="absolute inset-0 border-2 border-cyan-400 rounded-lg">
                {/* Esquinas con líneas diagonales */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400 transform rotate-45"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400 transform -rotate-45"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400 transform -rotate-45"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400 transform rotate-45"></div>
              </div>
              
              {/* Texto */}
              <span className="relative z-10">VER PRODUCTOS</span>
              
              {/* Efecto de brillo */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </motion.button>
            
            {/* Botón Personaliza el tuyo - Estilo tecnológico gris con patrón hexagonal */}
            <motion.button
              className="relative px-8 py-4 bg-gray-800 text-white font-bold rounded-lg text-lg font-orbitron overflow-hidden group tech-button-gray"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/configurator')}
            >
              {/* Patrón hexagonal de fondo */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20l-10-10v20l10-10zm0 0l10-10v20l-10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: '20px 20px'
                }}></div>
              </div>
              
              {/* Efecto de partículas */}
              <div className="absolute inset-0 bg-gradient-to-r from-gray-600/20 via-gray-500/30 to-gray-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Contorno de circuito */}
              <div className="absolute inset-0 border-2 border-cyan-400 rounded-lg">
                {/* Esquinas con líneas diagonales */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400 transform rotate-45"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400 transform -rotate-45"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400 transform -rotate-45"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400 transform rotate-45"></div>
              </div>
              
              {/* Texto */}
              <span className="relative z-10">PERSONALIZA EL TUYO</span>
              
              {/* Efecto de brillo */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </motion.button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 2 }}
          >
            <motion.div
              className="w-6 h-10 border-2 border-neon-cyan rounded-full flex justify-center"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                className="w-1 h-3 bg-neon-cyan rounded-full mt-2"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Hero
