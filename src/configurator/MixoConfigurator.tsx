import React, { useEffect, useRef, useState, useCallback } from 'react';
import StarfieldBackground from './components/StarfieldBackground';
import PalettePanel, { paletteSubtitle } from './components/PalettePanel';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';

import Swal from 'sweetalert2';
import ReserveCtaBar from './components/ReserveCtaBar';
import ReservaModal from './components/ReservaModal';


// Tipos para los objetos seleccionables
interface Selectable {
  chasis: THREE.Mesh[];
  buttons: THREE.Mesh[];
  knobs: THREE.Mesh[];
  faders: THREE.Mesh[];
}

interface ChosenColors {
  type: string;
  chasis: string;
  buttons: Record<string, string>;
  knobs: Record<string, string>;
  faders: Record<string, string>;
}

interface PaletteColor {
  hex: string;
}

interface Palettes {
  chasis: Record<string, PaletteColor>;
  buttons: Record<string, PaletteColor>;
  knobs: Record<string, PaletteColor>;
  faders: Record<string, PaletteColor>;
}

const MixoConfigurator: React.FC<{ onProductChange?: (product: 'beato' | 'knobo' | 'mixo' | 'beato16' | 'loopo' | 'fado') => void }> = ({ onProductChange }) => {
  // Estado para la firma PayU y referencia
  const [payuSignature, setPayuSignature] = useState("");
  const [payuReference, setPayuReference] = useState("");

  // Referencias para Three.js
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const modelOriginalPositionRef = useRef<THREE.Vector3 | null>(null);

  // Estados de React
  const [currentView, setCurrentView] = useState<'normal' | 'chasis' | 'buttons' | 'knobs' | 'faders'>('normal');
  const [selectedForColoring, setSelectedForColoring] = useState<THREE.Mesh | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  
  // ==================================================================
  // DETECCIÓN DE ORIENTACIÓN
  // ==================================================================
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
  
  const [showReservaModal, setShowReservaModal] = useState(false);
  const [chosenColors, setChosenColors] = useState<ChosenColors>(() => {
    const saved = localStorage.getItem('mixo_chosenColors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved colors:', e);
      }
    }
    return {
      type: 'configUpdate',
      chasis: 'Gris',
      buttons: {},
      knobs: {},
      faders: {}
    };
  });
  const [selectable, setSelectable] = useState<Selectable>({ chasis: [], buttons: [], knobs: [], faders: [] });
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const lastModalShotRef = useRef<string | null>(null);

  // Ref para guardar el estado anterior de currentView
  const prevViewRef = useRef<'normal' | 'chasis' | 'buttons' | 'knobs' | 'faders'>(currentView);

  // Estado para selección múltiple de botones
  const [selectedButtons, setSelectedButtons] = useState<THREE.Mesh[]>([]);

  // Estado para selección múltiple de knobs
  const [selectedKnobs, setSelectedKnobs] = useState<THREE.Mesh[]>([]);

  // Estado para selección múltiple de faders
  const [selectedFaders, setSelectedFaders] = useState<THREE.Mesh[]>([]);

  // Estado para los tooltips de los botones
  const [showChasisTooltip, setShowChasisTooltip] = useState(false);
  const [showKnobsTooltip, setShowKnobsTooltip] = useState(false);
  const [showFadersTooltip, setShowFadersTooltip] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Configuración de paletas
  const PALETTES: Palettes = {
    chasis: { 'Verde': { hex: '#7CBA40' }, 'Amarillo': { hex: '#F3E600' }, 'Azul': { hex: '#325EB7' }, 'Blanco': { hex: '#F5F5F5' }, 'Naranja': { hex: '#F47119' }, 'Morado': { hex: '#7B217E' }, 'Rojo': { hex: '#E52421' }, 'Negro': { hex: '#1C1C1C' }, 'Rosa': { hex: '#FF007F' }, 'Gris': { hex: '#808080' }, },
    buttons: { 'Verde': { hex: '#7CBA40' }, 'Amarillo': { hex: '#F3E600' }, 'Azul': { hex: '#325EB7' }, 'Blanco': { hex: '#F5F5F5' }, 'Naranja': { hex: '#F47119' }, 'Morado': { hex: '#7B217E' }, 'Rojo': { hex: '#E52421' }, 'Negro': { hex: '#1C1C1C' }, 'Rosa': { hex: '#FF007F' }, 'Gris': { hex: '#808080' }, },
    knobs: { 'Verde': { hex: '#7CBA40' }, 'Amarillo': { hex: '#F3E600' }, 'Azul': { hex: '#325EB7' }, 'Blanco': { hex: '#F5F5F5' }, 'Naranja': { hex: '#F47119' }, 'Morado': { hex: '#7B217E' }, 'Rojo': { hex: '#E52421' }, 'Negro': { hex: '#1C1C1C' }, 'Rosa': { hex: '#FF007F' }, 'Gris': { hex: '#808080' }, },
    faders: { 'Verde': { hex: '#7CBA40' }, 'Amarillo': { hex: '#F3E600' }, 'Azul': { hex: '#325EB7' }, 'Blanco': { hex: '#F5F5F5' }, 'Naranja': { hex: '#F47119' }, 'Morado': { hex: '#7B217E' }, 'Rojo': { hex: '#E52421' }, 'Negro': { hex: '#1C1C1C' }, 'Rosa': { hex: '#FF007F' }, 'Gris': { hex: '#808080' }, }
  };

  // Configuración de vistas de cámara
  const CAMERA_VIEWS = {
    normal: { pos: new THREE.Vector3(3, 1.5, -0.1), target: new THREE.Vector3(0, -0.5, -0.1) },
    top:    { pos: new THREE.Vector3(1, 1.95, -0.4), target: new THREE.Vector3(-0.35, -1.4, -0.4) },
  };


  // Referencias para la posición inicial de la cámara
  const initialCameraPosRef = useRef<THREE.Vector3 | null>(null);
  const initialCameraTargetRef = useRef<THREE.Vector3 | null>(null);

  // Guardar configuraciones en localStorage
  useEffect(() => {
    localStorage.setItem('mixo_currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('mixo_chosenColors', JSON.stringify(chosenColors));
  }, [chosenColors]);

  // Capturar screenshot del canvas
  const getScreenshot = useCallback(() => {
    if (!rendererRef.current) return null;
    try {
      return rendererRef.current.domElement.toDataURL('image/png');
    } catch (e) {
      console.error('No se pudo capturar el screenshot:', e);
      return null;
    }
  }, []);

  // Modal de resumen (SweetAlert) con captura del modal completo
  // Screenshot siempre en vista por defecto
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
    try { dataUrl = renderer.domElement.toDataURL('image/png'); } catch (e) { console.error('No se pudo capturar screenshot (vista por defecto):', e); }

    camera.position.copy(prevPos);
    controls.target.copy(prevTarget);
    controls.enabled = prevEnabled;
    controls.update();
    renderer.render(sceneRef.current, camera);

    return dataUrl;
  }, []);

  const handleFinalizeOpenModal = useCallback(async () => {
    const shot = getScreenshotDefaultView();
    if (shot) setScreenshot(shot);

    const buttonsPairs = Object.entries(chosenColors.buttons || {}).filter(([name]) => !/aro/i.test(name));
    const knobsPairs = Object.entries(chosenColors.knobs || {});
    const fadersPairs = Object.entries(chosenColors.faders || {});

    // Helpers: translate and normalize
    const spanishToEnglish: Record<string, string> = {
      'Verde': 'Green','Amarillo': 'Yellow','Azul': 'Blue','Blanco': 'White','Naranja': 'Orange','Morado': 'Purple','Rojo': 'Red','Negro': 'Black','Rosa': 'Pink','Gris': 'Gray'
    };
    const toEnglish = (name: string) => spanishToEnglish[name] || name;
    const normalizeName = (name: string) => name
      .replace(/Boton/gi, 'Button')
      .replace(/fader/gi, 'Fader');
    const formatDisplayName = (name: string) => normalizeName(name).replace(/_\d+\b/i, '');

    const list = (pairs: [string, string][], empty: string) =>
      pairs.length
        ? pairs.map(([n, c]) => `<li style=\"margin:4px 0\"><strong>${formatDisplayName(n)}</strong>: ${toEnglish(c)}</li>`).join('')
        : `<li>${empty}</li>`;

    const html = `
      <div style=\"display:flex; flex-direction:column; gap:12px; text-align:left;\">
        <div style=\"display:flex; gap:16px; align-items:flex-start;\">
          ${shot ? `<img src=\"${shot}\" alt=\"Screenshot\" style=\"width:260px; height:auto; border-radius:8px; border:1px solid #4b5563\"/>` : '<div style=\"width:260px;height:160px;display:flex;align-items:center;justify-content:center;border:1px solid #4b5563;border-radius:8px;\">No screenshot</div>'}
          <div style=\"flex:1\">
            <p style=\"margin:0 0 6px 0\"><strong style=\"color:#FCD34D\">Chassis:</strong> ${toEnglish(chosenColors.chasis)}</p>
            <div style=\"display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:start;\"> 
              <div>
                <p style=\"margin:0 0 6px 0; color:#FCD34D;\"><strong>Buttons:</strong></p>
                <ul style=\"margin:0; padding-left:16px; columns:2; column-gap:16px;\">${list(buttonsPairs, 'Default')}</ul>
              </div>
              <div>
                <p style=\"margin:0 0 6px 0; color:#FCD34D;\"><strong>Knobs:</strong></p>
                <ul style=\"margin:0; padding-left:16px; columns:2; column-gap:16px;\">${list(knobsPairs, 'Default')}</ul>
                <p style=\"margin:12px 0 6px 0; color:#FCD34D;\"><strong>Faders:</strong></p>
                <ul style=\"margin:0; padding-left:16px; columns:2; column-gap:16px;\">${list(fadersPairs, 'Default')}</ul>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    const result = await Swal.fire({
      title: 'Configuration Summary',
      html,
      width: 860,
      background: '#0b1220',
      color: '#e5e7eb',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Send by email',
      denyButtonText: 'Download image',
      cancelButtonText: 'Close',
      focusConfirm: false,
      allowOutsideClick: false,
      preConfirm: async () => {
        try {
          const popup = (Swal as any).getPopup?.() as HTMLElement | null;
          if (!popup) return;
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(popup, { background: '#0b1220' });
          const dataUrl = canvas.toDataURL('image/png');
          lastModalShotRef.current = dataUrl;
        } catch (e) {
          console.error('No se pudo capturar el modal:', e);
        }
      },
      preDeny: async () => {
        try {
          const popup = (Swal as any).getPopup?.() as HTMLElement | null;
          if (!popup) return;
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(popup, { background: '#0b1220' });
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = 'resumen-configuracion-mixo.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (e) {
          console.error('No se pudo capturar el modal:', e);
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
      // Descargar la imagen capturada
      if (lastModalShotRef.current) {
        const a = document.createElement('a');
        a.href = lastModalShotRef.current;
        a.download = 'resumen-configuracion-mixo.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // Abrir Gmail Compose directamente
      const emailDestino = 'info@crearttech.com';
      const asunto = 'Mixo Configuration';
      const body = `Hello,

This is my configuration for the Mixo:

- Chassis: ${toEnglish(chosenColors.chasis)}
- Buttons: ${Object.entries(chosenColors.buttons).map(([k,v])=>`${formatDisplayName(k)}: ${toEnglish(v)}`).join(', ') || 'Default'}
- Knobs: ${Object.entries(chosenColors.knobs).map(([k,v])=>`${formatDisplayName(k)}: ${toEnglish(v)}`).join(', ') || 'Default'}
- Faders: ${Object.entries(chosenColors.faders).map(([k,v])=>`${formatDisplayName(k)}: ${toEnglish(v)}`).join(', ') || 'Default'}

(Attached is the image downloaded from the configurator)

Best regards.`;
      
      // Crear enlace directo de Gmail Compose
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailDestino)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(body)}`;
      window.open(gmailUrl, '_blank');
    }
  }, [chosenColors, getScreenshotDefaultView]);

  // 1. Cargar el environment map y aplicarlo a la escena y materiales
  const [envMap, setEnvMap] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(`${import.meta.env.BASE_URL}textures/blackhole.jpg.avif`, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      setEnvMap(texture);
    });
  }, []);

  // 2. Mejorar la iluminación
  const setupProfessionalLighting = useCallback((scene: THREE.Scene, renderer: THREE.WebGLRenderer) => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 4, -1);
    mainLight.castShadow = true;
    scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0x99ccff, 1.0);
    fillLight.position.set(-8, 3, -9);
    scene.add(fillLight);
    const fillLight2 = new THREE.DirectionalLight(0x99ccff, 1.0);
    fillLight2.position.set(-8, 3, 15);
    scene.add(fillLight2);
    const pointLight = new THREE.PointLight(0xffffff, 0.7, 0.5);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);
    const backLight = new THREE.DirectionalLight(0xffffff, 1.2);
    backLight.position.set(-5, 30, 0);
    backLight.castShadow = true;
    scene.add(backLight);
  }, []);

  // Función para centrar y escalar el modelo
  const centerAndScaleModel = useCallback((obj: THREE.Object3D) => {
    obj.updateWorldMatrix(true, true);
    const box = new THREE.Box3();
    obj.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry) {
        const mesh = child as THREE.Mesh;
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) {
          const meshBox = mesh.geometry.boundingBox.clone();
          meshBox.applyMatrix4(mesh.matrixWorld);
          box.union(meshBox);
        }
      }
    });
    if (box.isEmpty()) box.setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    const desiredSize = 1.8;
    const scale = desiredSize / maxSize;
    obj.scale.set(scale, scale, scale);
    obj.position.set(
      -center.x * scale,
      -center.y * scale - (size.y / 2) * scale,
      -center.z * scale
    );
  }, []);

  // 3. Al cargar el modelo, aplicar el envMap y MeshPhysicalMaterial
  const prepareModelParts = useCallback((model: THREE.Group) => {
    const newSelectable: Selectable = { chasis: [], buttons: [], knobs: [], faders: [] };
    let initialChosen: ChosenColors = { type: 'configUpdate', chasis: 'Gris', buttons: {}, knobs: {}, faders: {} };
    try {
      const saved = localStorage.getItem('mixo_chosenColors');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          initialChosen = {
            type: 'configUpdate',
            chasis: parsed.chasis || 'Gris',
            buttons: parsed.buttons || {},
            knobs: parsed.knobs || {},
            faders: parsed.faders || {}
          };
        }
      }
    } catch (e) {
      console.warn('Could not parse saved mixo_chosenColors', e);
    }

    model.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const meshName = typeof child.name === 'string' ? child.name.toLowerCase() : '';
      const parentName = child.parent ? (child.parent.name || '').toLowerCase() : '';

      if (meshName.includes('logo') || meshName.includes('mixo_mesa') || meshName.includes('knobo02') || meshName.includes('knobo-02') || meshName.includes('crearttech') || meshName.includes('custom midi')) {
        if (child.material && 'map' in child.material && child.material.map) {
          (child.material as THREE.Material).transparent = true;
          (child.material as any).alphaTest = 0.9;
        }
        return;
      }

      // Chassis: MIXO glb uses "Cube006" (parent Scene) for the body. Older beato-family glbs use "cubechasis".
      const isChasis = meshName.includes('cubechasis') ||
        (meshName === 'cube006' && parentName === 'scene');
      // Button dome/LED ring: children of boton1..4 groups (Cylinder006, Cylinder006_1, ...).
      const isBotonDome = parentName.startsWith('boton') && !meshName.endsWith('_1');
      const isBotonRing = parentName.startsWith('boton') && meshName.endsWith('_1');
      // Fader handle body: children of fader1..4 groups (Cube006_1/2, Cube014_1, ...).
      const isFaderBody = parentName.startsWith('fader');
      // Fader top caps: Cylinder001/002/029/tapa1 grouped under Cube008.
      const isFaderCap = parentName === 'cube008' && (meshName.startsWith('cylinder') || meshName.startsWith('tapa'));
      // Rotary knob colored disc: knob{N}_1 meshes (parent knob{N}001).
      const isKnobDisc = /^knob[1-4]_1$/.test(meshName);
      // Rotary knob black body: knob{N} meshes.
      const isKnobBody = /^knob[1-4]$/.test(meshName);
      // Legacy bolt: keep default metallic look.
      const isBolt = meshName.startsWith('bolt');

      if (isChasis) {
        const chasisName = initialChosen.chasis && PALETTES.chasis[initialChosen.chasis] ? initialChosen.chasis : 'Gris';
        child.material = new THREE.MeshPhysicalMaterial({
          color: PALETTES.chasis[chasisName].hex,
          metalness: 0.8,
          roughness: 0.35,
          clearcoat: 0.85,
          clearcoatRoughness: 0.1
        });
        newSelectable.chasis.push(child);
        initialChosen.chasis = chasisName;
      }
      else if (isBotonDome) {
        // Frosted plastic dome that transmits the LED color underneath.
        const savedName = initialChosen.buttons[child.name];
        const defaultColor = savedName && PALETTES.buttons[savedName] ? savedName : 'Amarillo';
        const ledColor = new THREE.Color(PALETTES.buttons[defaultColor].hex);
        child.material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0xffffff),
          metalness: 0.0,
          roughness: 0.18,
          clearcoat: 1.0,
          clearcoatRoughness: 0.04,
          transmission: 0.82,
          ior: 1.52,
          thickness: 0.28,
          attenuationColor: ledColor.clone(),
          attenuationDistance: 0.1,
          transparent: true,
          opacity: 1.0,
          emissive: ledColor.clone(),
          emissiveIntensity: 0.0,
        });
        newSelectable.buttons.push(child);
        initialChosen.buttons[child.name] = defaultColor;
      }
      else if (isBotonRing) {
        child.material = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.4, roughness: 0.6 });
      }
      else if (isFaderCap) {
        const savedName = initialChosen.faders[child.name];
        const defaultColor = savedName && PALETTES.faders[savedName] ? savedName : 'Negro';
        child.material = new THREE.MeshStandardMaterial({ color: PALETTES.faders[defaultColor].hex, metalness: 0.2, roughness: 0.7 });
        newSelectable.faders.push(child);
        initialChosen.faders[child.name] = defaultColor;
      }
      else if (isFaderBody) {
        // Black rectangular slider body — keep dark, non-configurable.
        child.material = new THREE.MeshStandardMaterial({ color: 0x1C1C1C, metalness: 0.3, roughness: 0.65 });
      }
      else if (isKnobDisc) {
        const savedName = initialChosen.knobs[child.name];
        const defaultColor = savedName && PALETTES.knobs[savedName] ? savedName : 'Negro';
        child.material = new THREE.MeshStandardMaterial({ color: PALETTES.knobs[defaultColor].hex, metalness: 0.2, roughness: 0.75 });
        newSelectable.knobs.push(child);
        initialChosen.knobs[child.name] = defaultColor;
      }
      else if (isKnobBody) {
        child.material = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.4, roughness: 0.6 });
      }
      else if (isBolt) {
        child.material = new THREE.MeshStandardMaterial({ color: 0x8f8f8f, metalness: 0.9, roughness: 0.2 });
      }
    });
    setSelectable(newSelectable);
    setChosenColors(initialChosen);
  }, [envMap]);

  // Función para restaurar el brillo LED original de un botón
  const restoreButtonLED = useCallback((button: THREE.Mesh) => {
    if (button.material instanceof THREE.MeshPhysicalMaterial) {
      const material = button.material;
      const colorName = chosenColors.buttons[button.name];
      if (colorName && PALETTES.buttons[colorName]) {
        const colorHex = PALETTES.buttons[colorName].hex;
        const ledColor = new THREE.Color(colorHex);
        material.emissive.copy(ledColor);
        material.attenuationColor.copy(ledColor);
      }
      material.emissiveIntensity = 0.0; // LED off when deselected
    }
  }, [chosenColors, PALETTES]);

  // Cargar modelo
  const loadModel = useCallback(async () => {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      
      loader.load(`${import.meta.env.BASE_URL}models/MIXO.glb`, (gltf: any) => {
        const model = gltf.scene as THREE.Group;
        // Remove junk objects that inflate the bounding box
        const junkNames = ['snowball', 'skeleton', 'empty001', 'empty002', 'buttonscrew', 'phillips_ultra_thin_flat_head_screw'];
        const toRemove: THREE.Object3D[] = [];
        model.traverse((child: THREE.Object3D) => {
          const n = child.name.toLowerCase();
          if (junkNames.some(j => n.includes(j))) toRemove.push(child);
        });
        toRemove.forEach(obj => obj.removeFromParent());

        if (modelRef.current && sceneRef.current) sceneRef.current.remove(modelRef.current);
        modelRef.current = model;
        prepareModelParts(model);
        centerAndScaleModel(model);
        sceneRef.current?.add(model);
        if (!modelOriginalPositionRef.current) {
          modelOriginalPositionRef.current = model.position.clone();
        }
        const negroHex = 0x1C1C1C;
        model.traverse((child: any) => {
          if (child.isMesh && (typeof child.name === 'string' && child.name.toLowerCase().includes('aro'))) {
            if (child.material && 'color' in child.material) {
              child.material.color.setHex(negroHex);
            }
          }
          if (child.isMesh && typeof child.name === 'string' && child.name.toLowerCase().includes('aro')) {
            child.material = child.material.clone();
          }
        });
      }, undefined, (error: any) => {
        console.error('ERROR AL CARGAR EL MODELO:', error);
      });
    } catch (error) {
      console.error('Error importing GLTFLoader:', error);
    }
  }, [prepareModelParts, centerAndScaleModel]);

  // Función para establecer emisivo (glow effect)
  const setEmissive = useCallback((object: THREE.Mesh | null, color: number = 0x000000) => {
    if (object && (object.material as THREE.MeshPhysicalMaterial)?.emissive) {
      const material = object.material as THREE.MeshPhysicalMaterial;
      const isBotonDome = (object.parent?.name || '').toLowerCase().startsWith('boton');

      if (isBotonDome && color === 0x000000) {
        restoreButtonLED(object);
        return;
      }
      if (isBotonDome) {
        // Frosted dome: keep stored LED color, just boost intensity when selected
        material.emissiveIntensity = 3.5;
        return;
      }
      material.emissive.setHex(color);
    }
  }, [restoreButtonLED]);

  // Función para manejar clics en el canvas
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!sceneRef.current || !cameraRef.current) return;

    if (currentView === 'chasis') {
      setSelectedForColoring(null);
      setSelectedButtons([]);
      setSelectedKnobs([]);
      setSelectedFaders([]);
      return;
    }

    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    
    let objectsToIntersect: THREE.Mesh[] = [];
    if (currentView === 'buttons') objectsToIntersect = selectable.buttons;
    else if (currentView === 'knobs') objectsToIntersect = selectable.knobs;
    else if (currentView === 'faders') objectsToIntersect = selectable.faders;
    else if (currentView === 'normal') objectsToIntersect = selectable.buttons;
    
    if (objectsToIntersect.length === 0) return;
    
    const intersects = raycaster.intersectObjects(objectsToIntersect, false);
    
    if (currentView === 'buttons') {
      selectable.buttons.forEach(btn => setEmissive(btn, 0x000000));
    }
    if (selectedForColoring && currentView !== 'normal') {
      setEmissive(selectedForColoring, 0x000000);
    }

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;

      if (currentView === 'normal') return;

      // objectsToIntersect was already filtered by currentView, so the hit is
      // guaranteed to be the right kind of part — no need to gate by mesh name.
      if (currentView === 'buttons') {
        setSelectedKnobs([]);
        setSelectedFaders([]);
        setSelectedForColoring(null);
        setSelectedButtons(prev => {
          const already = prev.includes(clickedMesh);
          const next = already ? prev.filter(b => b !== clickedMesh) : [...prev, clickedMesh];
          selectable.buttons.forEach(b => setEmissive(b, 0x000000));
          next.forEach(b => setEmissive(b, 0x444444));
          return next;
        });
      } else if (currentView === 'knobs') {
        setSelectedButtons([]);
        setSelectedFaders([]);
        setSelectedForColoring(null);
        setSelectedKnobs(prev => {
          const already = prev.includes(clickedMesh);
          const next = already ? prev.filter(k => k !== clickedMesh) : [...prev, clickedMesh];
          selectable.knobs.forEach(k => setEmissive(k, 0x000000));
          next.forEach(k => setEmissive(k, 0x444444));
          return next;
        });
      } else if (currentView === 'faders') {
        setSelectedButtons([]);
        setSelectedKnobs([]);
        setSelectedForColoring(null);
        setSelectedFaders(prev => {
          const already = prev.includes(clickedMesh);
          const next = already ? prev.filter(f => f !== clickedMesh) : [...prev, clickedMesh];
          selectable.faders.forEach(f => setEmissive(f, 0x000000));
          next.forEach(f => setEmissive(f, 0x444444));
          return next;
        });
      }
    }
  }, [currentView, selectable, selectedForColoring, setEmissive, selectedButtons, selectedKnobs, selectedFaders]);

  // Función para aplicar color
  const applyColor = useCallback((colorName: string, colorData: PaletteColor) => {
    if (currentView === 'chasis') {
      selectable.chasis.forEach(mesh => { (mesh.material as THREE.MeshStandardMaterial).color.set(colorData.hex); });
      setChosenColors(prev => ({ ...prev, chasis: colorName }));
      return;
    }

    if (currentView === 'buttons' && selectedButtons.length > 0) {
      const newChosenColors = { ...chosenColors, buttons: { ...chosenColors.buttons } };
      selectedButtons.forEach(btn => {
        const material = btn.material as THREE.MeshPhysicalMaterial;
        // Keep dome white/frosted — only update LED (emissive) color
        const newLedColor = new THREE.Color(colorData.hex);
        material.emissive.copy(newLedColor);
        material.attenuationColor.copy(newLedColor);
        material.emissiveIntensity = 0.0; // LED off after applying color
        newChosenColors.buttons[btn.name] = colorName;
      });
      setChosenColors(newChosenColors);
      setSelectedButtons([]);
      return;
    }

    if (currentView === 'knobs' && selectedKnobs.length > 0) {
      const newChosenColors = { ...chosenColors, knobs: { ...chosenColors.knobs } };
      selectedKnobs.forEach(knob => {
        (knob.material as THREE.MeshStandardMaterial).color.set(colorData.hex);
        newChosenColors.knobs[knob.name] = colorName;
      });
      setChosenColors(newChosenColors);
      setSelectedKnobs([]);
      return;
    }

    if (currentView === 'faders' && selectedFaders.length > 0) {
      const newChosenColors = { ...chosenColors, faders: { ...chosenColors.faders } };
      selectedFaders.forEach(fader => {
        fader.material = new THREE.MeshStandardMaterial({ color: colorData.hex, metalness: 0, roughness: 1 });
        newChosenColors.faders[fader.name] = colorName;
      });
      setChosenColors(newChosenColors);
      setSelectedFaders([]);
      return;
    }

    if (!selectedForColoring) {
      Swal.fire({ title: 'Selecciona una parte', text: 'Haz clic en una pieza del controlador para aplicar el color.', imageUrl: 'models/logo.png', imageWidth: 120, imageHeight: 120, background: '#232846', color: '#fff', confirmButtonColor: '#a259ff', confirmButtonText: 'Entendido' });
      return;
    }

    // selectedForColoring is only set when the chassis view is active (see changeView).
    if (selectedForColoring.material instanceof THREE.MeshStandardMaterial ||
        selectedForColoring.material instanceof THREE.MeshPhysicalMaterial) {
      selectedForColoring.material.color = new THREE.Color(colorData.hex);
    }
    setChosenColors(prev => ({ ...prev, chasis: colorName }));
  }, [selectedForColoring, selectedButtons, selectedKnobs, selectedFaders, chosenColors, selectable, currentView, setEmissive]);

  // Función para obtener el título
  const getTitle = () => {
    switch (currentView) {
              case 'chasis': return 'CHOOSE THE CHASSIS COLOR';
              case 'buttons': return 'CUSTOMIZE THE BUTTONS';
              case 'knobs': return 'CUSTOMIZE THE KNOBS';
              case 'faders': return 'CUSTOMIZE THE FADERS';
              default: return 'CHOOSE A COLOR';
    }
  };

  // Función para obtener colores actuales
  const getCurrentColors = () => {
    switch (currentView) {
      case 'chasis': return PALETTES.chasis;
      case 'buttons': return PALETTES.buttons;
      case 'knobs': return PALETTES.knobs;
      case 'faders': return PALETTES.faders;
      default: return {};
    }
  };

  // Función para cambiar vista
  const changeView = useCallback((viewName: 'normal' | 'chasis' | 'buttons' | 'knobs' | 'faders') => {
    setCurrentView(viewName);
    if (selectedForColoring) setEmissive(selectedForColoring, 0x000000);
    selectedButtons.forEach(btn => setEmissive(btn, 0x000000));
    selectedKnobs.forEach(knob => setEmissive(knob, 0x000000));
    selectedFaders.forEach(fader => setEmissive(fader, 0x000000));

    if (viewName === 'chasis' && selectable.chasis.length > 0) {
      setSelectedForColoring(selectable.chasis[0]);
    } else {
      setSelectedForColoring(null);
    }

    if (!cameraRef.current || !controlsRef.current) return;

    let targetView;
    let enableOrbit;
    if (viewName === 'normal') {
      targetView = CAMERA_VIEWS.normal;
      enableOrbit = true;
    } else {
      targetView = CAMERA_VIEWS.top;
      enableOrbit = false;
    }
    controlsRef.current.enabled = enableOrbit;

    gsap.to(cameraRef.current.position, { duration: 1.2, ease: 'power3.inOut', ...targetView.pos });
    gsap.to(controlsRef.current.target, { duration: 1.2, ease: 'power3.inOut', ...targetView.target, onUpdate: () => controlsRef.current.update() });
  }, [selectable, selectedForColoring, setEmissive, selectedButtons, selectedKnobs, selectedFaders]);

  // Actualizar la referencia de la vista anterior
  useEffect(() => {
    prevViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    setTimeout(() => {
      if (cameraRef.current && controlsRef.current) {
        initialCameraPosRef.current = cameraRef.current.position.clone();
        initialCameraTargetRef.current = controlsRef.current.target.clone();
      }
    }, 100);
  }, []);

  // const particlesInit = async (main: any) => {
  //   await loadFull(main);
  // };

  // Inicialización de Three.js
  useEffect(() => {
    if (!mountRef.current) return;
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(45, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 200);
    camera.position.copy(CAMERA_VIEWS.normal.pos);
    cameraRef.current = camera;
    import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(CAMERA_VIEWS.normal.target);
      controls.enableDamping = true;
      controlsRef.current = controls;
    });
    setupProfessionalLighting(scene, renderer);
    loadModel();
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(animationId);
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [setupProfessionalLighting, loadModel]);

  // Efecto para aplicar colores cuando cambien
  useEffect(() => {
    if (!modelRef.current) return;
    if (selectable.chasis.length > 0) {
      const chasisColor = PALETTES.chasis[chosenColors.chasis];
      if (chasisColor) {
        selectable.chasis.forEach((mesh: THREE.Mesh) => {
          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.color = new THREE.Color(chasisColor.hex);
          }
        });
      }
      Object.entries(chosenColors.buttons).forEach(([buttonName, colorName]) => {
        const mesh = selectable.buttons.find(m => m.name === buttonName);
        if (mesh && PALETTES.buttons[colorName] && mesh.material instanceof THREE.MeshPhysicalMaterial) {
          // Frosted dome: keep dome white/frosted, only update LED (emissive) color.
          const syncLedColor = new THREE.Color(PALETTES.buttons[colorName].hex);
          mesh.material.emissive.copy(syncLedColor);
          mesh.material.attenuationColor.copy(syncLedColor);
        }
      });
      Object.entries(chosenColors.faders).forEach(([faderName, colorName]) => {
        const mesh = selectable.faders.find(m => m.name === faderName);
        if (mesh && PALETTES.faders[colorName]) {
          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.color = new THREE.Color(PALETTES.faders[colorName].hex);
          }
        }
      });
    }
  }, [chosenColors, PALETTES, selectable]);

  const menuIcons = [
    { id: 'normal', icon: 'M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5M12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17M12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z', title: 'Full View - See complete MIDI controller' },
    { id: 'chasis', icon: 'mixo.png', title: 'Customize Chassis - Change main body color', isImage: true },
    { id: 'buttons', icon: 'M12 1.999c5.524 0 10.002 4.478 10.002 10.002c0 5.523-4.478 10.001-10.002 10.001S1.998 17.524 1.998 12.001C1.998 6.477 6.476 1.999 12 1.999m0 1.5a8.502 8.502 0 1 0 0 17.003A8.502 8.502 0 0 0 12 3.5M11.996 6a5.998 5.998 0 1 1 0 11.996a5.998 5.998 0 0 1 0-11.996', title: 'Customize Buttons - Change trigger pad colors' },
    { id: 'knobs', icon: 'M9.42 4.074a.56.56 0 0 0-.56.56v.93c0 .308.252.56.56.56s.56-.252.56-.56v-.93a.56.56 0 0 0-.56-.56M11.554 8.8a.5.5 0 0 1 0 .707l-1.78 1.78a.5.5 0 1 1-.708-.707l1.78-1.78a.5.5 0 0 1 .708 0 M9.42 15.444c-1.16 0-2.32-.44-3.2-1.32a4.527 4.527 0 0 1 0-6.39a4.527 4.527 0 0 1 6.39 0a4.527 4.527 0 0 1 0 6.39c-.88.88-2.03 1.32-3.19 1.32m0-1.1a3.41 3.41 0 1 0 0-6.82a3.41 3.41 0 0 0 0 6.82M6.757 5.2a.56.56 0 1 0-.965.567l.465.809l.005.006a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.075a.566.566 0 0 0 .205-.753zm5.315.012a.55.55 0 0 1 .761-.206c.277.152.36.5.203.764l-.458.797a.56.56 0 0 1-.478.277a.564.564 0 0 1-.487-.834zm7.598 5.722a.5.5 0 0 1 .5-.5h2.52a.5.5 0 1 1 0 1h-2.52a.5.5 0 0 1-.5-.5 M22.69 15.454c2.49 0 4.52-2.03 4.52-4.52s-2.03-4.52-4.52-4.52s-4.52 2.03-4.52 4.52s2.03 4.52 4.52 4.52m0-1.11a3.41 3.41 0 1 1 0-6.82a3.41 3.41 0 0 1 0 6.82m-.56-9.7c0-.308.252-.56.56-.56s.56.252.56.56v.945a.566.566 0 0 1-.56.535a.56.56 0 0 1-.56-.56zm-2.103.566a.557.557 0 0 0-.763-.202a.566.566 0 0 0-.204.753l.468.815l.004.006a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.075a.566.566 0 0 0 .205-.753zm6.086-.204a.55.55 0 0 0-.761.206l-.458.795a.55.55 0 0 0 .194.759a.5.5 0 0 0 .282.077a.6.6 0 0 0 .478-.261l.005-.007l.463-.805a.55.55 0 0 0-.203-.764 M11.93 22.636H9.42a.5.5 0 0 0 0 1h2.51a.5.5 0 1 0 0-1 M4.9 23.136c0 2.49 2.03 4.52 4.52 4.52s4.52-2.03 4.52-4.52s-2.03-4.52-4.52-4.52s-4.52 2.03-4.52 4.52m7.93 0a3.41 3.41 0 1 1-6.82 0a3.41 3.41 0 0 1 6.82 0m-3.41-6.86a.56.56 0 0 0-.56.56v.93c0 .308.252.56.56.56s.56-.252.56-.56v-.93a.56.56 0 0 0-.56-.56m-3.418.93a.566.566 0 0 1 .755.206l.464.807c.137.258.06.6-.205.753a.53.53 0 0 1-.276.074a.58.58 0 0 1-.478-.261l-.005-.007l-.468-.814a.566.566 0 0 1 .207-.755zm6.08.209a.55.55 0 0 1 .761-.206c.277.151.36.499.203.764l-.462.802a.567.567 0 0 1-.766.194a.55.55 0 0 1-.194-.76zm8.475 3.588a.5.5 0 0 1 .707 0l1.78 1.78a.5.5 0 0 1-.707.707l-1.78-1.78a.5.5 0 0 1 0-.707 M22.69 27.656c-1.16 0-2.32-.44-3.2-1.32a4.527 4.527 0 0 1 0-6.39a4.527 4.527 0 0 1 6.39 0a4.527 4.527 0 0 1 0 6.39c-.88.88-2.04 1.32-3.19 1.32m0-1.11a3.41 3.41 0 1 0 0-6.82a3.41 3.41 0 0 0 0 6.82 M22.13 16.836c0-.308.252-.56.56-.56s.56.252.56.56v.945a.57.57 0 0 1-.56.545a.56.56 0 0 1-.56-.56zm-2.103.576a.566.566 0 0 0-.755-.206l-.006.003a.565.565 0 0 0-.206.755l.468.814l.004.007a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.074a.566.566 0 0 0 .205-.753z', title: 'Customize Knobs - Change rotary control colors' },
    { id: 'faders', icon: 'fader.png', isImage: true, title: 'Customize Faders - Change slider control colors' }
  ];


  const [sidebarFiles, setSidebarFiles] = useState<File[]>([]);
  const handleSidebarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSidebarFiles(Array.from(e.target.files));
    }
  };

      return (
      <>
        {/* Pantalla de rotación para móviles */}
        {!isLandscape && window.innerWidth <= 768 && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white text-center p-8">
            <div className="mb-8">
              <svg 
                width="80" 
                height="80" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                className="mx-auto mb-4 animate-bounce text-cyan-400"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">Rotate your device!</h2>
            <p className="text-lg mb-2">to use the configurator</p>
            <p className="text-base opacity-80">Please turn your device to landscape mode</p>
            <div className="mt-8 flex items-center space-x-2 text-sm opacity-60">
              <div className="w-8 h-5 border-2 border-current rounded-sm"></div>
              <span>→</span>
              <div className="w-5 h-8 border-2 border-current rounded-sm"></div>
            </div>
          </div>
        )}

        {/* Imagen de fondo */}
        <StarfieldBackground />
        <div className="w-full h-screen text-gray-200 overflow-hidden relative" style={{ background: "transparent" }}>
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none", background: "transparent" }} />
        {/* <Particles 
          id="tsparticles" 
          init={particlesInit} 
          options={{
            fullScreen: { enable: false },
            background: { color: { value: "transparent" } },
            fpsLimit: 60,
            particles: {
              color: { value: "#a259ff" },
              links: { enable: true, color: "#a259ff", distance: 120 },
              move: { enable: true, speed: 1 },
              number: { value: 50 },
              opacity: { value: 0.5 },
              shape: { type: "circle" },
              size: { value: 3 }
            },
            interactivity: {
              events: {
                onhover: { enable: true, mode: "repulse" }
              },
              modes: {
                repulse: { distance: 100, duration: 0.4 }
              }
            }
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 0,
            pointerEvents: "none"
          }}
        /> */}
        <div 
          className="fixed top-2 md:top-4 z-50 flex items-center gap-2 md:gap-3"
          style={{ left: '-20px' }}
        >
          <button
            onClick={() => window.location.href = import.meta.env.BASE_URL}
            className="relative px-3 md:px-5 py-1 md:py-2 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider text-white transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/55"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <path d="M3 10.5L12 3l9 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 9.5V21h14V9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
                              <span>Home</span>
            </span>
          </button>
        </div>
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex items-center pointer-events-none">
          <img
            src={`${import.meta.env.BASE_URL}textures/Logo-mixo_Mesa de trabajo 1.png`}
            alt="MIXO"
            style={{ height: 44, width: 'auto', filter: 'brightness(1.1)' }}
          />
        </div>
        <main className="flex w-full h-full" style={{ minHeight: "100vh", height: "100vh", position: "relative", zIndex: 1, overflow: "hidden", background: "transparent" }}>
          <div className="flex-grow h-full" style={{ position: "relative", zIndex: 1, background: "transparent" }}>
            <div ref={mountRef} className="w-full h-full transition-all duration-300" onClick={handleCanvasClick} style={{ position: "relative", zIndex: 1 }} />
            {currentView === 'normal' && (<>
              <ReserveCtaBar product="mixo" onSendConfig={handleFinalizeOpenModal} onReserve={() => setShowReservaModal(true)} />
              <ReservaModal
                isOpen={showReservaModal}
                onClose={() => setShowReservaModal(false)}
                onPagoExitoso={() => setShowReservaModal(false)}
                productType="mixo"
                chosenColors={chosenColors}
              />
              </>
            )}
          </div>
        </main>
        <div
          style={{
            position: 'fixed',
            top: 0,
            width: currentView === 'normal' ? 'clamp(80px, 20vw, 112px)' : 'clamp(300px, 35vw, 360px)',
            height: '100vh',
            display: 'flex',
            zIndex: 10,
            transition: 'all 0.4s ease',
            right: window.innerWidth <= 768 ? -35 : -20
          }}
          className="mobile-panel"
        >
          {/* Columna de controles de vista */}
          <div 
            style={{
              width: 'clamp(60px, 15vw, 112px)',
              flexShrink: 0,
              paddingTop: 'clamp(20px, 5vh, 160px)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 1vw, 6px)' }}>
              {menuIcons.map(({ id, icon, title, isImage }) => (
                <button 
                  key={id} 
                  onClick={() => changeView(id as 'normal' | 'chasis' | 'buttons' | 'knobs' | 'faders')} 
                  style={{
                    width: 'clamp(40px, 10vw, 70px)',
                    height: 'clamp(40px, 10vw, 70px)',
                    padding: 'clamp(4px, 1vw, 8px)',
                    aspectRatio: '1 / 1',
                    border: '2px solid #00FFFF',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    color: 'white',
                    cursor: 'pointer',
                    background: currentView === id 
                      ? 'linear-gradient(to bottom right, #00FFFF, #0080FF)' 
                      : 'linear-gradient(to bottom right, #000000, #1a1a1a)',
                    boxShadow: currentView === id ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to bottom right, #00FFFF, #0080FF)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                    const tooltip = document.createElement('div');
                    tooltip.className = 'custom-tooltip';
                    tooltip.textContent = title;
                    tooltip.style.cssText = `
                      position: fixed;
                      left: ${e.clientX - 20}px;
                      top: ${e.clientY - 20}px;
                      transform: translateX(-100%);
                      background: #8503adcc;
                      color: white;
                      padding: 12px 16px;
                      border-radius: 8px;
                      font-size: 14px;
                      font-weight: bold;
                      white-space: nowrap;
                      z-index: 999999;
                      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                      border: 2px solid #f87171;
                      pointer-events: none;
                    `;
                    tooltip.id = 'temp-tooltip';
                    document.body.appendChild(tooltip);
                  }}
                  onMouseLeave={(e) => {
                    if (currentView !== id) {
                      e.currentTarget.style.background = 'linear-gradient(to bottom right, #000000, #1a1a1a)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                    const tooltip = document.getElementById('temp-tooltip');
                    if (tooltip) {
                      tooltip.remove();
                    }
                  }}
                >

                  {isImage ? (
                    <img 
                      src={`textures/${icon}`}
                      alt={title}
                      style={{
                        width: 'clamp(20px, 5vw, 40px)',
                        height: 'clamp(20px, 5vw, 40px)',
                        objectFit: 'contain',
                        margin: 'auto',
                        filter: id === 'faders' ? 'brightness(1.5) contrast(1.3) saturate(1.2) drop-shadow(0 0 6px rgba(0, 255, 255, 0.5))' : 'none',
                        backgroundColor: id === 'faders' ? 'rgba(0, 0, 0, 0.1)' : 'transparent'
                      }}
                      onError={(e) => {
                        console.error('Error loading image:', e);
                        console.log('Attempted to load:', `textures/${icon}`);
                      }}
                    />
                  ) : (
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox={id === 'chasis' ? '0 0 32 32' : id === 'knobs' ? '0 0 32 32' : id === 'faders' ? '0 0 24 24' : '0 0 24 24'}
                      style={{
                        width: 'clamp(20px, 5vw, 40px)',
                        height: 'clamp(20px, 5vw, 40px)',
                        fill: 'white',
                        color: 'white',
                        margin: 'auto'
                      }}
                      fill="#fff"
                    >
                      <path d={icon} />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido de la UI (alineado a Beato16) */}
          <div 
            style={{
              flex: 1,
              padding: currentView === 'normal' ? 'clamp(4px, 1vw, 8px)' : 'clamp(12px, 2vw, 16px)',
              display: 'flex',
              flexDirection: 'column',
              background: currentView === 'normal' ? 'transparent' : 'rgba(11, 18, 32, 0.85)',
              borderLeft: currentView === 'normal' ? 'none' : '1px solid rgba(0, 255, 255, 0.3)',
              backdropFilter: currentView === 'normal' ? undefined : 'blur(10px)',
              overflowY: currentView === 'normal' ? 'visible' : 'auto'
            }}
          >
            {/* Header - Solo logo en vista normal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                paddingBottom: 'clamp(12px, 3vw, 20px)',
                borderBottom: '1px solid #4b5563',
                paddingLeft: 0,
                justifyContent: 'center',
                gap: currentView === 'normal' ? 0 : 'clamp(4px, 1vw, 8px)',
                minHeight: currentView === 'normal' ? 'clamp(40px, 10vw, 48px)' : 'auto'
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}models/logo.png`}
                alt="Logo"
                style={{
                  height: currentView === 'normal' ? 'clamp(20px, 5vw, 24px)' : 'clamp(28px, 7vw, 32px)',
                  width: 'auto',
                  filter: 'drop-shadow(0 0 8px #a259ff) drop-shadow(0 0 16px #0ff)'
                }}
              />
            </div>

            {/* Sección de colores - igual a Beato16 (2 columnas y márgenes) */}
            {currentView !== 'normal' && (
              <div style={{ marginTop: 'clamp(12px, 2.5vw, 20px)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }} className="animate-fadeIn">
                <PalettePanel
                  title={getTitle()}
                  subtitle={paletteSubtitle(currentView)}
                  colors={getCurrentColors() as Record<string, { hex: string }>}
                  onSelect={(name, colorData) => applyColor(name, colorData as any)}
                  selectedCount={currentView === 'buttons' ? selectedButtons.length : currentView === 'knobs' ? selectedKnobs.length : currentView === 'faders' ? selectedFaders.length : 0}
                />
              </div>
            )}
            {(selectedButtons.length > 0 || selectedKnobs.length > 0 || selectedFaders.length > 0) && (
              <div 
                style={{
                  marginBottom: 'clamp(16px, 4vw, 24px)',
                  padding: 'clamp(8px, 2vw, 16px)',
                  background: '#1f2937',
                  borderRadius: '8px'
                }}
              >
                <h4 
                  style={{
                    fontSize: 'clamp(12px, 3vw, 18px)',
                    fontWeight: 600,
                    color: 'white',
                    marginBottom: 'clamp(4px, 1vw, 8px)'
                  }}
                >
                  Selección múltiple ({selectedButtons.length + selectedKnobs.length + selectedFaders.length} elementos)
                </h4>
                <p 
                  style={{
                    color: '#d1d5db',
                    fontSize: 'clamp(10px, 2vw, 14px)'
                  }}
                >
                  Haz clic en un color para aplicarlo a todos los elementos seleccionados
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Tooltips de los botones - siguen al mouse */}
        {showChasisTooltip && (
          <div 
            className="fixed bg-black bg-opacity-90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-[9999] border border-[#00FFFF] shadow-lg pointer-events-none"
            style={{
              left: mousePosition.x - 10, // 10px a la izquierda del cursor
              top: mousePosition.y - 50, // 50px arriba del cursor
              transform: 'translateX(-100%)' // Alinea el borde derecho del tooltip con la posición 'left'
            }}
          >
            Cambia el color de tu chasis
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black border-t-opacity-90"></div>
          </div>
        )}
        
        {showKnobsTooltip && (
          <div 
            className="fixed bg-black bg-opacity-90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-[9999] border border-[#00FFFF] shadow-lg pointer-events-none"
            style={{
              left: mousePosition.x - 10, // 10px a la izquierda del cursor
              top: mousePosition.y - 50, // 50px arriba del cursor
              transform: 'translateX(-100%)' // Alinea el borde derecho del tooltip con la posición 'left'
            }}
          >
            Cambia el color de tus knobs
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black border-t-opacity-90"></div>
          </div>
        )}
        
        {showFadersTooltip && (
          <div 
            className="fixed bg-black bg-opacity-90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-[9999] border border-[#00FFFF] shadow-lg pointer-events-none"
            style={{
              left: mousePosition.x - 10, // 10px a la izquierda del cursor
              top: mousePosition.y - 50, // 50px arriba del cursor
              transform: 'translateX(-100%)' // Alinea el borde derecho del tooltip con la posición 'left'
            }}
          >
            Cambia el color de tus faders
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black border-t-opacity-90"></div>
          </div>
        )}
        
      </div>
    </>
  );
};

export default MixoConfigurator;