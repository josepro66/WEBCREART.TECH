import React from 'react'
import { motion } from 'framer-motion'
import ControllerViewer from '../components/3d/ControllerViewer'

const title = 'CUSTOM MIDI CONTROLLERS'

export default function HeroSection() {
  return (
    <section id="inicio" className="relative isolate min-h-screen overflow-hidden bg-dark-700 pt-24">
      <div className="absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-24 pt-10 sm:px-6 md:grid-cols-2 lg:px-8">
        <div>
          <h1 className="sr-only">Creart.Tech</h1>
          <div className="mb-6 flex flex-wrap gap-1 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            {title.split(' ').map((word, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx, duration: 0.5 }}
                className="mr-2"
              >
                {word}
              </motion.span>
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="max-w-xl text-base text-white/70 sm:text-lg"
          >
            Tecnología musical a tu medida. Diseña, construye y toca con control total.
          </motion.p>

          <motion.a
            href="#productos"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-8 inline-flex items-center justify-center rounded-full border border-cyan-400/60 bg-cyan-400/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-cyan-400/20"
          >
            Empezar
          </motion.a>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-10 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-fuchsia-500/20 blur-2xl" />
          {/* Badge futurista arriba del canvas */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="absolute -top-8 left-4 z-10"
          >
            <div className="relative inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-white/5 px-4 py-1.5 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
              <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-purple-300 bg-clip-text text-xs font-bold uppercase tracking-[0.2em] text-transparent">New Beato16</span>
              <span className="absolute -inset-0.5 -z-10 rounded-full opacity-30 blur-md" style={{ background: 'linear-gradient(90deg, rgba(0,245,255,.5), rgba(255,0,229,.4))' }} />
            </div>
          </motion.div>

          <div className="relative rounded-3xl border border-white/10 bg-black p-2 backdrop-blur-xl">
            <ControllerViewer className="h-[22rem] w-full sm:h-[26rem] md:h-[28rem]" transparent={true} />
          </div>
        </div>
      </div>
    </section>
  )
}


