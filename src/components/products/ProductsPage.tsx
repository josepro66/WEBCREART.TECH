import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/splide/dist/css/splide.min.css';

// Datos de productos — precios reales del sitio en vivo (COP) + equivalente USD
const products = [
  {
    id: 'knobo',
    name: 'KNOBO',
    category: 'controlador',
    description: '8 perillas asignables para un control preciso y creativo.',
    image: `${import.meta.env.BASE_URL}images/products/KNOBO.png`,
    model: `${import.meta.env.BASE_URL}models/KNOBO.glb`,
    features: ['8 knobs asignables', 'Cuerpo de metal', 'OLED display', 'USB-C'],
    priceCop: 'COP 450.000',
    priceUsd: '~$113'
  },
  {
    id: 'loopo',
    name: 'LOOPO',
    category: 'controlador',
    description: 'Pedal looper con 4 footswitches y 4 knobs para directo y estudio.',
    image: `${import.meta.env.BASE_URL}images/products/LOOPO.png`,
    model: `${import.meta.env.BASE_URL}models/LOOPO.glb`,
    features: ['4 footswitches', '4 knobs asignables', 'Control de loops', 'Fácil de integrar'],
    priceCop: 'COP 500.000',
    priceUsd: '~$125'
  },
  {
    id: 'fado',
    name: 'FADO',
    category: 'controlador',
    description: 'Controlador MIDI minimalista con enfoque en la creatividad',
    image: `${import.meta.env.BASE_URL}images/products/FADO.png`,
    model: `${import.meta.env.BASE_URL}models/FADO.glb`,
    features: ['8 Faders de Precisión', 'USB-C'],
    priceCop: 'COP 650.000',
    priceUsd: '~$163'
  },
  {
    id: 'beato',
    name: 'BEATO 8',
    category: 'controlador',
    description: 'Controlador MIDI con cuerpo metálico y 8 botones ARCADE para productores',
    image: `${import.meta.env.BASE_URL}images/products/BEATO.png`,
    model: `${import.meta.env.BASE_URL}models/BEATO.glb`,
    features: ['Cuerpo metálico', '8 botones ARCADE', '4 knobs asignables', 'USB-C'],
    priceCop: 'COP 750.000',
    priceUsd: '~$188'
  },
  {
    id: 'mixo',
    name: 'MIXO',
    category: 'controlador',
    description: 'Controlador de mezcla profesional para DJs',
    image: `${import.meta.env.BASE_URL}images/products/MIXO.png`,
    model: `${import.meta.env.BASE_URL}models/MIXO.glb`,
    features: ['4 LED arcade', '4 knobs asignables', '4 faders', 'Cuerpo de metal'],
    priceCop: 'COP 850.000',
    priceUsd: '~$213'
  },
  {
    id: 'beato16',
    name: 'BEATO 16',
    category: 'controlador',
    description: 'Nuestro controlador MIDI más avanzado con tecnología de última generación',
    image: `${import.meta.env.BASE_URL}images/products/BEATO16.png`,
    model: `${import.meta.env.BASE_URL}models/BEATO16.glb`,
    features: ['16 Botones RGB', '4 Faders', '4 Knobs', 'USB-C'],
    priceCop: 'COP 1.000.000',
    priceUsd: '~$250'
  },
  {
    id: 'wavo',
    name: 'WAVO',
    category: 'sintetizador',
    description: 'Sintetizador híbrido analógico-digital con secuenciador y teclado',
    image: `${import.meta.env.BASE_URL}textures/wavo.png`,
    model: `${import.meta.env.BASE_URL}models/wavo.glb`,
    features: ['Teclado personalizable', '7 Botones Arcade', '7 Knobs', 'Secuenciador'],
    priceCop: 'COP 2.000.000',
    priceUsd: '~$500'
  }
];

