import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

type Props = {
  modelUrl: string
  className?: string
  autoRotateSpeed?: number
  preserveMaterials?: boolean
}

export default function ProductModelViewer({
  modelUrl,
  className,
  autoRotateSpeed = 0.4,
  preserveMaterials = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '300px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const initScene = useCallback(async () => {
    const mount = containerRef.current
    if (!mount) return

    // === Scene — idéntico al configurador ===
    const scene = new THREE.Scene()
    scene.background = null

    // === Renderer — idéntico al configurador ===
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // === Camera — misma perspectiva que el configurador ===
    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      200
    )
    camera.position.set(2, 1, -0.1)

    // === Controls ===
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0, 0)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = autoRotateSpeed
    controls.enableZoom = false
    controls.minDistance = 2
    controls.maxDistance = 5

    // Iluminación idéntica al MIDI editor (Beato16Scene)
    scene.add(new THREE.AmbientLight(0xffffff, 0.7))

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1)
    keyLight.position.set(3, 5, 4)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 2048
    keyLight.shadow.mapSize.height = 2048
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x99ccff, 0.6)
    fillLight.position.set(-4, 2, -3)
    scene.add(fillLight)

    const rimLight = new THREE.PointLight(0x00e5ff, 0.6, 8)
    rimLight.position.set(0, 1.5, -2)
    scene.add(rimLight)

    // === Cargar modelo con MeshoptDecoder ===
    const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js')
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)

    loader.load(modelUrl, (gltf) => {
      const model = gltf.scene

      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        child.castShadow = true
        child.receiveShadow = true

        if (!preserveMaterials) {
          const meshName = (child.name || '').toLowerCase()
          const parentName = child.parent ? (child.parent.name || '').toLowerCase() : ''

          if (
            meshName.includes('logo') ||
            meshName.includes('beato') ||
            meshName.includes('crearttech') ||
            meshName.includes('custom midi')
          ) {
            if (child.material && 'map' in child.material && child.material.map) {
              ;(child.material as THREE.Material).transparent = true
              ;(child.material as THREE.Material).alphaTest = 0.9
            }
            return
          }

          if (meshName.includes('pantallawavo')) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0x000000,
              roughness: 0.1,
              metalness: 0.9,
              emissive: new THREE.Color(0x00ffff),
              emissiveIntensity: 0.2,
            })
            return
          }

          if (meshName.includes('bolt')) {
            child.material = new THREE.MeshStandardMaterial({
              color: '#777777',
              metalness: 0.9,
              roughness: 0.15,
            })
            return
          }

          if (meshName.includes('cubechasis')) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: '#cc0000',
              metalness: 0.3,
              roughness: 0.45,
              clearcoat: 0.5,
              clearcoatRoughness: 0.25,
              envMapIntensity: 0.8,
            })
          }
          else if (meshName.includes('chasis')) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: '#7CBA40',
              metalness: 0.8,
              roughness: 0.48,
              clearcoat: 0.3,
              clearcoatRoughness: 0.2,
              envMapIntensity: 0.6,
            })
          }
          else if (meshName.includes('boton')) {
            const num = parseInt(meshName.replace(/\D/g, '') || '0')
            const isPink = num <= 4
            child.material = new THREE.MeshPhysicalMaterial({
              color: isPink ? '#B8005C' : '#17181c',
              metalness: 0.0,
              roughness: isPink ? 0.5 : 0.32,
              clearcoat: 1.0,
              clearcoatRoughness: 0.06,
              envMapIntensity: isPink ? 0.4 : 0.85,
            })
          }
          else if (meshName.includes('tecla')) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: '#F5F5F5',
              metalness: 0.05,
              roughness: 0.45,
              envMapIntensity: 0.4,
            })
          }
          else if (
            meshName.startsWith('knob') ||
            meshName.includes('encoder') ||
            meshName.includes('dial') ||
            meshName.includes('pot') ||
            parentName.includes('encoder') ||
            parentName.includes('knob')
          ) {
            child.material = new THREE.MeshStandardMaterial({
              color: '#1C1C1C',
              metalness: 0.3,
              roughness: 0.7,
              envMapIntensity: 0.5,
            } as THREE.MeshStandardMaterialParameters & { envMapIntensity: number })
          }
          else if (meshName.includes('fader')) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: '#FF2D95',
              metalness: 0.0,
              roughness: 0.35,
              clearcoat: 0.9,
              clearcoatRoughness: 0.08,
              envMapIntensity: 1.0,
            })
          }
        }
      })

      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const maxSize = Math.max(size.x, size.y, size.z)
      const desiredSize = 1.8
      const scale = desiredSize / maxSize
      model.scale.set(scale, scale, scale)
      model.position.copy(center).multiplyScalar(-scale)

      if (!preserveMaterials) {
        const textureLoader = new THREE.TextureLoader()
        textureLoader.load(
          `${import.meta.env.BASE_URL}textures/pantallawavo.png`,
          (texture) => {
            texture.flipY = false
            texture.colorSpace = THREE.SRGBColorSpace
            model.traverse((child) => {
              if (
                child instanceof THREE.Mesh &&
                (child.name || '').toLowerCase().includes('pantallawavo')
              ) {
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
          }
        )
      }

      scene.add(model)
    })

    // === Resize ===
    const handleResize = () => {
      if (!mount) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // === Render loop ===
    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      controls.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh
          mesh.geometry.dispose()
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose())
          } else {
            mesh.material.dispose()
          }
        }
      })
    }
  }, [modelUrl, autoRotateSpeed, preserveMaterials])

  useEffect(() => {
    if (!visible) return
    let cleanup: (() => void) | undefined
    initScene().then((fn) => { cleanup = fn })
    return () => { cleanup?.() }
  }, [visible, initScene])

  return (
    <div
      ref={containerRef}
      className={className ?? 'h-64 w-full'}
      style={{ cursor: 'grab' }}
    />
  )
}
