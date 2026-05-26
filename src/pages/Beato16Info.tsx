import React from 'react';
import ControllerViewer from '../components/3d/ControllerViewer';
import ProductInfoPage from './ProductInfoPage';

const Beato16Info: React.FC = () => (
  <ProductInfoPage
    name="BEATO16"
    viewer={<ControllerViewer className="h-[500px] w-full" transparent={true} />}
    glowGradient="from-cyan-500/20 to-fuchsia-500/20"
    description="El nuevo Beato16 es un controlador MIDI diseñado para ofrecer una experiencia táctil y dinámica. Equipado con cuatro teclas táctiles estilo juego —perfectas para octavar, grabar o realizar funciones rápidas en su flujo de trabajo—, así como 16 botones arcade, un fader y cuatro perillas, ofrece una respuesta rápida y precisa para producción musical, presentaciones en vivo y otras aplicaciones interactivas."
    secondDescription="Su versatilidad no se limita a la música: también se puede utilizar como macro pad, optimizando flujos de trabajo en software como Ableton Live, Resolume, Unity o cualquier aplicación compatible con MIDI."
    carouselTitle="Diseño y Construcción"
    carouselText="Con una construcción robusta y un diseño intuitivo, el Beato16 es ideal para tocar la batería con los dedos y, más ampliamente, para creadores digitales que buscan un controlador flexible y potente que sea fácil de integrar en su configuración."
    features={[
      { title: '16 Botones RGB', description: 'Botones iluminados personalizables para máxima visibilidad en cualquier ambiente.' },
      { title: '1 Fader', description: 'Controlador deslizante de alta precisión para mezcla y control de parámetros en tiempo real.' },
      { title: '4 Knobs', description: 'Perillas de control rotativas para ajustes finos de parámetros.' },
      { title: 'USB-C', description: 'Conexión MIDI a través de un puerto USB-C moderno y reversible.' },
      { title: 'Plug & Play', description: 'Compatible con todos los DAWs principales sin necesidad de drivers.' },
      { title: 'Diseño Premium', description: 'Construcción robusta con materiales de alta calidad para uso profesional.' },
    ]}
    specs={[
      {
        title: 'Controles',
        items: [
          '16 botones arcade RGB personalizables',
          '4 teclas táctiles estilo juego',
          '1 fader de precisión',
          '4 knobs asignables',
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
    price="$1.000.000 COP"
    productId="beato16"
    ctaGradient="from-purple-500 to-cyan-500"
  />
);

export default Beato16Info;
