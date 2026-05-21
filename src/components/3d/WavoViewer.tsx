import React, { useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Center, Html, useProgress, Environment, PresentationControls, useGLTF, Float, ContactShadows, useTexture } from '@react-three/drei'
import * as THREE from 'three'

type Props = { className?: string, transparent?: boolean }

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center style={{ color: 'white', fontSize: 12 }}>{Math.round(progress)}%</Html>
  )
}

function prepareModel(scene: THREE.Object3D, screenTexture: THREE.Texture, targetSize = 1.9) {
  scene.traverse((child) => {
    const obj = child as THREE.Mesh
    if (obj.isMesh) {
      obj.material = (obj.material as THREE.Material).clone()
      obj.geometry.computeVertexNormals()
      obj.castShadow = true
      obj.receiveShadow = true
      
      const meshName = (obj.name || '').toLowerCase()
      if (meshName.includes('pantallawavo')) {
        screenTexture.flipY = false;
        screenTexture.colorSpace = THREE.SRGBColorSpace;
        obj.material = new THREE.MeshPhysicalMaterial({
          map: screenTexture,
          emissiveMap: screenTexture,
          color: 0xffffff,
          roughness: 0.1,
          metalness: 0.9,
          emissive: 0xffffff,
          emissiveIntensity: 0.8
        })
      }
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

function WavoPrimitive() {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/wavo.glb`)
  const screenTexture = useTexture(`${import.meta.env.BASE_URL}textures/pantallawavo.png`)
  
  useLayoutEffect(() => {
    prepareModel(gltf.scene, screenTexture)
    gltf.scene.rotation.y = Math.PI / 6; // 30 grados en radianes
  }, [gltf.scene, screenTexture])
  return (
    <Center>
      <primitive object={gltf.scene} />
    </Center>
  )
}
useGLTF.preload(`${import.meta.env.BASE_URL}models/wavo.glb`)

export default function WavoViewer({ className }: Props) {
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
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 4, -1]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <directionalLight position={[-8, 3, -9]} intensity={0.9} color={0x99ccff} />
        <directionalLight position={[-8, 3, 15]} intensity={0.9} color={0x99ccff} />
        <directionalLight position={[-5, 6, 0]} intensity={1.1} />
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
                <WavoPrimitive />
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
