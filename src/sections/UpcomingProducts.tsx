import React from 'react'
import { motion } from 'framer-motion'

type ClubEvent = {
  id: string
  city: string
  country: string
  date: string
  tag: string
  description: string
  features: string[]
  accent: string
}

const events: ClubEvent[] = [
  {
    id: 'bogota',
    city: 'Bogotá',
    country: 'Colombia',
    date: 'Agosto 2026',
    tag: 'PRÓXIMO',
    description: 'Arma tu propio controlador MIDI o sintetizador en nuestro laboratorio. Materiales, herramientas y guía incluidos.',
    features: ['Materiales incluidos', 'Licencia Ableton Live', 'Café & snacks', 'Soporte post-taller'],
    accent: '#00E5FF',
  },
  {
    id: 'mexico',
    city: 'México',
    country: 'México',
    date: 'Octubre 2026',
    tag: 'PRÓXIMAMENTE',
    description: 'El CREART.TECH Club llega a México. Construye, programa y toca tu propio instrumento electrónico.',
    features: ['Taller presencial', 'Kit completo', 'Certificado', 'Comunidad CREART'],
    accent: '#FF9F43',
  },
]

function EventCard({ event, index }: { event: ClubEvent; index: number }) {
  return (
    <motion.div
      className="group relative flex flex-col rounded-xl border border-white/[0.08] bg-[#0E1013] overflow-hidden hover:border-white/[0.18] transition-colors duration-300"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: 'easeOut' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(480px 300px at 50% 32%, ${event.accent}12 0%, transparent 70%)` }}
      />

      <div className="relative z-20 flex items-center justify-between px-5 pt-4">
        <span
          className="px-2.5 py-1 text-[9px] font-plexmono font-semibold tracking-[0.2em] rounded"
          style={event.tag === 'PRÓXIMO'
            ? { background: event.accent, color: '#000' }
            : { color: '#9ca3af', border: '1px solid rgba(255,255,255,0.14)' }
          }
        >
          {event.tag}
        </span>
        <span className="text-[9px] font-plexmono tracking-[0.22em] text-gray-600 uppercase">
          {event.date}
        </span>
      </div>

      {/* Visual del evento */}
      <div className="relative z-10 h-48 sm:h-56 md:h-64 flex items-center justify-center px-6">
        <div className="text-center">
          <div
            className="text-5xl sm:text-6xl md:text-7xl font-grotesk font-black tracking-[-0.03em] leading-none"
            style={{ color: event.accent }}
          >
            {event.city}
          </div>
          <div className="text-sm font-plexmono tracking-[0.3em] text-gray-500 mt-2 uppercase">
            {event.country}
          </div>
        </div>
        {/* Glow decorativo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(300px 200px at 50% 60%, ${event.accent}15 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Info */}
      <div className="relative z-10 px-6 pb-5 pt-1 text-center border-t border-white/[0.06]">
        <p className="text-gray-400 text-sm font-inter mb-4 max-w-md mx-auto leading-relaxed mt-3">
          {event.description}
        </p>

        <div className="flex flex-wrap gap-1.5 justify-center mb-4">
          {event.features.map((f) => (
            <span
              key={f}
              className="px-2.5 py-1 bg-white/[0.03] text-gray-500 text-[10px] rounded font-plexmono border border-white/[0.06] tracking-wide"
            >
              {f}
            </span>
          ))}
        </div>

        <motion.button
          className="px-8 py-2.5 text-[13px] font-plexmono font-semibold tracking-[0.04em] rounded-md transition-colors duration-200"
          style={event.tag === 'PRÓXIMO'
            ? { background: event.accent, color: '#000' }
            : { background: 'transparent', color: '#d1d5db', border: '1px solid rgba(255,255,255,0.14)' }
          }
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => document.getElementById('club')?.scrollIntoView({ behavior: 'smooth' })}
        >
          {event.tag === 'PRÓXIMO' ? 'QUIERO PARTICIPAR →' : 'MÁS INFORMACIÓN'}
        </motion.button>
      </div>
    </motion.div>
  )
}

const UpcomingProducts: React.FC = () => {
  return (
    <section className="relative w-full flex items-center py-24 md:py-20">
      <div className="relative z-10 container mx-auto max-w-6xl px-4 md:px-8">
        <motion.div
          className="text-center mb-5 md:mb-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2.5 mb-4">
            <span className="w-2 h-2 rounded-[2px] bg-neon-cyan" />
            <span className="text-[10px] font-plexmono tracking-[0.28em] text-gray-500 uppercase">
              01 · Próximos eventos
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-grotesk font-bold tracking-[-0.02em] mb-1 text-white">
            Próximos{' '}
            <span className="text-neon-cyan">CREART.TECH</span>
          </h2>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-grotesk font-bold tracking-[-0.02em] mb-3 text-white">
            Club
          </h2>
          <p className="text-sm md:text-base text-gray-400 font-inter tracking-wide">
            Laboratorios presenciales donde armas tu propio controlador MIDI
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {events.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default UpcomingProducts
