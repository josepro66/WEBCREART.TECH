import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/splide/dist/css/splide.min.css';

// Datos de productos
const products = [
  {
    id: 'beato',
    name: 'BEATO',
    description: 'Controlador MIDI con cuerpo metálico y 8 botones ARCADE para productores',
    image: '/images/products/BEATO.png',
    model: `${import.meta.env.BASE_URL}models/BEATO.glb`,
    features: ['Cuerpo metálico', '8 botones ARCADE', '4 knobs asignables', 'USB-C'],
    price: '$185'
  },
  {
    id: 'beato16',
    name: 'BEATO16',
    description: 'Nuestro controlador MIDI más avanzado con tecnología de última generación',
    image: '/images/products/BEATO16.png',
    model: `${import.meta.env.BASE_URL}models/BEATO16.glb`,
    features: ['16 Botones RGB', '4 Faders', '4 Knobs', 'USB-C'],
    price: '$499'
  },
  {
    id: 'fado',
    name: 'FADO',
    description: 'Controlador MIDI minimalista con enfoque en la creatividad',
    image: '/images/products/FADO.png',
    model: `${import.meta.env.BASE_URL}models/FADO.glb`,
    features: ['8 Faders de Precisión', 'USB-C'],
    price: '$199'
  },
  {
    id: 'knobo',
    name: 'KNOBO',
    description: '8 perillas asignables para un control preciso y creativo.',
    image: '/images/products/KNOBO.png',
    model: `${import.meta.env.BASE_URL}models/KNOBO.glb`,
    features: ['8 knobs asignables', 'Cuerpo de metal', 'OLED display', 'USB-C'],
    price: '$130'
  },
  {
    id: 'loopo',
    name: 'LOOPO',
    description: 'Pedal looper con 4 footswitches y 4 knobs para directo y estudio.',
    image: '/images/products/LOOPO.png',
    model: `${import.meta.env.BASE_URL}models/LOOPO.glb`,
    features: ['4 footswitches', '4 knobs asignables', 'Control de loops', 'Fácil de integrar'],
    price: '$175'
  },
  {
    id: 'mixo',
    name: 'MIXO',
    description: 'Controlador de mezcla profesional para DJs',
    image: '/images/products/MIXO.png',
    model: `${import.meta.env.BASE_URL}models/MIXO.glb`,
    features: ['4 channels', 'EQ', 'Effects', 'Crossfader'],
    price: '$599'
  },
  {
    id: 'wavo',
    name: 'WAVO',
    description: 'Sintetizador híbrido analógico-digital con secuenciador y teclado',
    image: `${import.meta.env.BASE_URL}textures/wavo.png`,
    model: `${import.meta.env.BASE_URL}models/wavo.glb`,
    features: ['Teclado personalizable', '7 Botones Arcade', '7 Knobs', 'Secuenciador'],
    price: '$500'
  }
];


