import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const Newbeato16: React.FC = () => {
  const navigate = useNavigate()

  return (
    <section className="relative h-screen w-full">
      {/* Fondo semi-transparente */}
      <div className="absolute inset-0 bg-black/60 z-[1]" />

      {/* Background imagen */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-[2]"
        style={{ backgroundImage: `url('${import.meta.env.BASE_URL}images/fondonewbeato16.png')` }}
      />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-start pt-9 px-4 z-[3]">
        {/* Title */}
        <motion.div
          className="mb-2 text-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <img
            src={`${import.meta.env.BASE_URL}images/titulobeato16.png`}
            alt="NEW BEATO16"
            className="max-w-full h-auto mx-auto"
            style={{ maxHeight: '120px' }}
          />
        </motion.div>

        {/* Imagen del producto */}
        <div className="w-full h-[400px] md:h-[600px] relative flex items-center justify-center -mt-24">
          <img
            src={`${import.meta.env.BASE_URL}images/beato16.png`}
            alt="BEATO16 Controlador MIDI"
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Product Info */}
        <motion.div
          className="-mt-32 text-center max-w-2xl beato16-text"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <p className="text-lg text-gray-300 mb-3 font-inter">
            El nuevo Beato16: más control que nunca
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center beato16-buttons">
            <motion.button
              className="px-6 py-3 bg-gray-800/50 backdrop-blur-sm text-white font-semibold rounded-full border border-cyan-500/50 hover:border-cyan-400 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/beato16info')}
            >
              MÁS INFORMACIÓN
            </motion.button>

            <motion.button
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-semibold rounded-full hover:scale-105 transition-all duration-300 shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/configurator?product=beato16')}
            >
              Configurar BEATO16
            </motion.button>
          </div>
        </motion.div>

      </div>
    </section>
  )
}

export default Newbeato16