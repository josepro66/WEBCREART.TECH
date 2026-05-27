import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import Swal from 'sweetalert2';

// Tipos para los objetos seleccionables
interface Selectable {
  chasis: THREE.Mesh[];
  knobs: THREE.Mesh[];
  buttons: THREE.Mesh[];
  keys: THREE.Mesh[];
}

interface ChosenColors {
  type: string;
  chasis: string;
  knobs: Record<string, string>;
  buttons: Record<string, string>;
  keys: Record<string, string>;
}

interface PaletteColor {
  hex: string;
}

interface Palettes {
  chasis: Record<string, PaletteColor>;
  knobs: Record<string, PaletteColor>;
  buttons: Record<string, PaletteColor>;
  keys: Record<string, PaletteColor>;
}

interface WavoConfiguratorProps {
  currentUser: { name: string; email: string };
  onLogout: () => void;
}

const WavoConfigurator: React.FC<WavoConfiguratorProps> = ({ currentUser, onLogout }) => {
  // Referencias para Three.js
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const modelOriginalPositionRef = useRef<THREE.Vector3 | null>(null);

  // Estados de React
  const [currentView, setCurrentView] = useState<'normal' | 'chasis' | 'knobs' | 'buttons' | 'keys'>('normal');
  const [selectedForColoring, setSelectedForColoring] = useState<THREE.Mesh | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const lastModalShotRef = useRef<string | null>(null);

  // Multi-selección de elementos
  const [selectedKnobs, setSelectedKnobs] = useState<THREE.Mesh[]>([]);
  const [selectedButtons, setSelectedButtons] = useState<THREE.Mesh[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<THREE.Mesh[]>([]);

  // Detección de responsive y orientación
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkOrientation();
    checkMobile();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // Inicialización de colores elegidos (con persistencia en localStorage)
  const [chosenColors, setChosenColors] = useState<ChosenColors>(() => {
    const saved = localStorage.getItem('wavo_chosenColors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved colors:', e);
      }
    }
    return {
      type: 'configUpdate',
      chasis: 'Verde',
      knobs: {},
      buttons: {},
      keys: {}
    };
  });

  const [selectable, setSelectable] = useState<Selectable>({
    chasis: [],
    knobs: [],
    buttons: [],
    keys: []
  });

  // Ref de las mallas seleccionables — siempre actualizado, sin stale closures
  const selectableRef = useRef<Selectable>({ chasis: [], knobs: [], buttons: [], keys: [] });

  // Helper para iluminar mallas seleccionadas
  const setEmissive = useCallback((object: THREE.Mesh | null, color: number = 0x000000) => {
    if (object && (object.material as THREE.MeshStandardMaterial)?.emissive) {
      (object.material as THREE.MeshStandardMaterial).emissive.setHex(color);
    }
  }, []);

  // Paleta de colores estándar
  const PALETTES: Palettes = {
    chasis: {
      'Verde':     { hex: '#7CBA40' },
      'Amarillo':  { hex: '#F3E600' },
      'Azul':      { hex: '#325EB7' },
      'Blanco':    { hex: '#F5F5F5' },
      'Naranja':   { hex: '#F47119' },
      'Morado':    { hex: '#7B217E' },
      'Rojo':      { hex: '#E52421' },
      'Negro':     { hex: '#1C1C1C' },
      'Rosa':      { hex: '#FF007F' },
      'Gris':      { hex: '#808080' },
    },
    knobs: {
      'Verde':     { hex: '#7CBA40' },
      'Amarillo':  { hex: '#F3E600' },
      'Azul':      { hex: '#325EB7' },
      'Blanco':    { hex: '#F5F5F5' },
      'Naranja':   { hex: '#F47119' },
      'Morado':    { hex: '#7B217E' },
      'Rojo':      { hex: '#E52421' },
      'Negro':     { hex: '#1C1C1C' },
      'Rosa':      { hex: '#FF007F' },
      'Gris':      { hex: '#808080' },
    },
    buttons: {
      'Verde':     { hex: '#7CBA40' },
      'Amarillo':  { hex: '#F3E600' },
      'Azul':      { hex: '#325EB7' },
      'Blanco':    { hex: '#F5F5F5' },
      'Naranja':   { hex: '#F47119' },
      'Morado':    { hex: '#7B217E' },
      'Rojo':      { hex: '#E52421' },
      'Negro':     { hex: '#1C1C1C' },
      'Rosa':      { hex: '#FF007F' },
      'Gris':      { hex: '#808080' },
    },
    keys: {
      'Verde':     { hex: '#7CBA40' },
      'Amarillo':  { hex: '#F3E600' },
      'Azul':      { hex: '#325EB7' },
      'Blanco':    { hex: '#F5F5F5' },
      'Naranja':   { hex: '#F47119' },
      'Morado':    { hex: '#7B217E' },
      'Rojo':      { hex: '#E52421' },
      'Negro':     { hex: '#1C1C1C' },
      'Rosa':      { hex: '#FF007F' },
      'Gris':      { hex: '#808080' },
    }
  };

  const CAMERA_VIEWS = {
    normal: { pos: new THREE.Vector3(2, 1.2, 0), target: new THREE.Vector3(0, -0.2, 0) },
    top:    { pos: new THREE.Vector3(1, 1.7, -0.3), target: new THREE.Vector3(-0.2, -0.9, -0.3) },
  };

  // Configuración de iluminación profesional
  const setupProfessionalLighting = useCallback((scene: THREE.Scene) => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4);
    mainLight.position.set(5, 5, -2);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x99ccff, 0.9);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const accentLight = new THREE.PointLight(0xffffff, 0.6, 10);
    accentLight.position.set(0, 4, 3);
    scene.add(accentLight);
  }, []);

  // Centrar y escalar modelo
  const centerAndScaleModel = useCallback((obj: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    const desiredSize = 1.9;
    const scale = desiredSize / maxSize;
    
    obj.scale.set(scale, scale, scale);
    obj.position.copy(center).multiplyScalar(-scale);
    obj.position.y -= (size.y / 2) * scale;
  }, []);

  // Clasificar y preparar las partes del modelo Wavo
  const prepareModelParts = useCallback((model: THREE.Group) => {
    const newSelectable: Selectable = { chasis: [], knobs: [], buttons: [], keys: [] };

    let initialChosen = { ...chosenColors };

    console.log('[Wavo] prepareModelParts - all nodes:');
    model.traverse((child: THREE.Object3D) => {
      console.log(`  [${child.type}] name="${child.name}"`);
    });

    model.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const meshName = typeof child.name === 'string' ? child.name.toLowerCase() : '';
      // Los encoders son THREE.Group cuyos hijos son Meshes — revisar también el padre
      const parentName = child.parent
        ? (typeof child.parent.name === 'string' ? child.parent.name.toLowerCase() : '')
        : '';

      // Configurar pantalla (placeholder hasta que cargue la textura)
      if (meshName.includes('pantallawavo')) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: 0x000000,
          roughness: 0.1,
          metalness: 0.9,
          emissive: 0x00ffff,
          emissiveIntensity: 0.25
        });
      }
      // Tornillos/pernos
      else if (meshName.includes('bolt')) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0x777777,
          metalness: 0.9,
          roughness: 0.15
        });
      }
      // Chasis de Wavo
      else if (meshName.includes('chasis')) {
        const colorName = initialChosen.chasis && PALETTES.chasis[initialChosen.chasis] ? initialChosen.chasis : 'Verde';
        child.material = new THREE.MeshPhysicalMaterial({ 
          color: PALETTES.chasis[colorName].hex, 
          metalness: 0.8,
          roughness: 0.35,
          clearcoat: 0.85,
          clearcoatRoughness: 0.1
        });
        newSelectable.chasis.push(child);
        initialChosen.chasis = colorName;
      }
      // Knobs / Dials / Encoders
      // IMPORTANTE: en este GLB los encoders son THREE.Group ("encoder1"…"encoder4")
      // cuyos hijos son Meshes con nombres "Cylinder118", "Cylinder118_1", etc.
      // Por eso se comprueba también el nombre del padre (parentName).
      else if (
        meshName.includes('encoder') ||
        meshName.includes('knob') ||
        meshName.includes('dial') ||
        meshName.includes('pot') ||
        parentName.includes('encoder') ||
        parentName.includes('knob') ||
        parentName.includes('dial') ||
        parentName.includes('pot')
      ) {
        const savedName = initialChosen.knobs[child.name];
        const defaultColor = savedName && PALETTES.knobs[savedName] ? savedName : 'Negro';
        child.material = new THREE.MeshStandardMaterial({
          color: PALETTES.knobs[defaultColor].hex,
          metalness: 0.3,
          roughness: 0.7
        });
        newSelectable.knobs.push(child);
        initialChosen.knobs[child.name] = defaultColor;
      }
      // Botones circulares pequeños
      else if (meshName.includes('boton')) {
        const savedName = initialChosen.buttons[child.name];
        const defaultColor = savedName && PALETTES.buttons[savedName] ? savedName : 'Blanco';
        child.material = new THREE.MeshPhysicalMaterial({ 
          color: PALETTES.buttons[defaultColor].hex, 
          metalness: 0.4,
          roughness: 0.68,
          clearcoat: 0.85,
          clearcoatRoughness: 0.08,
          reflectivity: 0.3,
          sheen: 0.5,
          sheenColor: 0x1C1C1C
        });
        newSelectable.buttons.push(child);
        initialChosen.buttons[child.name] = defaultColor;
      }
      // Teclas / Keybed
      else if (meshName.includes('tecla')) {
        const savedName = initialChosen.keys[child.name];
        const defaultColor = savedName && PALETTES.keys[savedName] ? savedName : 'Blanco';
        child.material = new THREE.MeshPhysicalMaterial({ 
          color: PALETTES.keys[defaultColor].hex, 
          metalness: 0.05,
          roughness: 0.45
        });
        newSelectable.keys.push(child);
        initialChosen.keys[child.name] = defaultColor;
      }
    });

    console.log('[Wavo] selectable.knobs found:', newSelectable.knobs.map(m => m.name));
    console.log('[Wavo] selectable.buttons found:', newSelectable.buttons.map(m => m.name));
    console.log('[Wavo] selectable.chasis found:', newSelectable.chasis.map(m => m.name));

    // Actualiza el ref primero (acceso síncrono, sin stale closures)
    selectableRef.current = newSelectable;
    setSelectable(newSelectable);
    setChosenColors(initialChosen);
  }, []);

  // Cargar modelo 3D
  // GLB se carga PRIMERO (independiente de la textura de pantalla)
  // La textura de pantalla se aplica aparte para no bloquear la carga del modelo
  const loadModel = useCallback(async () => {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();

      loader.load(
        `${import.meta.env.BASE_URL}models/wavo.glb`,
        (gltf: any) => {
          console.log('[Wavo] Modelo GLB cargado OK');
          const model = gltf.scene as THREE.Group;
          model.rotation.set(0, -0.30, 0);
          modelRef.current = model;

          // Prepara las partes sin textura de pantalla (se aplica abajo si carga)
          prepareModelParts(model);
          centerAndScaleModel(model);
          sceneRef.current?.add(model);
          if (!modelOriginalPositionRef.current) {
            modelOriginalPositionRef.current = model.position.clone();
          }

          // Intentar cargar la textura de pantalla de forma independiente
          const textureLoader = new THREE.TextureLoader();
          textureLoader.load(
            `${import.meta.env.BASE_URL}textures/pantallawavo.png`,
            (texture) => {
              texture.flipY = false;
              texture.colorSpace = THREE.SRGBColorSpace;
              // Aplicar solo al mesh de pantalla
              model.traverse((child: THREE.Object3D) => {
                if (
                  child instanceof THREE.Mesh &&
                  child.name.toLowerCase().includes('pantallawavo')
                ) {
                  child.material = new THREE.MeshPhysicalMaterial({
                    map: texture,
                    emissiveMap: texture,
                    color: 0xffffff,
                    roughness: 0.1,
                    metalness: 0.9,
                    emissive: 0xffffff,
                    emissiveIntensity: 0.8
                  });
                }
              });
            },
            undefined,
            () => {
              console.warn('[Wavo] Textura de pantalla no disponible — se omite');
            }
          );
        },
        undefined,
        (error: any) => {
          console.error('[Wavo] ERROR AL CARGAR EL MODELO:', error);
        }
      );
    } catch (error) {
      console.error('[Wavo] Error importando GLTFLoader:', error);
    }
  }, [prepareModelParts, centerAndScaleModel]);

  // Inicialización de Three.js
  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true, 
      preserveDrawingBuffer: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      38, 
      mountRef.current.clientWidth / mountRef.current.clientHeight, 
      0.1, 
      200
    );
    camera.position.copy(CAMERA_VIEWS.normal.pos);
    cameraRef.current = camera;

    import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(CAMERA_VIEWS.normal.target);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 2;
      controls.maxDistance = 5;
      controls.enablePan = false;
      controlsRef.current = controls;
    });

    setupProfessionalLighting(scene);
    loadModel();

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [setupProfessionalLighting, loadModel]);

  // Redimensionamiento
  useEffect(() => {
    const handleResize = () => {
      if (mountRef.current && cameraRef.current && rendererRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem('wavo_chosenColors', JSON.stringify(chosenColors));
  }, [chosenColors]);

  // Aplicar colores reactivamente
  useEffect(() => {
    if (
      selectable.chasis.length > 0 ||
      selectable.knobs.length > 0 ||
      selectable.buttons.length > 0 ||
      selectable.keys.length > 0
    ) {
      // Chasis
      if (chosenColors.chasis && PALETTES.chasis[chosenColors.chasis]) {
        const hex = PALETTES.chasis[chosenColors.chasis].hex;
        selectable.chasis.forEach(mesh => {
          if (mesh.material && 'color' in mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(hex.replace('#', ''), 16));
          }
        });
      }
      // Knobs
      Object.entries(chosenColors.knobs).forEach(([name, colorName]) => {
        if (PALETTES.knobs[colorName]) {
          const hex = PALETTES.knobs[colorName].hex;
          const mesh = selectable.knobs.find(k => k.name === name);
          if (mesh && mesh.material && 'color' in mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(hex.replace('#', ''), 16));
          }
        }
      });
      // Buttons
      Object.entries(chosenColors.buttons).forEach(([name, colorName]) => {
        if (PALETTES.buttons[colorName]) {
          const hex = PALETTES.buttons[colorName].hex;
          const mesh = selectable.buttons.find(b => b.name === name);
          if (mesh && mesh.material && 'color' in mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(hex.replace('#', ''), 16));
          }
        }
      });
      // Keys
      Object.entries(chosenColors.keys).forEach(([name, colorName]) => {
        if (PALETTES.keys[colorName]) {
          const hex = PALETTES.keys[colorName].hex;
          const mesh = selectable.keys.find(k => k.name === name);
          if (mesh && mesh.material && 'color' in mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(hex.replace('#', ''), 16));
          }
        }
      });
    }
  }, [selectable, chosenColors]);

  // Cambiar vista de cámara con GSAP
  const changeView = useCallback((view: 'normal' | 'chasis' | 'knobs' | 'buttons' | 'keys') => {
    setCurrentView(view);

    // Limpiar luces emisivas anteriores
    if (selectedForColoring) setEmissive(selectedForColoring, 0x000000);
    selectedKnobs.forEach(k => setEmissive(k, 0x000000));
    selectedButtons.forEach(b => setEmissive(b, 0x000000));
    selectedKeys.forEach(k => setEmissive(k, 0x000000));

    setSelectedKnobs([]);
    setSelectedButtons([]);
    setSelectedKeys([]);
    setSelectedForColoring(null);

    if (view === 'chasis' && selectableRef.current.chasis.length > 0) {
      setSelectedForColoring(selectableRef.current.chasis[0]);
      setEmissive(selectableRef.current.chasis[0], 0x111111);
    }

    if (!cameraRef.current || !controlsRef.current) return;

    const isNormal = view === 'normal';
    const targetView = isNormal ? CAMERA_VIEWS.normal : CAMERA_VIEWS.top;
    controlsRef.current.enabled = isNormal;

    gsap.to(cameraRef.current.position, { 
      duration: 1.2, 
      ease: 'power3.inOut', 
      ...targetView.pos 
    });
    gsap.to(controlsRef.current.target, { 
      duration: 1.2, 
      ease: 'power3.inOut', 
      ...targetView.target,
      onUpdate: () => controlsRef.current.update() 
    });

    // Resetear la rotación del modelo al abrir un menú para que quede siempre derecho
    if (modelRef.current) {
      gsap.to(modelRef.current.rotation, {
        duration: 1.8,
        ease: 'power3.inOut',
        x: 0,
        y: isNormal ? -0.30 + Math.PI / 6 : -0.30,
        z: 0,
      });
    }
  }, [selectedForColoring, selectedKnobs, selectedButtons, selectedKeys, setEmissive]);

  // Manejo de clicks en mallas interactivas en el canvas
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!cameraRef.current || !rendererRef.current || currentView === 'normal') return;

    if (currentView === 'chasis') {
      setSelectedForColoring(selectableRef.current.chasis[0]);
      return;
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const bounds = rendererRef.current.domElement.getBoundingClientRect();

    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

    raycaster.setFromCamera(pointer, cameraRef.current);

    // Leer siempre del ref — garantiza referencias frescas sin stale closures
    let candidates: THREE.Mesh[] = [];
    if (currentView === 'knobs') candidates = selectableRef.current.knobs;
    else if (currentView === 'buttons') candidates = selectableRef.current.buttons;
    else if (currentView === 'keys') candidates = selectableRef.current.keys;

    if (candidates.length === 0) return;
    const intersects = raycaster.intersectObjects(candidates, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;

      if (currentView === 'knobs') {
        setSelectedForColoring(null);
        setSelectedKnobs(prev => {
          const exists = prev.includes(hit);
          const next = exists ? prev.filter(k => k !== hit) : [...prev, hit];
          selectableRef.current.knobs.forEach(k => setEmissive(k, 0x000000));
          next.forEach(k => setEmissive(k, 0x333333));
          return next;
        });
      } else if (currentView === 'buttons') {
        setSelectedForColoring(null);
        setSelectedButtons(prev => {
          const exists = prev.includes(hit);
          const next = exists ? prev.filter(b => b !== hit) : [...prev, hit];
          selectableRef.current.buttons.forEach(b => setEmissive(b, 0x000000));
          next.forEach(b => setEmissive(b, 0x333333));
          return next;
        });
      } else if (currentView === 'keys') {
        setSelectedForColoring(null);
        setSelectedKeys(prev => {
          const exists = prev.includes(hit);
          const next = exists ? prev.filter(k => k !== hit) : [...prev, hit];
          selectableRef.current.keys.forEach(k => setEmissive(k, 0x000000));
          next.forEach(k => setEmissive(k, 0x333333));
          return next;
        });
      }
    } else {
      setSelectedForColoring(null);
      setSelectedKnobs([]);
      setSelectedButtons([]);
      setSelectedKeys([]);
      candidates.forEach(c => setEmissive(c, 0x000000));
    }
  }, [currentView, setEmissive]);

  // Aplicar color de la paleta seleccionada
  // Usa selectableRef para evitar stale closures — las mallas Three.js siempre frescas
  const applyColor = useCallback((name: string, colorData: PaletteColor) => {
    const hexVal = parseInt(colorData.hex.replace('#', ''), 16);
    const cur = selectableRef.current;

    console.log('[Wavo] applyColor:', name, colorData.hex,
      '| view:', currentView,
      '| ref.knobs:', cur.knobs.length,
      '| selectedKnobs:', selectedKnobs.length);

    if (currentView === 'chasis') {
      setChosenColors(prev => ({ ...prev, chasis: name }));
      cur.chasis.forEach(mesh => {
        (mesh.material as THREE.MeshStandardMaterial).color.setHex(hexVal);
      });
    }
    else if (currentView === 'knobs') {
      // Si hay selección individual usa esa; si no, aplica a TODOS los encoders
      const targets = selectedKnobs.length > 0 ? selectedKnobs : cur.knobs;
      console.log('[Wavo] knob targets:', targets.map(m => m.name));
      const nextKnobs: Record<string, string> = {};
      targets.forEach(mesh => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(hexVal);
        mat.needsUpdate = true;
        nextKnobs[mesh.name] = name;
      });
      setChosenColors(prev => ({ ...prev, knobs: { ...prev.knobs, ...nextKnobs } }));
      targets.forEach(k => setEmissive(k, 0x000000));
      setSelectedKnobs([]);
    }
    else if (currentView === 'buttons') {
      const targets = selectedButtons.length > 0 ? selectedButtons : cur.buttons;
      const nextButtons: Record<string, string> = {};
      targets.forEach(mesh => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(hexVal);
        mat.needsUpdate = true;
        nextButtons[mesh.name] = name;
      });
      setChosenColors(prev => ({ ...prev, buttons: { ...prev.buttons, ...nextButtons } }));
      targets.forEach(b => setEmissive(b, 0x000000));
      setSelectedButtons([]);
    }
    else if (currentView === 'keys') {
      const targets = selectedKeys.length > 0 ? selectedKeys : cur.keys;
      const nextKeys: Record<string, string> = {};
      targets.forEach(mesh => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(hexVal);
        mat.needsUpdate = true;
        nextKeys[mesh.name] = name;
      });
      setChosenColors(prev => ({ ...prev, keys: { ...prev.keys, ...nextKeys } }));
      targets.forEach(k => setEmissive(k, 0x000000));
      setSelectedKeys([]);
    }
  }, [currentView, selectedKnobs, selectedButtons, selectedKeys, setEmissive]);

  // Capturar captura de pantalla
  const getScreenshotDefaultView = useCallback(() => {
    if (!rendererRef.current || !cameraRef.current || !controlsRef.current || !sceneRef.current) return null;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const prevPos = camera.position.clone();
    const prevTarget = controls.target.clone();
    const prevEnabled = controls.enabled;

    camera.position.copy(CAMERA_VIEWS.normal.pos);
    controls.target.copy(CAMERA_VIEWS.normal.target);
    controls.enabled = false;
    controls.update();

    renderer.render(sceneRef.current, camera);
    let dataUrl: string | null = null;
    try { 
      dataUrl = renderer.domElement.toDataURL('image/png'); 
    } catch (e) { 
      console.error('Error capturing screenshot:', e); 
    }

    camera.position.copy(prevPos);
    controls.target.copy(prevTarget);
    controls.enabled = prevEnabled;
    controls.update();
    renderer.render(sceneRef.current, camera);

    return dataUrl;
  }, []);

  // Mostrar modal final con el resumen de la configuración de Wavo
  const handleFinalizeOpenModal = useCallback(async () => {
    const shot = getScreenshotDefaultView();
    if (shot) setScreenshot(shot);

    const knobsPairs = Object.entries(chosenColors.knobs || {});
    const buttonsPairs = Object.entries(chosenColors.buttons || {});
    const keysPairs = Object.entries(chosenColors.keys || {});

    const simplifyName = (name: string) => name.replace(/(cylinder|cube)\./gi, '').toUpperCase();

    const listHtml = (pairs: [string, string][], title: string) => {
      if (pairs.length === 0) return `<p style="margin:4px 0 0 0; font-size:13px; color:#9ca3af;"><strong>${title}:</strong> Por defecto</p>`;
      const items = pairs.map(([n, c]) => `<span style="display:inline-block; background:#1e293b; padding:2px 6px; border-radius:4px; margin:2px; font-size:11px;">${simplifyName(n)}: ${c}</span>`).join('');
      return `<p style="margin:4px 0 0 0; font-size:13px; color:#e5e7eb;"><strong>${title}:</strong> ${items}</p>`;
    };

    const html = `
      <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
        <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
          ${shot ? `<img src="${shot}" alt="Screenshot" style="width:260px; height:auto; border-radius:8px; border:1px solid #4b5563; box-shadow:0 0 8px rgba(0,255,255,0.2)"/>` : '<div style="width:260px;height:160px;display:flex;align-items:center;justify-content:center;border:1px solid #4b5563;border-radius:8px;">No screenshot</div>'}
          <div style="flex:1; min-width:240px;">
            <p style="margin:0 0 6px 0; font-size:15px;"><strong style="color:#00FFFF">Precio:</strong> 2.000.000 COP / $500 USD</p>
            <p style="margin:0 0 6px 0; font-size:14px;"><strong style="color:#FCD34D">Chasis:</strong> ${chosenColors.chasis}</p>
            ${listHtml(knobsPairs, 'Knobs')}
            ${listHtml(buttonsPairs, 'Botones')}
            ${listHtml(keysPairs, 'Teclas')}
          </div>
        </div>
      </div>`;

    const result = await Swal.fire({
      title: 'Resumen de Configuración WAVO',
      html,
      width: 780,
      background: '#0b1220',
      color: '#e5e7eb',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Enviar por correo',
      denyButtonText: 'Descargar imagen',
      cancelButtonText: 'Cerrar',
      focusConfirm: false,
      allowOutsideClick: false,
      preConfirm: async () => {
        try {
          const popup = (Swal as any).getPopup() as HTMLElement | null;
          if (!popup) return;
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(popup, { background: '#0b1220' });
          lastModalShotRef.current = canvas.toDataURL('image/png');
        } catch (e) {
          console.error('Error generating canvas image:', e);
        }
      },
      preDeny: async () => {
        try {
          const popup = (Swal as any).getPopup() as HTMLElement | null;
          if (!popup) return;
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(popup, { background: '#0b1220' });
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = 'configuracion-wavo.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (e) {
          console.error('Error downloading summary image:', e);
        }
      },
      customClass: {
        popup: 'swal2-border-radius',
        confirmButton: 'swal2-confirm-custom',
        denyButton: 'swal2-deny-custom',
        cancelButton: 'swal2-cancel-custom'
      }
    });

    if (result.isConfirmed) {
      if (lastModalShotRef.current) {
        const a = document.createElement('a');
        a.href = lastModalShotRef.current;
        a.download = 'configuracion-wavo.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      const emailDestino = 'info@crearttech.com';
      const asunto = 'Configuración Personalizada WAVO';
      const body = `Hola,

Esta es mi configuración para el sintetizador WAVO:

- Chasis: ${chosenColors.chasis}
- Knobs: ${Object.entries(chosenColors.knobs).map(([k,v])=>`${simplifyName(k)}: ${v}`).join(', ') || 'Por defecto'}
- Botones: ${Object.entries(chosenColors.buttons).map(([k,v])=>`${simplifyName(k)}: ${v}`).join(', ') || 'Por defecto'}
- Teclas: ${Object.entries(chosenColors.keys).map(([k,v])=>`${simplifyName(k)}: ${v}`).join(', ') || 'Por defecto'}

(Adjunto la imagen descargada del configurador)

Saludos cordiales.`;
      
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailDestino)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(body)}`;
      window.open(gmailUrl, '_blank');
    }
  }, [chosenColors, getScreenshotDefaultView]);

  // SVG de los botones de vista para mayor nitidez y no depender de imágenes rotas
  const getIconSvg = (id: string) => {
    if (id === 'normal') {
      return <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5M12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17M12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" />;
    } else if (id === 'chasis') {
      return <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M19 19H5V5H19V19Z" />;
    } else if (id === 'knobs') {
      return <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM13 7H11V12H13V7Z" />;
    } else if (id === 'buttons') {
      return <path d="M12 2C6.47 2 2 6.47 2 12C2 17.53 6.47 22 12 22C17.53 22 22 17.53 22 12C22 6.47 17.53 2 12 2ZM12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C15.31 6 18 8.69 18 12C18 15.31 15.31 18 12 18Z" />;
    } else if (id === 'keys') {
      return <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M11 15H5V5H11V15ZM19 15H13V5H19V15Z" />;
    }
    return null;
  };

  const menuIcons = [
    { id: 'normal', title: 'Vista Completa - Ver el sintetizador WAVO completo' },
    { id: 'chasis', title: 'Personalizar Chasis - Cambiar el color de la carcasa' },
    { id: 'knobs', title: 'Personalizar Knobs - Cambiar el color de los potenciómetros' },
    { id: 'buttons', title: 'Personalizar Botones - Cambiar el color de los pulsadores' },
    { id: 'keys', title: 'Personalizar Teclado - Cambiar el color de las teclas' }
  ];

  return (
    <div className="w-full h-screen text-gray-200 overflow-hidden relative" style={{ background: "transparent" }}>
      {/* Fondo degradado estático */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          backgroundImage: `url(${import.meta.env.BASE_URL}textures/fondo.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      />

      {/* Botón Home */}
      <div className="fixed top-4 z-50 flex items-center gap-3" style={{ left: '20px' }}>
        <button 
          onClick={() => window.location.href = 'https://www.crearttech.com/'}
          className="px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider text-white transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/50"
        >
          <span className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            <span>Home</span>
          </span>
        </button>
      </div>

      {/* Título */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 text-center">
        <h1 
          className="text-2xl font-bold m-0" 
          style={{ 
            fontFamily: 'Arial, sans-serif',
            color: '#fff',
            textShadow: '0 0 10px #00FFFF, 0 0 20px #0080FF',
            letterSpacing: '3px'
          }}
        >
          WAVO
        </h1>
      </div>

      {/* Canvas y Contenedor Principal */}
      <main className="flex w-full h-full" style={{ minHeight: "100vh", position: "relative" }}>
        <div className="flex-grow h-full" style={{ position: "relative", zIndex: 1 }}> 
          <div
            ref={mountRef}
            className="w-full h-full"
            onClick={handleCanvasClick}
          />
        </div>
      </main>

      {/* Panel de Controles Lateral */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: isMobile ? 0 : 20,
          width: currentView === 'normal' ? '100px' : '340px',
          height: '100vh',
          display: 'flex',
          zIndex: 10,
          transition: 'all 0.4s ease'
        }}
      >
        {/* Columna de selección de vistas */}
        <div style={{ width: '80px', flexShrink: 0, paddingTop: '100px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          {menuIcons.map(({ id, title }) => (
            <button
              key={id}
              onClick={() => changeView(id as any)}
              style={{
                width: '50px',
                height: '50px',
                border: '2px solid #00FFFF',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                background: currentView === id 
                  ? 'linear-gradient(to bottom right, #00FFFF, #0080FF)' 
                  : 'rgba(0,0,0,0.85)',
                boxShadow: currentView === id ? '0 0 10px #00FFFF' : 'none'
              }}
              title={title}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24"
                style={{
                  width: '26px',
                  height: '26px',
                  fill: currentView === id ? '#000' : '#FFF',
                  color: currentView === id ? '#000' : '#FFF',
                  margin: 'auto'
                }}
              >
                {getIconSvg(id)}
              </svg>
            </button>
          ))}
        </div>

        {/* Panel de paleta de colores */}
        {currentView !== 'normal' && (
          <div 
            style={{
              flex: 1,
              padding: '24px 16px',
              background: 'rgba(11, 18, 32, 0.85)',
              borderLeft: '1px solid rgba(0, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflowY: 'auto'
            }}
          >
            <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
              <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '15px', color: '#00FFFF' }}>
                {currentView}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#9ca3af' }}>
                {currentView === 'chasis'
                  ? 'Elige un color para aplicar al chasis.'
                  : 'Haz clic en una pieza del modelo para seleccionarla, o elige un color para aplicarlo a todas las piezas de esta sección.'}
              </p>
            </div>

            {/* Cuadrícula de colores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {Object.entries(PALETTES[currentView === 'chasis' ? 'chasis' : currentView === 'knobs' ? 'knobs' : currentView === 'buttons' ? 'buttons' : 'keys']).map(([name, colorData]) => (
                <div
                  key={name}
                  onClick={() => applyColor(name, colorData)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.border = '1px solid rgba(0,255,255,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)';
                  }}
                >
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: colorData.hex,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                    }}
                  />
                  <span style={{ fontSize: '11px', fontWeight: '500', color: '#e5e7eb' }}>{name}</span>
                </div>
              ))}
            </div>

            {/* Ayuda visual de selección */}
            {((currentView === 'knobs' && selectedKnobs.length > 0) ||
              (currentView === 'buttons' && selectedButtons.length > 0) ||
              (currentView === 'keys' && selectedKeys.length > 0)) && (
              <div style={{ marginTop: 'auto', padding: '12px', background: 'rgba(0, 255, 255, 0.1)', border: '1px solid rgba(0, 255, 255, 0.3)', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#00FFFF', fontWeight: 'bold' }}>
                  Piezas seleccionadas: {
                    currentView === 'knobs' ? selectedKnobs.length :
                    currentView === 'buttons' ? selectedButtons.length :
                    selectedKeys.length
                  }
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#e5e7eb' }}>
                  Haz clic en un color de arriba para aplicarlo a la selección.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botón Finalizar */}
      {currentView === 'normal' && (
        <button 
          onClick={handleFinalizeOpenModal}
          className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 text-lg font-bold uppercase tracking-wide text-black bg-cyan-400 border-none rounded cursor-pointer transition-all duration-200 shadow-lg hover:bg-yellow-200 hover:scale-105 hover:shadow-[0_0_15px_#00FFFF]"
        >
          Finalizar y Enviar Configuración
        </button>
      )}
    </div>
  );
};

export default WavoConfigurator;