// Componente de tarjeta de producto
function ProductCard({ product, onDetails }: { product: typeof products[0]; onDetails: (id: string) => void }) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.div
      className="relative bg-gradient-to-br from-gray-900/80 via-gray-800/60 to-gray-900/80 backdrop-blur-md rounded-2xl p-4 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-500 product-card overflow-hidden w-80 max-w-sm"
      whileHover={{ y: -8, scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Efecto de neón animado */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
      
      {/* Borde de neón */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 blur-sm opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Efecto Venom - Circuito que se apodera de la tarjeta */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-2xl overflow-hidden">
        {/* Líneas de circuito que aparecen progresivamente */}
        <div className="absolute top-4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 hover:opacity-100 transition-all duration-500 animate-pulse" style={{ transitionDelay: '0s' }}></div>
        <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-0 hover:opacity-100 transition-all duration-500 animate-pulse" style={{ transitionDelay: '0.2s' }}></div>
        <div className="absolute top-12 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 hover:opacity-100 transition-all duration-500 animate-pulse" style={{ transitionDelay: '0.4s' }}></div>
        
        <div className="absolute left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-purple-400 to-transparent opacity-0 hover:opacity-100 transition-all duration-500 animate-pulse" style={{ transitionDelay: '0.1s' }}></div>
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-0 hover:opacity-100 transition-all duration-500 animate-pulse" style={{ transitionDelay: '0.3s' }}></div>
        <div className="absolute right-4 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-purple-400 to-transparent opacity-0 hover:opacity-100 transition-all duration-500 animate-pulse" style={{ transitionDelay: '0.5s' }}></div>
        <div className="absolute right-8 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-0 hover:opacity-100 transition-all duration-500 animate-pulse" style={{ transitionDelay: '0.7s' }}></div>
        
        <div className="absolute bottom-4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 hover:opacity-100 transition-all duration-500 animate-pulse" style={{ transitionDelay: '0.6s' }}></div>
        <div className="absolute bottom-8 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-0 hover:opacity-100 transition-all duration-500 animate-pulse" style={{ transitionDelay: '0.8s' }}></div>
        
        {/* Nodos de conexión */}
        <div className="absolute top-4 left-4 w-3 h-3 bg-cyan-400 rounded-full opacity-0 hover:opacity-100 transition-all duration-500 animate-ping" style={{ transitionDelay: '0.9s' }}></div>
        <div className="absolute top-4 right-4 w-3 h-3 bg-purple-400 rounded-full opacity-0 hover:opacity-100 transition-all duration-500 animate-ping" style={{ transitionDelay: '1s' }}></div>
        <div className="absolute bottom-4 left-4 w-3 h-3 bg-cyan-400 rounded-full opacity-0 hover:opacity-100 transition-all duration-500 animate-ping" style={{ transitionDelay: '1.1s' }}></div>
        <div className="absolute bottom-4 right-4 w-3 h-3 bg-purple-400 rounded-full opacity-0 hover:opacity-100 transition-all duration-500 animate-ping" style={{ transitionDelay: '1.2s' }}></div>
        
        {/* Líneas diagonales */}
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1 bg-gradient-to-r from-cyan-400/80 to-purple-400/80 transform rotate-45 opacity-0 hover:opacity-100 transition-all duration-500 animate-pulse" style={{ transitionDelay: '1.3s' }}></div>
        <div className="absolute top-3/4 left-1/4 w-1/2 h-1 bg-gradient-to-r from-purple-400/80 to-cyan-400/80 transform -rotate-45 opacity-0 hover:opacity-100 transition-all duration-500 animate-pulse" style={{ transitionDelay: '1.4s' }}></div>
        
        {/* Efecto de escaneo */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent transform -skew-x-12 opacity-0 hover:opacity-100 transition-all duration-500 animate-pulse" style={{ transitionDelay: '1.5s' }}></div>
      </div>
      {/* Imagen del producto */}
      <div className="relative h-40 mb-3 rounded-xl overflow-hidden bg-gradient-to-br from-gray-800/40 to-gray-900/60 flex items-center justify-center border border-cyan-500/20">
        {/* Efecto de escaneo */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent transform -skew-x-12 opacity-0 hover:opacity-100 transition-opacity duration-700 animate-pulse"></div>
        
        <motion.img
          src={product.image}
          alt={product.name}
          className="relative z-10 max-h-full max-w-full object-contain filter drop-shadow-lg"
          whileHover={{ scale: 1.1, filter: "drop-shadow(0 0 20px rgba(6, 182, 212, 0.5))" }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Información del producto */}
      <div className="relative z-10 space-y-2">
        <div>
          <h3 className="text-base font-bold bg-gradient-to-r from-cyan-400 via-white to-purple-400 bg-clip-text text-transparent mb-1 drop-shadow-lg">
            {product.name}
          </h3>
          <p className="text-gray-300 text-xs leading-relaxed drop-shadow-md">{product.description}</p>
        </div>

        {/* Características */}
        <div className="flex flex-wrap gap-1">
          {product.features.map((feature, index) => (
            <motion.span
              key={index}
              className="px-2 py-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 text-xs rounded-full border border-cyan-400/40 backdrop-blur-sm shadow-lg"
              whileHover={{ 
                scale: 1.05, 
                boxShadow: "0 0 15px rgba(6, 182, 212, 0.4)",
                borderColor: "rgba(6, 182, 212, 0.8)"
              }}
              transition={{ duration: 0.3 }}
            >
              {feature}
            </motion.span>
          ))}
        </div>

        {/* Precio y botón */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">
            {product.price}
          </span>
          <motion.button
            className="relative px-4 py-2 bg-gradient-to-r from-purple-600 via-cyan-500 to-purple-600 text-white font-semibold rounded-full overflow-hidden shadow-lg border border-cyan-400/30 text-sm"
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 0 25px rgba(6, 182, 212, 0.6)"
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3 }}
            onClick={() => onDetails(product.id)}
          >
            {/* Efecto de brillo animado */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            <span className="relative z-10">Ver detalles</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

const productRoutes: Record<string, string> = {
  beato16: '/beato16info',
  beato: '/beato8info',
  mixo: '/mixoinfo',
  fado: '/fadoinfo',
  knobo: '/knoboinfo',
  loopo: '/loopoinfo',
  wavo: '/wavoinfo',
};

// Componente principal de la página de productos
function ProductsPage() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const handleDetails = (id: string) => {
    navigate(productRoutes[id] ?? `/configurator?product=${id}`);
  };

  // Detectar cambios de pantalla completa
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;
      setIsFullscreen(!!fullscreenElement);
    };

    const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    events.forEach(event => document.addEventListener(event, handleFullscreenChange));
    return () => events.forEach(event => document.removeEventListener(event, handleFullscreenChange));
  }, []);

  return (
    <section 
      className="section-snap relative w-full overflow-hidden" 
      style={{ 
        height: isFullscreen ? '100vh' : '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isFullscreen ? 'center' : 'flex-start',
        alignItems: 'center'
      }}
    >
      {/* Background Image - Fondo nuestros productos */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url('images/fondonuestrosproductos_Mesa de trabajo 1.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          zIndex: 1
        }}
      />
      
      {/* Overlay para tapar partículas */}
      <div className="absolute inset-0 bg-black/30" style={{ zIndex: 2 }} />
      
      {/* Background Effects locales */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute inset-0 plasma-bg" />
      </div>

      {/* Contenido principal */}
      <div 
        className="relative flex flex-col container mx-auto px-6 overflow-visible" 
        style={{ 
          zIndex: 10,
          width: '100%',
          maxWidth: '100%',
          padding: isFullscreen ? '4rem 6rem' : '2rem 1.5rem',
          height: isFullscreen ? '100vh' : '100%',
          justifyContent: isFullscreen ? 'center' : 'flex-start',
          alignItems: 'center'
        }}
      >
        {/* Header - Posicionado en la parte superior */}
        <motion.div
          className="text-center products-title relative"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ 
            zIndex: 20,
            marginBottom: isFullscreen ? '3rem' : '0.25rem',
            paddingTop: isFullscreen ? '2rem' : '0'
          }}
        >
          {/* Efecto de fondo futurista */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 blur-3xl rounded-full scale-150"></div>
          
          {/* Líneas de energía que se extienden */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          
          {/* Nodos de energía en los lados */}
          <div className="absolute top-1/2 -left-8 w-4 h-4 bg-cyan-400 rounded-full animate-ping shadow-lg shadow-cyan-400/50"></div>
          <div className="absolute top-1/2 -right-8 w-4 h-4 bg-purple-400 rounded-full animate-ping shadow-lg shadow-purple-400/50" style={{ animationDelay: '0.3s' }}></div>
          
          {/* Título principal con múltiples efectos */}
          <h1 
            className="relative font-black mb-1"
            style={{
              fontSize: isFullscreen ? '3rem' : '2rem',
              marginBottom: isFullscreen ? '1rem' : '0.25rem'
            }}
          >
            {/* Texto principal con gradiente animado */}
            <span className="bg-gradient-to-r from-cyan-400 via-purple-500 via-pink-500 to-cyan-400 bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradientShift_3s_ease-in-out_infinite] drop-shadow-2xl">
              NUESTROS PRODUCTOS
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-500 via-pink-500 via-cyan-400 to-purple-500 bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradientShift_3s_ease-in-out_infinite] drop-shadow-2xl" style={{ animationDelay: '1.5s' }}>
              
            </span>
            
            {/* Efecto de neón detrás del texto */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent blur-sm opacity-50 animate-pulse">
              NUESTROS<br />PRODUCTOS
            </div>
            
            {/* Efecto de escaneo horizontal */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent transform -skew-x-12 animate-[scan_2s_ease-in-out_infinite]"></div>
          </h1>
          
          {/* Subtítulo futurista */}
          <motion.p 
            className="text-sm md:text-base text-gray-300 font-light tracking-wider relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              TECNOLOGÍA MUSICAL
            </span>
            <span className="mx-4 text-cyan-400 animate-pulse">◆</span>
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              INNOVACIÓN DIGITAL
            </span>
          </motion.p>
          
          {/* Líneas de conexión animadas */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-px h-8 bg-gradient-to-b from-cyan-400 to-transparent animate-pulse"></div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-px h-8 bg-gradient-to-t from-purple-400 to-transparent animate-pulse" style={{ animationDelay: '0.7s' }}></div>
        </motion.div>

        {/* Sin espacio entre título y carrusel */}

        {/* Carrusel Splide - Versión simplificada */}
        <div 
          className="flex items-center justify-center splide-container"
          style={{
            width: '100%',
            maxWidth: '100%',
            padding: isFullscreen ? '2rem 0' : '1rem 0',
            flex: isFullscreen ? '1' : '0 1 auto'
          }}
        >
          <div 
            className="w-full"
            style={{
              maxWidth: isFullscreen ? '100%' : '80rem'
            }}
          >
            <Splide 
              options={{
                type: 'slide',
                perPage: 3,
                gap: '2rem',
                padding: '1rem',
                arrows: true,
                pagination: true,
                autoplay: false,
                drag: true,
                keyboard: true,
                breakpoints: {
                  1024: { 
                    perPage: 2,
                    gap: '1.5rem'
                  },
                  768: { 
                    perPage: 1,
                    gap: '1rem'
                  }
                }
              }} 
              className="splide"
            >
              {products.map((product, index) => (
                <SplideSlide key={product.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="flex justify-center h-full"
                  >
                    <ProductCard product={product} onDetails={handleDetails} />
                  </motion.div>
                </SplideSlide>
              ))}
            </Splide>
          </div>
        </div>

        {/* Estilos para el carrusel y tarjetas */}
        <style>{`
          /* Estilos para pantalla completa */
          :fullscreen,
          :-webkit-full-screen,
          :-moz-full-screen,
          :-ms-fullscreen {
            background: linear-gradient(135deg, #0B0F14 0%, #05060A 100%) !important;
          }
          
          :fullscreen .splide-container,
          :-webkit-full-screen .splide-container,
          :-moz-full-screen .splide-container,
          :-ms-fullscreen .splide-container {
            padding: 2rem 6rem 4rem 6rem !important;
            max-width: 100vw !important;
            height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
          }
          
          :fullscreen .products-title,
          :-webkit-full-screen .products-title,
          :-moz-full-screen .products-title,
          :-ms-fullscreen .products-title {
            margin-bottom: 3rem !important;
            padding-top: 2rem !important;
            position: relative !important;
            top: 0 !important;
          }
          
          :fullscreen .products-title h1,
          :-webkit-full-screen .products-title h1,
          :-moz-full-screen .products-title h1,
          :-ms-fullscreen .products-title h1 {
            font-size: 3rem !important;
            margin-bottom: 1rem !important;
          }
          
          :fullscreen .splide,
          :-webkit-full-screen .splide,
          :-moz-full-screen .splide,
          :-ms-fullscreen .splide {
            max-width: 100% !important;
            flex: 1 !important;
            display: flex !important;
            align-items: center !important;
          }
          
          :fullscreen .product-card,
          :-webkit-full-screen .product-card,
          :-moz-full-screen .product-card,
          :-ms-fullscreen .product-card {
            max-width: 400px !important;
            margin: 0 auto !important;
            height: auto !important;
          }
          
          :fullscreen .splide__arrow,
          :-webkit-full-screen .splide__arrow,
          :-moz-full-screen .splide__arrow,
          :-ms-fullscreen .splide__arrow {
            width: 5rem !important;
            height: 5rem !important;
            font-size: 2rem !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
          }
          
          :fullscreen .splide__arrow--prev,
          :-webkit-full-screen .splide__arrow--prev,
          :-moz-full-screen .splide__arrow--prev,
          :-ms-fullscreen .splide__arrow--prev {
            left: 1rem !important;
          }
          
          :fullscreen .splide__arrow--next,
          :-webkit-full-screen .splide__arrow--next,
          :-moz-full-screen .splide__arrow--next,
          :-ms-fullscreen .splide__arrow--next {
            right: 1rem !important;
          }
          
          :fullscreen .splide__pagination,
          :-webkit-full-screen .splide__pagination,
          :-moz-full-screen .splide__pagination,
          :-ms-fullscreen .splide__pagination {
            bottom: 1rem !important;
            gap: 1rem !important;
          }
          
          :fullscreen .splide__pagination__page,
          :-webkit-full-screen .splide__pagination__page,
          :-moz-full-screen .splide__pagination__page,
          :-ms-fullscreen .splide__pagination__page {
            width: 1rem !important;
            height: 1rem !important;
          }
          
          /* Clases condicionales para pantalla completa */
          .fullscreen-mode {
            height: 100vh !important;
            justify-content: center !important;
            padding: 2rem 6rem 4rem 6rem !important;
          }
          
          .fullscreen-title {
            margin-bottom: 3rem !important;
            padding-top: 2rem !important;
          }
          
          .fullscreen-title h1 {
            font-size: 3rem !important;
            margin-bottom: 1rem !important;
          }
          
          .splide {
            padding: 0;
          }
          
          .splide__track {
            padding: 1rem 0;
          }
          
          .splide__slide {
            height: auto;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .splide__arrow {
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            border: 2px solid rgba(6, 182, 212, 0.6);
            color: white;
            width: 3rem;
            height: 3rem;
            border-radius: 50%;
            transition: all 0.3s ease;
            box-shadow: 0 0 20px rgba(6, 182, 212, 0.4);
            position: absolute;
            z-index: 10;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            top: 50%;
            transform: translateY(-50%);
          }
          
          .splide__arrow:hover {
            background: rgba(0, 0, 0, 0.9);
            border-color: rgba(6, 182, 212, 0.9);
            transform: translateY(-50%) scale(1.1);
            box-shadow: 0 0 30px rgba(6, 182, 212, 0.6);
          }
          
          .splide__arrow:disabled {
            opacity: 0.3;
            cursor: not-allowed;
            transform: translateY(-50%);
          }
          
          .splide__arrow--prev {
            left: -1.5rem;
          }
          
          .splide__arrow--next {
            right: -1.5rem;
          }
          
          .splide__pagination {
            bottom: -2rem;
            gap: 0.5rem;
          }
          
          .splide__pagination__page {
            background: rgba(107, 114, 128, 0.6);
            border-radius: 50%;
            width: 0.75rem;
            height: 0.75rem;
            transition: all 0.3s ease;
            border: 2px solid transparent;
          }
          
          .splide__pagination__page.is-active {
            background: #06b6d4;
            border-color: rgba(6, 182, 212, 0.8);
            transform: scale(1.2);
            box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
          }
          
          .splide__pagination__page:hover {
            background: rgba(107, 114, 128, 0.8);
            transform: scale(1.1);
          }
          
          .product-card {
            box-shadow: 0 0 15px rgba(6, 182, 212, 0.2), 0 0 30px rgba(6, 182, 212, 0.1);
            transition: all 0.3s ease;
            width: 100%;
            max-width: 320px;
            margin: 0 auto;
          }
          
          .product-card:hover {
            box-shadow: 0 0 25px rgba(6, 182, 212, 0.4), 0 0 50px rgba(6, 182, 212, 0.2), 0 0 75px rgba(6, 182, 212, 0.1);
            transform: translateY(-5px);
          }
          
          @media (max-width: 768px) {
            .splide__arrow {
              width: 2.5rem;
              height: 2.5rem;
            }
            
            .splide__arrow--prev {
              left: -1rem;
            }
            
            .splide__arrow--next {
              right: -1rem;
            }
          }
        `}</style>
        
        {/* Animaciones CSS personalizadas para el título futurista */}
        <style>{`
          @keyframes gradientShift {
            0%, 100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }
          
          @keyframes scan {
            0% {
              transform: translateX(-100%) skewX(-12deg);
              opacity: 0;
            }
            50% {
              opacity: 1;
            }
            100% {
              transform: translateX(100%) skewX(-12deg);
              opacity: 0;
            }
          }
          
          /* Efecto de brillo adicional para el título */
          .products-title h1 {
            text-shadow: 
              0 0 10px rgba(6, 182, 212, 0.5),
              0 0 20px rgba(6, 182, 212, 0.3),
              0 0 30px rgba(6, 182, 212, 0.2),
              0 0 40px rgba(147, 51, 234, 0.3),
              0 0 50px rgba(147, 51, 234, 0.2);
          }
          
          /* Efecto de parpadeo sutil */
          .products-title h1 span {
            animation: 
              gradientShift 3s ease-in-out infinite,
              subtleGlow 4s ease-in-out infinite;
          }
          
          @keyframes subtleGlow {
            0%, 100% {
              filter: brightness(1);
            }
            50% {
              filter: brightness(1.2);
            }
          }
        `}</style>
        
      </div>
    </section>
  );
}

export default ProductsPage;
