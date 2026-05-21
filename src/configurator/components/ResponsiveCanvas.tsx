import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useResizeCamera } from '../hooks/useResizeCamera';

interface ResponsiveCanvasProps {
  children: React.ReactNode;
  className?: string;
  cameraPosition?: [number, number, number];
  fov?: number;
  enableControls?: boolean;
  enableEnvironment?: boolean;
}

const SceneContent: React.FC<{
  children: React.ReactNode;
  cameraPosition: [number, number, number];
  fov: number;
  enableControls: boolean;
  enableEnvironment: boolean;
}> = ({ children, cameraPosition, fov, enableControls, enableEnvironment }) => {
  // Usar el hook de resize automático
  useResizeCamera({ fov });

  return (
    <>
      {/* Cámara */}
      <perspectiveCamera position={cameraPosition} fov={fov} />
      
      {/* Controles de órbita */}
      {enableControls && (
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={10}
          minDistance={1}
        />
      )}
      
      {/* Iluminación */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Ambiente */}
      {enableEnvironment && <Environment files={`${import.meta.env.BASE_URL}textures/city.hdr`} />}
      
      {/* Contenido de la escena */}
      {children}
    </>
  );
};

export const ResponsiveCanvas: React.FC<ResponsiveCanvasProps> = ({
  children,
  className = '',
  cameraPosition = [0, 0, 5],
  fov = 75,
  enableControls = true,
  enableEnvironment = true
}) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={null}>
          <SceneContent
            cameraPosition={cameraPosition}
            fov={fov}
            enableControls={enableControls}
            enableEnvironment={enableEnvironment}
          >
            {children}
          </SceneContent>
        </Suspense>
      </Canvas>
    </div>
  );
};
