import React from 'react';
import ProductModelViewer from '../components/3d/ProductModelViewer';
import ProductInfoPage from './ProductInfoPage';

const Beato8Info: React.FC = () => (
  <ProductInfoPage
    name="BEATO8"
    subtitle="Controlador MIDI Compacto y Potente"
    viewer={<ProductModelViewer modelUrl={`${import.meta.env.BASE_URL}models/BEATO.glb`} className="h-[500px] w-full" preserveMaterials />}
    glowGradient="from-cyan-500/20 to-fuchsia-500/20"
    description="El BEATO8 es un controlador MIDI compacto y potente diseñado para productores que buscan versatilidad en un formato reducido. Con 8 botones arcade de alta calidad y 4 knobs asignables, ofrece un control preciso y expresivo para cualquier flujo de trabajo musical."
    secondDescription="Su construcción metálica robusta y diseño ergonómico lo hacen ideal para uso en estudio y presentaciones en vivo, proporcionando la confiabilidad que necesitas para tus proyectos más importantes."
    carouselTitle="Diseño y Construcción"
    carouselText="Con una construcción metálica robusta y un diseño compacto, el BEATO8 es perfecto para productores que necesitan un controlador confiable y portátil que se integre perfectamente en cualquier configuración de estudio."
    features={[
      { title: '8 Botones Arcade', description: 'Botones de alta calidad con respuesta táctil precisa para máxima expresividad.' },
      { title: '4 Knobs Asignables', description: 'Perillas de control rotativas para ajustes finos de parámetros en tiempo real.' },
      { title: 'Cuerpo Metálico', description: 'Construcción robusta con materiales de alta calidad para uso profesional.' },
      { title: 'USB-C', description: 'Conexión MIDI a través de un puerto USB-C moderno y reversible.' },
      { title: 'Plug & Play', description: 'Compatible con todos los DAWs principales sin necesidad de drivers.' },
      { title: 'Diseño Compacto', description: 'Formato reducido perfecto para espacios de trabajo limitados.' },
    ]}
    specs={[
      {
        title: 'Controles',
        items: [
          '8 botones arcade de alta calidad',
          '4 knobs asignables',
          'Cuerpo metálico robusto',
        ],
      },
      {
        title: 'Conectividad',
        items: [
          'Conexión MIDI por USB-C',
          'Compatible con Windows, Mac, Linux',
          'Plug & Play con todos los DAWs',
          'Latencia ultra-baja',
        ],
      },
    ]}
    price="$750.000 COP"
    productId="beato"
    ctaGradient="from-purple-500 to-cyan-500"
  />
);

export default Beato8Info;
