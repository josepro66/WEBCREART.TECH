import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import ProductModelViewer from '../components/3d/ProductModelViewer'

type Featured = {
  id: string
  name: string
  tag: string
  description: string
  model: string
  infoRoute: string
}

const featured: Featured[] = [
  {
    id: 'beato16',
    name: 'BEATO16',
    tag: 'NUEVO',
    description: 'Nuestro controlador MIDI más avanzado: 16 botones RGB, 4 faders y 4 knobs asignables.',
    model: `${import.meta.env.BASE_URL}models/BEATO16.glb`,
    infoRoute: '/beato16info',
  },
  {
    id: 'wavo',
    name: 'WAVO',
    tag: 'PRÓXIMAMENTE',
    description: 'Sintetizador híbrido analógico-digital con secuenciador, teclado y 7 knobs.',
    model: `${import.meta.env.BASE_URL}models/wavo.glb`,
    infoRoute: '/wavoinfo',
  },
]

function FeaturedCard({ product, index }: { product: Featured; index: number }) {
  const navigate = useNavigate()

  return (
    <motion.div
      className="group relative flex flex-col rounded-xl border border-white/[0.08] bg-[#0E1013] overflow-hidden hover:border-white/[0.18] transition-colors duration-300"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: 'easeOut' }}
    >
      {/* Luz de vitrina sobre el render */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(480px 300px at 50% 32%, rgba(255,255,255,0.045) 0%, transparent 70%)' }}
      />

      {/* Cabecera técnica de la ficha */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-4">
        <span className={`px-2.5 py-1 text-[9px] font-plexmono font-semibold tracking-[0.2em] rounded ${
          product.tag === 'NUEVO'
            ? 'bg-neon-cyan text-black'
            : 'text-gray-400 border border-white/[0.14]'
        }`}>
          {product.tag}
        </span>
        <span className="text-[9px] font-plexmono tracking-[0.22em] text-gray-600 uppercase">
          {String(index + 1).padStart(2, '0')} / Render 3D
        </span>
      </div>

      {/* Visor 3D interactivo */}
      <div className="relative z-10">
        <ProductModelViewer
          modelUrl={product.model}
          className="h-56 sm:h-72 md:h-80 w-full"
        />
      </div>

      {/* Info */}
      <div className="relative z-10 px-6 pb-6 pt-2 text-center border-t border-white/[0.06]">
        <h3 className="text-2xl md:text-3xl font-grotesk font-bold tracking-[-0.02em] text-white mb-2 mt-4">
          {product.name}
        </h3>
        <p className="text-gray-400 text-sm md:text-base font-inter mb-5 max-w-md mx-auto leading-relaxed">
          {product.description}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            className="px-6 py-2.5 bg-transparent text-gray-300 text-[13px] font-plexmono tracking-[0.04em] rounded-md border border-white/[0.14] hover:border-white/40 hover:text-white transition-colors duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(product.infoRoute)}
          >
            Más información
          </motion.button>
          <motion.button
            className="px-6 py-2.5 bg-neon-cyan text-black text-[13px] font-plexmono font-semibold tracking-[0.04em] rounded-md hover:bg-cyan-300 transition-colors duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/configurator?product=${product.id}`)}
          >
            Personalizar →
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

const UpcomingProducts: React.FC = () => {
  return (
    <section className="relative min-h-screen md:h-screen w-full overflow-hidden flex items-center py-24 md:py-0 md:pt-20">
      {/* Fondo global 21st.dev — sin override local */}

      {/* Contenido */}
      <div className="relative z-10 container mx-auto max-w-6xl px-4 md:px-8">
        <motion.div
          className="text-center mb-6 md:mb-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2.5 mb-4">
            <span className="w-2 h-2 rounded-[2px] bg-neon-cyan" />
            <span className="text-[10px] font-plexmono tracking-[0.28em] text-gray-500 uppercase">
              01 · Próximos lanzamientos
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-grotesk font-bold tracking-[-0.02em] mb-3 text-white">
            Próximos
          </h2>
          <p className="text-sm md:text-base text-gray-400 font-inter tracking-wide">
            Lo nuevo de CREART.TECH — gíralos, son 3D
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {featured.map((product, i) => (
            <FeaturedCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default UpcomingProducts
