import React, { useEffect, useRef } from 'react';

const ParallaxBackground: React.FC = () => {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parallaxRef.current) {
      // Crear múltiples capas de partículas con diferentes velocidades
      const layers = [
        { speed: 0.2, size: '3px', count: 60, color: '#00F5FF' },
        { speed: 0.4, size: '2px', count: 80, color: '#FF47E2' },
        { speed: 0.6, size: '4px', count: 40, color: '#D0FF00' },
        { speed: 0.8, size: '2.5px', count: 70, color: '#FFFFFF' },
      ];

      layers.forEach((layer, index) => {
        const layerDiv = document.createElement('div');
        layerDiv.className = `parallax-layer layer-${index}`;
        layerDiv.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: ${6 + index};
          overflow: hidden;
        `;

        // Crear partículas para esta capa
        for (let i = 0; i < layer.count; i++) {
          const particle = document.createElement('div');
          particle.style.cssText = `
            position: absolute;
            width: ${layer.size};
            height: ${layer.size};
            background: ${layer.color};
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float ${3 + Math.random() * 2}s ease-in-out infinite;
            animation-delay: ${Math.random() * 2}s;
          `;
          layerDiv.appendChild(particle);
        }

        parallaxRef.current.appendChild(layerDiv);
      });

      // Agregar estilos CSS para la animación
      const style = document.createElement('style');
      style.textContent = `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        .parallax-layer {
          background: radial-gradient(circle at 20% 20%, rgba(0, 245, 255, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(255, 71, 226, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 40% 60%, rgba(208, 255, 0, 0.1) 0%, transparent 50%);
        }
      `;
      document.head.appendChild(style);

      return () => {
        // Cleanup
        if (parallaxRef.current) {
          parallaxRef.current.innerHTML = '';
        }
        document.head.removeChild(style);
      };
    }
  }, []);

  return (
    <div 
      ref={parallaxRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 5 }}
    />
  );
};

export default ParallaxBackground;