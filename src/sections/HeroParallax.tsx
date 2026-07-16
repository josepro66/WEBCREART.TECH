import React, { useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import ParticlesBackground from '../components/3d/ParticlesBackground'

export default function HeroParallax() {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, 300], [1, 0.2])
  const y = useTransform(scrollY, [0, 300], [0, -80])

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <section id="inicio" className="relative min-h-[92vh] overflow-hidden bg-gradient-to-b from-[#07070D] via-[#0A0A1A] to-[#141427] pt-24">
      {mounted && <ParticlesBackground />}

      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(0,245,255,0.12),transparent_60%)]" />
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <motion.h1
          style={{ opacity, y }}
          className="bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-purple-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl md:text-7xl"
        >
          Control Futurista, Música Real
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 max-w-2xl text-white/75"
        >
          Diseña y construye tus controladores MIDI. Tecnología boutique con estética cyberpunk.
        </motion.p>
        <motion.a
          href="#productos"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          className="neon-ring mt-8 inline-flex items-center rounded-full border border-cyan-400/60 bg-cyan-400/10 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-400/20"
        >
          Explorar productos
        </motion.a>
      </div>
    </section>
  )
}



