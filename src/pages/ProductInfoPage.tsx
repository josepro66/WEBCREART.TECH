import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import ImageCarousel from '../components/ui/ImageCarousel';
import { ContainerScroll } from '../components/ui/container-scroll-animation';

interface Feature {
  title: string;
  description: string;
}

interface SpecSection {
  title: string;
  items: string[];
}

interface ProductInfoPageProps {
  name: string;
  subtitle?: string;
  viewer: React.ReactNode;
  /** Se conserva por compatibilidad — el glow ahora es uniforme de marca. */
  glowGradient?: string;
  description: string;
  secondDescription?: string;
  carouselTitle: string;
  carouselText: string;
  features: Feature[];
  specs: SpecSection[];
  price: string;
  productId: string;
  /** Se conserva por compatibilidad — el CTA ahora es el cyan de marca. */
  ctaGradient?: string;
}

/** Render de producto para el showcase del configurador (public/images/products). */
const PRODUCT_RENDERS: Record<string, string> = {
  beato: 'images/products/BEATO.png',
  beato8: 'images/products/BEATO.png',
  beato16: 'images/products/BEATO16.png',
  fado: 'images/products/FADO.png',
  knobo: 'images/products/KNOBO.png',
  loopo: 'images/products/LOOPO.png',
  mixo: 'images/products/MIXO.png',
};

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, delay },
});

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="inline-flex items-center gap-2.5 mb-4">
    <span className="w-2 h-2 rounded-[2px] bg-neon-cyan shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
    <span className="text-[10px] font-plexmono tracking-[0.28em] text-gray-500 uppercase">
      {children}
    </span>
  </div>
);

