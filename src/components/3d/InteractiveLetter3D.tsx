import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Float } from '@react-three/drei'
import * as THREE from 'three'

interface InteractiveLetter3DProps {
  letter?: string
  className?: string
  size?: number
  color?: string
  hoverColor?: string
}

// Función para crear geometría de la letra B
function createBGeometry() {
  const shape = new THREE.Shape()
  
  // Crear la forma de la letra B
  shape.moveTo(-1, 2)
  shape.lineTo(-1, -2)
  shape.lineTo(0.5, -2)
  shape.quadraticCurveTo(1.5, -2, 1.5, -1)
  shape.quadraticCurveTo(1.5, -0.5, 1, -0.5)
  shape.lineTo(0.5, -0.5)
  shape.lineTo(0.5, 0.5)
  shape.lineTo(1, 0.5)
  shape.quadraticCurveTo(1.5, 0.5, 1.5, 1)
  shape.quadraticCurveTo(1.5, 2, 0.5, 2)
  shape.lineTo(-1, 2)
  
  // Agujero en el medio
  const hole = new THREE.Path()
  hole.moveTo(-0.5, 1.2)
  hole.lineTo(0.2, 1.2)
  hole.quadraticCurveTo(0.7, 1.2, 0.7, 0.7)
  hole.quadraticCurveTo(0.7, 0.2, 0.2, 0.2)
  hole.lineTo(-0.5, 0.2)
  hole.lineTo(-0.5, 1.2)
  
  shape.holes.push(hole)
  
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelOffset: 0,
    bevelSegments: 3
  })
  
  return geometry
}

function Letter3D({ 
  letter = 'B', 
  size = 2, 
  color = '#00F5FF', 
  hoverColor = '#FF47E2' 
}: { 
  letter: string
  size: number
  color: string
  hoverColor: string
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  
  useFrame((state) => {
    if (meshRef.current) {
      // Rotación suave automática
      meshRef.current.rotation.y += 0.01
      
      // Efecto de hover - escalado
      const targetScale = hovered ? 1.1 : 1
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
      
      // Efecto de click - rebote
      if (clicked) {
        meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 10) * 0.1
        meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 8) * 0.05
      }
    }
  })

  // Crear geometría basada en la letra
  const geometry = letter === 'B' ? createBGeometry() : new THREE.BoxGeometry(1, 2, 0.3)

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.2}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => setClicked(!clicked)}
        scale={[size, size, size]}
      >
        <meshStandardMaterial 
          color={hovered ? hoverColor : color}
          metalness={0.8}
          roughness={0.2}
          emissive={hovered ? hoverColor : '#000000'}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>
    </Float>
  )
}

function Scene() {
  const { camera } = useThree()
  
  return (
    <>
      {/* Iluminación */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -10]} color="#FF47E2" intensity={0.5} />
      <pointLight position={[10, 10, 10]} color="#00F5FF" intensity={0.5} />
      
      {/* Letra 3D */}
      <Letter3D 
        letter="B" 
        size={2} 
        color="#00F5FF" 
        hoverColor="#FF47E2" 
      />
      
      {/* Controles de órbita */}
      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        autoRotate={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 2}
      />
      
      {/* Ambiente */}
      <Environment files={`${import.meta.env.BASE_URL}textures/studio_small_03_1k.hdr`} />
    </>
  )
}

export default function InteractiveLetter3D({ 
  letter = 'B', 
  className = 'h-96 w-full',
  size = 2,
  color = '#00F5FF',
  hoverColor = '#FF47E2'
}: InteractiveLetter3DProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        shadows
        onCreated={(state) => {
          state.gl.toneMapping = THREE.ACESFilmicToneMapping
          state.gl.outputColorSpace = THREE.SRGBColorSpace
        }}
      >
        <Scene />
      </Canvas>
      
      {/* Instrucciones */}
      <div className="absolute bottom-4 left-4 text-white/70 text-sm">
        <p>🖱️ Arrastra para rotar</p>
        <p>🖱️ Hover para efecto</p>
        <p>🖱️ Click para animación</p>
      </div>
    </div>
  )
}
