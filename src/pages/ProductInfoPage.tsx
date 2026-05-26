import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import ImageCarousel from '../components/ui/ImageCarousel';

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
  glowGradient: string;
  description: string;
  secondDescription?: string;
  carouselTitle: string;
  carouselText: string;
  features: Feature[];
  specs: SpecSection[];
  price: string;
  productId: string;
  ctaGradient: string;
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay },
});

const ProductInfoPage: React.FC<ProductInfoPageProps> = ({
  name,
  subtitle,
  viewer,
  glowGradient,
  description,
  secondDescription,
  carouselTitle,
  carouselText,
  features,
  specs,
  price,
  productId,
  ctaGradient,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <header className="relative z-10 p-4">
        <Link
          to="/"
          className="inline-flex items-center text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver al inicio
        </Link>
      </header>

      <section className="relative pb-20 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Title */}
          <motion.div {...fadeUp(0)} className="text-center mb-8">
            <h1
              className="text-7xl font-bold tracking-wider font-chakra bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300 ease-in-out hover:tracking-widest hover:scale-105"
              style={{ textShadow: '0 0 15px rgba(6, 182, 212, 0.5), 0 0 25px rgba(192, 38, 211, 0.3)' }}
            >
              {name}
            </h1>
            {subtitle && (
              <p className="text-xl text-gray-300 font-gotham mt-2">{subtitle}</p>
            )}
          </motion.div>

          {/* 3D Viewer + Description */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-8"
          >
            <div className="relative w-full lg:w-1/2">
              <div className={`pointer-events-none absolute -inset-10 rounded-3xl bg-gradient-to-tr ${glowGradient} blur-2xl`} />
              <div className="relative rounded-3xl border border-white/10 bg-transparent p-2 backdrop-blur-xl">
                {viewer}
              </div>
            </div>
            <div className="w-full lg:w-1/2">
              <p className="text-xl text-gray-300 font-gotham leading-relaxed">{description}</p>
            </div>
          </motion.div>

          {/* Optional second description */}
          {secondDescription && (
            <motion.div {...fadeUp(0.6)} className="text-center mb-16">
              <div className="max-w-4xl mx-auto">
                <p className="text-xl text-gray-300 font-gotham leading-relaxed">{secondDescription}</p>
              </div>
            </motion.div>
          )}

          {/* Carousel Section */}
          <motion.div
            {...fadeUp(0.8)}
            className="flex flex-col lg:flex-row items-center justify-between mb-16 gap-8"
          >
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl font-bold mb-6 text-cyan-400">{carouselTitle}</h2>
              <p className="text-xl text-gray-300 font-gotham leading-relaxed">{carouselText}</p>
            </div>
            <div className="w-full lg:w-1/2">
              <ImageCarousel className="w-full" />
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div {...fadeUp(1.0)} className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {features.map((f) => (
              <div key={f.title} className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-cyan-500/20">
                <h3 className="text-xl font-bold text-cyan-400 mb-3">{f.title}</h3>
                <p className="text-gray-300">{f.description}</p>
              </div>
            ))}
          </motion.div>

          {/* Specs */}
          <motion.div {...fadeUp(1.2)} className="bg-gray-800/30 backdrop-blur-sm p-8 rounded-lg border border-cyan-500/20 mb-16">
            <h2 className="text-3xl font-bold text-center mb-8 text-cyan-400">Especificaciones Técnicas</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {specs.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xl font-semibold mb-4 text-cyan-300">{section.title}</h3>
                  <ul className="space-y-2 text-gray-300">
                    {section.items.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div {...fadeUp(1.4)} className="text-center">
            <div className="mb-6">
              <p className="text-5xl font-bold text-white">{price}</p>
              <p className="text-sm text-gray-400 mt-1">(El envío no está incluido en el precio)</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                className={`px-8 py-4 bg-gradient-to-r ${ctaGradient} text-white font-semibold rounded-full hover:scale-105 transition-all duration-300 shadow-lg`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/configurator?product=${productId}`)}
              >
                Configurar {name}
              </motion.button>
              <motion.button
                className="px-8 py-4 bg-gray-800/50 backdrop-blur-sm text-white font-semibold rounded-full border border-cyan-500/50 hover:border-cyan-400 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/#productos')}
              >
                Ver todos los productos
              </motion.button>
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  );
};

export default ProductInfoPage;