const ProductInfoPage: React.FC<ProductInfoPageProps> = ({
  name,
  subtitle,
  viewer,
  description,
  secondDescription,
  carouselTitle,
  carouselText,
  features,
  specs,
  price,
  productId,
}) => {
  const navigate = useNavigate();
  const base = import.meta.env.BASE_URL;
  const render = PRODUCT_RENDERS[productId.toLowerCase()];

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-white">
      <Navbar />

      {/* Atmósfera técnica compartida con el home */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(1000px 700px at 50% 10%, #15181D 0%, #0A0B0D 58%, #060708 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(140,160,185,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(140,160,185,0.05) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(1100px 750px at 50% 20%, rgba(0,0,0,0.9), transparent 82%)',
            WebkitMaskImage: 'radial-gradient(1100px 750px at 50% 20%, rgba(0,0,0,0.9), transparent 82%)',
          }}
        />
      </div>

      <section className="relative z-10 pt-28 pb-20 px-4">
        <div className="max-w-6xl mx-auto">

          {/* ── Encabezado ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center mb-10"
          >
            <Eyebrow>Ficha de producto · Hecho en Bogotá</Eyebrow>
            <h1 className="text-5xl md:text-7xl font-grotesk font-bold tracking-[-0.03em] text-white">
              {name}
            </h1>
            {subtitle && (
              <p className="text-lg md:text-xl text-gray-400 font-inter mt-3">{subtitle}</p>
            )}
          </motion.div>

          {/* ── Visor 3D + descripción ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="flex flex-col lg:flex-row items-center justify-between mb-10 gap-10"
          >
            <div className="relative w-full lg:w-1/2">
              <div className="pointer-events-none absolute -inset-8 rounded-3xl bg-neon-cyan/[0.05] blur-3xl" />
              <div className="relative rounded-2xl border border-white/[0.08] bg-[#0E1013]/60 p-2 backdrop-blur-xl">
                {viewer}
                <span className="absolute bottom-3 left-4 text-[9px] font-plexmono tracking-[0.22em] text-gray-600 uppercase">
                  Vista 3D · Arrastra para rotar
                </span>
              </div>
            </div>
            <div className="w-full lg:w-1/2">
              <p className="text-lg md:text-xl text-gray-300 font-inter leading-relaxed">{description}</p>
              {secondDescription && (
                <p className="text-base md:text-lg text-gray-500 font-inter leading-relaxed mt-5">
                  {secondDescription}
                </p>
              )}
              {/* CTA temprano: no obligar a llegar al fondo para comprar */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => navigate(`/configurator?product=${productId}`)}
                  className="group px-7 py-3.5 bg-neon-cyan text-black font-plexmono font-semibold text-[13px] tracking-[0.06em] rounded-md hover:bg-cyan-300 transition-colors duration-200 shadow-[0_0_28px_-8px_rgba(0,229,255,0.55)]"
                >
                  PERSONALIZAR {name}
                  <span className="inline-block ml-2 transition-transform duration-200 group-hover:translate-x-1">→</span>
                </button>
                <div>
                  <p className="text-2xl font-grotesk font-bold text-white leading-none">{price}</p>
                  <p className="text-[10px] font-plexmono text-gray-600 tracking-[0.14em] uppercase mt-1">
                    Reserva con USD $50
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Carrusel de fotos reales ── */}
          <motion.div
            {...fadeUp(0)}
            className="flex flex-col lg:flex-row items-center justify-between mb-20 gap-10"
          >
            <div className="w-full lg:w-1/2">
              <Eyebrow>Construcción</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-grotesk font-bold tracking-[-0.02em] text-white mb-5">
                {carouselTitle}
              </h2>
              <p className="text-base md:text-lg text-gray-400 font-inter leading-relaxed">{carouselText}</p>
            </div>
            <div className="w-full lg:w-1/2">
              <ImageCarousel className="w-full" />
            </div>
          </motion.div>

          {/* ── Features ── */}
          <motion.div {...fadeUp(0)} className="mb-20">
            <div className="text-center mb-10">
              <Eyebrow>Lo que incluye</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-grotesk font-bold tracking-[-0.02em] text-white">
                Características
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="bg-[#0E1013] p-6 rounded-xl border border-white/[0.08] hover:border-white/[0.22] transition-colors duration-300"
                >
                  <h3 className="text-base font-grotesk font-bold text-white mb-2">
                    <span className="text-neon-cyan mr-2">■</span>
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-400 font-inter leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Showcase configurador (render real del producto) ── */}
          {render && (
            <div className="-mx-4">
              <ContainerScroll
                titleComponent={
                  <div className="mb-4">
                    <span className="text-xs font-plexmono tracking-[0.2em] text-neon-cyan/70 uppercase mb-3 block">
                      Configurador 3D
                    </span>
                    <h2 className="text-3xl md:text-5xl font-grotesk font-bold tracking-[-0.02em] text-white leading-tight">
                      Diseña tu {name}<br />
                      <span className="text-neon-cyan">como tú lo imaginas</span>
                    </h2>
                    <p className="text-gray-400 text-base mt-4 max-w-xl mx-auto font-inter">
                      Elige los colores de chasis, botones y perillas en tiempo real. Lo fabricamos exactamente como lo diseñes.
                    </p>
                  </div>
                }
              >
                <div className="h-full w-full flex items-center justify-center bg-[#0E1013]">
                  <img
                    src={`${base}${render}`}
                    alt={`Controlador MIDI ${name} personalizable`}
                    className="max-h-full max-w-full object-contain p-8"
                    draggable={false}
                  />
                </div>
              </ContainerScroll>
            </div>
          )}

          {/* ── Especificaciones ── */}
          <motion.div
            {...fadeUp(0)}
            className="bg-[#0E1013] p-8 md:p-10 rounded-xl border border-white/[0.08] mb-20"
          >
            <div className="text-center mb-8">
              <Eyebrow>Ficha técnica</Eyebrow>
              <h2 className="text-3xl font-grotesk font-bold tracking-[-0.02em] text-white">
                Especificaciones
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-10">
              {specs.map((section) => (
                <div key={section.title}>
                  <h3 className="text-[11px] font-plexmono tracking-[0.22em] text-gray-500 uppercase mb-4 pb-3 border-b border-white/[0.07]">
                    {section.title}
                  </h3>
                  <ul className="space-y-2.5">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-gray-300 font-inter text-[15px]">
                        <span className="w-1.5 h-1.5 rounded-[1px] bg-neon-cyan mt-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── CTA final ── */}
          <motion.div {...fadeUp(0)} className="text-center">
            <Eyebrow>Reserva tu unidad</Eyebrow>
            <p className="text-5xl md:text-6xl font-grotesk font-bold tracking-[-0.02em] text-white">{price}</p>
            <p className="text-xs font-plexmono text-gray-600 tracking-[0.1em] mt-2 uppercase">
              Envío no incluido · Saldo restante al entregar
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 justify-center mt-8">
              <button
                onClick={() => navigate(`/configurator?product=${productId}`)}
                className="group px-8 py-3.5 bg-neon-cyan text-black font-plexmono font-semibold text-[13px] tracking-[0.06em] rounded-md hover:bg-cyan-300 transition-colors duration-200 shadow-[0_0_28px_-8px_rgba(0,229,255,0.55)]"
              >
                PERSONALIZAR {name}
                <span className="inline-block ml-2 transition-transform duration-200 group-hover:translate-x-1">→</span>
              </button>
              <button
                onClick={() => navigate('/#productos')}
                className="px-8 py-3.5 bg-transparent text-gray-300 font-plexmono text-[13px] tracking-[0.06em] rounded-md border border-white/[0.16] hover:border-white/40 hover:text-white transition-colors duration-200"
              >
                Ver todos los productos
              </button>
            </div>

            {/* Señales de confianza */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-10 pt-8 border-t border-white/[0.07] max-w-2xl mx-auto">
              {[
                'Reserva segura con PayPal',
                'Anticipo de solo USD $50',
                'Fabricado a mano en Bogotá',
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-2 text-[11px] font-plexmono text-gray-500 tracking-[0.1em] uppercase">
                  <svg className="w-3.5 h-3.5 text-neon-cyan" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  );
};

export default ProductInfoPage;