// Tarjeta de producto — estilo 21st.dev: shine sweep, top accent, category badge
function ProductCard({ product, onDetails, onBuy }: { product: typeof products[0]; onDetails: (id: string) => void; onBuy: (id: string) => void }) {
  const categoryLabel = product.category === 'sintetizador' ? 'SINTE' : 'MIDI';

  return (
    <motion.div
      className="group relative flex flex-col w-80 max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition-all duration-300 hover:border-white/[0.18] product-card overflow-hidden"
      initial={{ opacity: 0, rotateX: 18, y: 30 }}
      whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
      whileHover={{ y: -5, scale: 1.01 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.65, ease: 'easeOut' }}
      style={{ transformPerspective: 900 }}
    >
      {/* Top accent line — aparece al hover */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Category badge — top right */}
      <div className="absolute top-4 right-4 z-10">
        <span className="px-2 py-0.5 rounded text-[9px] font-mono tracking-widest uppercase border border-white/[0.08] bg-white/[0.04] text-gray-600">
          {categoryLabel}
        </span>
      </div>

      {/* Imagen del producto */}
      <div className="relative h-40 mb-3 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center">
        <img
          src={product.image}
          alt={product.name}
          className="relative z-10 max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gradient fade at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/50 to-transparent pointer-events-none z-20" />
      </div>

      {/* Información del producto */}
      <div className="flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-lg font-grotesk font-bold tracking-[-0.01em] text-white">{product.name}</h3>
          <div className="text-right whitespace-nowrap">
            <div className="text-sm font-mono font-bold text-neon-cyan leading-none">{product.priceCop}</div>
            <div className="text-[10px] text-gray-600 font-mono mt-0.5">{product.priceUsd} USD</div>
          </div>
        </div>
        <p className="text-gray-500 text-xs leading-relaxed mb-3 font-inter">{product.description}</p>

        {/* Características — chips mono estilo 21st.dev */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {product.features.map((feature, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-white/[0.03] text-gray-500 text-[10px] rounded font-mono border border-white/[0.06] tracking-wide"
            >
              {feature}
            </span>
          ))}
        </div>

        {/* Botones */}
        <div className="flex gap-2 mt-auto">
          <button
            className="flex-1 px-4 py-2.5 bg-transparent text-gray-300 font-plexmono rounded-md border border-white/[0.14] text-[11px] tracking-[0.04em] hover:border-white/40 hover:text-white transition-colors duration-200"
            onClick={() => onDetails(product.id)}
          >
            Más info
          </button>
          <button
            className="flex-1 px-4 py-2.5 bg-neon-cyan text-black font-semibold rounded-md text-[11px] tracking-[0.04em] hover:bg-cyan-300 transition-colors duration-200 font-plexmono"
            onClick={() => onBuy(product.id)}
          >
            Personalizar →
          </button>
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
type Filter = 'todos' | 'controlador' | 'sintetizador';

function ProductsPage() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [filter, setFilter] = React.useState<Filter>('todos');

  const visibleProducts = filter === 'todos'
    ? products
    : products.filter((p) => p.category === filter);

  const filterTabs: { id: Filter; label: string; count: number }[] = [
    { id: 'todos', label: 'Todos', count: products.length },
    { id: 'controlador', label: 'Controladores MIDI', count: products.filter(p => p.category === 'controlador').length },
    { id: 'sintetizador', label: 'Sintetizadores', count: products.filter(p => p.category === 'sintetizador').length },
  ];

  const handleDetails = (id: string) => {
    navigate(productRoutes[id] ?? `/configurator?product=${id}`);
  };

  const handleBuy = (id: string) => {
    navigate(`/configurator?product=${id}`);
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
      className="section-snap relative w-full flex flex-col items-center"
      style={{ minHeight: '100vh', justifyContent: isFullscreen ? 'center' : 'flex-start' }}
    >
      {/* Sin fondo local — el fondo global de 21st.dev (App.tsx) se ve a través */}

      {/* Contenido principal */}
      <div
        className="relative flex flex-col container mx-auto px-6 overflow-visible w-full items-center"
        style={{
          zIndex: 10,
          maxWidth: '100%',
          paddingTop: isFullscreen ? '0' : '4rem',
          paddingBottom: isFullscreen ? '0' : '4rem',
          justifyContent: isFullscreen ? 'center' : 'flex-start',
        }}
      >
        {/* Header limpio */}
        <motion.div
          className="text-center products-title mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2.5 mb-3">
            <span className="w-2 h-2 rounded-[2px] bg-neon-cyan" />
            <span className="text-[10px] font-plexmono tracking-[0.28em] text-gray-500 uppercase">
              02 · Catálogo
            </span>
          </div>
          <h2
            className="font-grotesk font-bold tracking-[-0.02em] text-white mb-2"
            style={{ fontSize: isFullscreen ? '2.75rem' : '2rem' }}
          >
            Nuestros <span className="text-neon-cyan">productos</span>
          </h2>
          <p className="text-sm md:text-base text-gray-400 font-inter">
            Diseña, construye y usa tu controlador MIDI o sintetizador a tu manera
          </p>

          {/* Filtros de categoría con conteos — estilo 21st.dev */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-mono tracking-wide transition-all duration-300 flex items-center gap-1.5 ${
                  filter === tab.id
                    ? 'bg-neon-cyan text-black font-bold'
                    : 'bg-white/[0.04] text-gray-500 border border-white/[0.08] hover:text-white hover:border-white/20'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] ${filter === tab.id ? 'text-black/60' : 'text-gray-700'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Carrusel */}
        <div
          className="flex items-center justify-center splide-container w-full"
          style={{ maxWidth: '100%', flex: isFullscreen ? '1' : '0 1 auto' }}
        >
          <div className="w-full" style={{ maxWidth: isFullscreen ? '100%' : '80rem' }}>
            <Splide
              key={filter}
              options={{
                type: 'slide',
                perPage: 3,
                gap: '1.5rem',
                padding: '1rem',
                arrows: visibleProducts.length > 3,
                pagination: true,
                autoplay: false,
                drag: true,
                keyboard: true,
                breakpoints: {
                  1024: { perPage: 2, gap: '1.5rem' },
                  768: { perPage: 1, gap: '1rem' }
                }
              }}
              className="splide"
            >
              {visibleProducts.map((product) => (
                <SplideSlide key={product.id}>
                  <div className="flex justify-center h-full py-2">
                    <ProductCard product={product} onDetails={handleDetails} onBuy={handleBuy} />
                  </div>
                </SplideSlide>
              ))}
            </Splide>
          </div>
        </div>

        {/* Estilos del carrusel */}
        <style>{`
          /* Shine sweep — 21st.dev card hover effect */
          .product-card::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 1rem;
            background: linear-gradient(
              105deg,
              transparent 35%,
              rgba(255,255,255,0.04) 50%,
              transparent 65%
            );
            transform: translateX(-100%) skewX(-12deg);
            pointer-events: none;
            z-index: 1;
          }
          .product-card:hover::before {
            transform: translateX(200%) skewX(-12deg);
            transition: transform 0.75s ease;
          }
          .splide { padding: 0; }
          .splide__track { padding: 0.5rem 0; }
          .splide__slide {
            height: auto;
            display: flex;
            align-items: stretch;
            justify-content: center;
          }
          .splide__arrow {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: white;
            width: 2.75rem;
            height: 2.75rem;
            border-radius: 50%;
            transition: all 0.3s ease;
            position: absolute;
            z-index: 10;
            top: 50%;
            transform: translateY(-50%);
          }
          .splide__arrow:hover {
            border-color: rgba(0, 229, 255, 0.6);
            background: rgba(0, 229, 255, 0.1);
            transform: translateY(-50%) scale(1.05);
          }
          .splide__arrow:disabled { opacity: 0.25; }
          .splide__arrow svg { fill: white; }
          .splide__arrow--prev { left: -1.25rem; }
          .splide__arrow--next { right: -1.25rem; }
          .splide__pagination { bottom: -2rem; gap: 0.5rem; }
          .splide__pagination__page {
            background: rgba(255, 255, 255, 0.25);
            border-radius: 9999px;
            width: 0.5rem;
            height: 0.5rem;
            transition: all 0.3s ease;
            margin: 0;
          }
          .splide__pagination__page.is-active {
            background: #00E5FF;
            width: 1.5rem;
            transform: none;
          }
          :fullscreen { background: #05060A !important; }
          @media (max-width: 768px) {
            .splide__arrow { width: 2.5rem; height: 2.5rem; }
            .splide__arrow--prev { left: -0.5rem; }
            .splide__arrow--next { right: -0.5rem; }
          }
        `}</style>
      </div>
    </section>
  );
}

export default ProductsPage;
