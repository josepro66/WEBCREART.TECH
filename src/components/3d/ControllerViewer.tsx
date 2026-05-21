import React, { useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Center, Html, useProgress, Environment, PresentationControls, useGLTF, Float, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

type Props = { className?: string }

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center style={{ color: 'white', fontSize: 12 }}>{Math.round(progress)}%</Html>
  )
}

function prepareModel(scene: THREE.Object3D, targetSize = 1.9, ringColor = 0x1c1c1c) {
  scene.traverse((child) => {
    const obj = child as THREE.Mesh
    if (obj.isMesh) {
      obj.material = (obj.material as THREE.Material).clone()
      const name = (obj.name || '').toLowerCase()
      const isAro = name.includes('aro')
      const isFaderRing = name.includes('fader') && (name.includes('ring') || name.includes('circle'))
      if (isAro || isFaderRing) {
        const mat = obj.material as THREE.MeshStandardMaterial
        if (mat && mat.color) mat.color.setHex(ringColor)
      }
      obj.geometry.computeVertexNormals()
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })

  const box = new THREE.Box3().setFromObject(scene)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  scene.position.sub(center)
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const scale = targetSize / maxDim
  scene.scale.setScalar(scale)
}

function Beato16Primitive() {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/beato16.glb`)
  useLayoutEffect(() => {
    prepareModel(gltf.scene)
    // Rotar el modelo 30 grados en el eje Y
    gltf.scene.rotation.y = Math.PI / 6; // 30 grados en radianes
  }, [gltf.scene])
  return (
    <Center>
      <primitive object={gltf.scene} />
    </Center>
  )
}
useGLTF.preload(`${import.meta.env.BASE_URL}models/BEATO16.glb`)

export default function ControllerViewer({ className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<THREE.Group>(null)
  const [isInteracting, setIsInteracting] = useState(false)

  function AutoRotate() {
    useFrame((_, delta) => {
      if (!groupRef.current || isInteracting) return
      groupRef.current.rotation.y += delta * 0.25
    })
    return null
  }


  return (
    <div ref={containerRef} className={className ?? 'h-96 w-full'}>
      <Canvas
        camera={{ position: [0, 0.8, 3.2], fov: 50 }}
        shadows
        onCreated={(state) => {
          state.gl.toneMapping = THREE.ACESFilmicToneMapping
          state.gl.outputColorSpace = THREE.SRGBColorSpace
          state.gl.shadowMap.enabled = true
          state.gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
      >
        {/* Iluminación profesional estilo estudio */}
        <ambientLight intensity={0.7} />
        {/* Key light */}
        <directionalLight position={[5, 4, -1]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        {/* Relleno frío */}
        <directionalLight position={[-8, 3, -9]} intensity={0.9} color={0x99ccff} />
        <directionalLight position={[-8, 3, 15]} intensity={0.9} color={0x99ccff} />
        {/* Rim/back light */}
        <directionalLight position={[-5, 6, 0]} intensity={1.1} />
        {/* Punto suave para brillos especulares */}
        <pointLight position={[0, 5, 5]} intensity={0.7} distance={10} />
        <React.Suspense fallback={<Loader />}>
          <group ref={groupRef}>
            <PresentationControls
              global
              polar={[-0.3, 0.6]}
              azimuth={[-0.7, 0.7]}
              snap
              onPointerDown={() => setIsInteracting(true)}
              onPointerUp={() => setIsInteracting(false)}
              onPointerOut={() => setIsInteracting(false)}
            >
              <Float speed={0.6} rotationIntensity={0.2} floatIntensity={0.3}>
                <Beato16Primitive />
              </Float>
            </PresentationControls>
            <AutoRotate />
          </group>
          <ContactShadows position={[0, -0.8, 0]} opacity={0.45} scale={10} blur={2.4} far={2} />
          <Environment files={`${import.meta.env.BASE_URL}textures/studio_small_03_1k.hdr`} />
        </React.Suspense>
      </Canvas>
    </div>
  )
}



