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

function prepareModel(scene: THREE.Object3D, targetSize = 2.5) {
  scene.traverse((child) => {
    const obj = child as THREE.Mesh
    if (obj.isMesh) {
      obj.material = (obj.material as THREE.Material).clone()
      const name = (obj.name || '').toLowerCase()
      
      // Aplicar materiales específicos del BEATO8 basados en el configurador
      if (name.includes('cubechasis')) {
        obj.material = new THREE.MeshPhysicalMaterial({ 
          color: 0x808080, // Gris por defecto
          metalness: 0.8,
          roughness: 0.35,
          clearcoat: 0.85,
          clearcoatRoughness: 0.1
        })
      } else if (name.includes('boton')) {
        obj.material = new THREE.MeshPhysicalMaterial({ 
          color: 0x1C1C1C, // Negro por defecto
          metalness: 0.4,
          roughness: 0.68,
          clearcoat: 0.85,
          clearcoatRoughness: 0.08,
          reflectivity: 0.3,
          sheen: 0.5,
          sheenColor: 0x1C1C1C
        })
      } else if (name.includes('knob')) {
        const mat = obj.material as THREE.MeshStandardMaterial
        if (mat && mat.color) {
          const lightness = (mat.color.r + mat.color.g + mat.color.b) / 3
          if (lightness < 0.5) {
            obj.material = new THREE.MeshStandardMaterial({ 
              color: 0x1C1C1C, // Negro por defecto
              metalness: 0, 
              roughness: 1 
            })
          } else {
            obj.material = new THREE.MeshStandardMaterial({ color: 0xffffff })
          }
        }
      } else if (name.includes('aro')) {
        obj.material = new THREE.MeshPhysicalMaterial({ 
          color: 0x000000, 
          metalness: 0.0, 
          roughness: 0.2, 
          clearcoat: 0.8, 
          clearcoatRoughness: 0.1, 
          reflectivity: 0.5, 
          transmission: 0.3, 
          thickness: 0.5, 
          ior: 1.4, 
          attenuationDistance: 1.0, 
          attenuationColor: 0xffffff, 
          transparent: true, 
          opacity: 0.7 
        })
      }
      
      obj.geometry.computeVertexNormals()
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })

  // Centrar y escalar el modelo como en el configurador
  const box = new THREE.Box3().setFromObject(scene)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  scene.position.sub(center)
  scene.position.y -= (size.y / 2) * (targetSize / Math.max(size.x, size.y, size.z))
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const scale = targetSize / maxDim
  scene.scale.setScalar(scale)
}

function Beato8Primitive() {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/BEATO.glb`)
  useLayoutEffect(() => {
    prepareModel(gltf.scene)
  }, [gltf.scene])
  return (
    <Center>
      <primitive object={gltf.scene} />
    </Center>
  )
}
useGLTF.preload(`${import.meta.env.BASE_URL}models/BEATO.glb`)

export default function Beato8Viewer({ className }: Props) {
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
        camera={{ position: [2, 1, -0.1], fov: 45 }}
        shadows
        onCreated={(state) => {
          state.gl.toneMapping = THREE.ACESFilmicToneMapping
          state.gl.outputColorSpace = THREE.SRGBColorSpace
          state.gl.shadowMap.enabled = true
          state.gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
      >
        {/* Iluminación profesional basada en el configurador BEATO8 */}
        <ambientLight intensity={0.9} />
        
        {/* Luz direccional principal (tipo sol) */}
        <directionalLight 
          position={[5, 4, -1]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize-width={4096} 
          shadow-mapSize-height={4096}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
          shadow-normalBias={0.02}
        />
        
        {/* Luz de relleno fría */}
        <directionalLight position={[-8, 3, -9]} intensity={1.0} color={0x99ccff} />
        
        {/* Luz de relleno adicional */}
        <directionalLight position={[-8, 3, 15]} intensity={1.0} color={0x99ccff} />
        
        {/* Luz puntual para brillos */}
        <pointLight position={[0, 5, 5]} intensity={0.7} distance={10} />
        
        {/* LUZ EXTRA DETRÁS DEL CONTROLADOR - BEATO CONFIGURATOR */}
        <directionalLight 
          position={[-5, 30, 0]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize-width={2048} 
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
          shadow-normalBias={0.02}
        />
        
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
                <Beato8Primitive />
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
