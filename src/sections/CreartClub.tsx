import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Pencil, Wrench, Music, Settings, Star } from 'lucide-react'
import RadialOrbitalTimeline from '../components/ui/radial-orbital-timeline'

const clubTimeline = [
  {
    id: 1,
    title: 'Inscripción',
    date: 'Paso 1',
    content: 'Te registras en el taller presencial CREART.TECH en Bogotá. Recibes el kit de bienvenida con todo lo que necesitas.',
    category: 'Inicio',
    icon: Star,
    relatedIds: [2],
    status: 'completed' as const,
    energy: 100,
  },
  {
    id: 2,
    title: 'Diseña',
    date: 'Paso 2',
    content: 'Eliges el modelo, colores, botones y acabados de tu controlador en nuestro configurador 3D antes del taller.',
    category: 'Diseño',
    icon: Pencil,
    relatedIds: [1, 3],
    status: 'completed' as const,
    energy: 85,
  },
  {
    id: 3,
    title: 'Construye',
    date: 'Paso 3',
    content: 'Día del taller: ensamblaje, soldadura de componentes electrónicos y construcción paso a paso con nuestros mentores.',
    category: 'Construcción',
    icon: Wrench,
    relatedIds: [2, 4],
    status: 'in-progress' as const,
    energy: 60,
  },
  {
    id: 4,
    title: 'Programa',
    date: 'Paso 4',
    content: 'Configuramos juntos el firmware MIDI, asignamos controles y lo conectamos a Ableton Live 12 en tu computador.',
    category: 'Software',
    icon: Settings,
    relatedIds: [3, 5],
    status: 'pending' as const,
    energy: 35,
  },
  {
    id: 5,
    title: 'Toca',
    date: 'Paso 5',
    content: 'Te vas tocando lo que hiciste con tus propias manos. Incluye licencia oficial Ableton Live 12 Intro y soporte post-taller.',
    category: 'Producción',
    icon: Music,
    relatedIds: [4],
    status: 'pending' as const,
    energy: 15,
  },
]

const includes = [
  'Materiales y herramientas',
  'Licencia Ableton Live 12 Intro',
  'Café durante el taller',
  'Soporte post-taller',
]

const CreartClub: React.FC = () => {
  const navigate = useNavigate()

  return (
    <section className="relative min-h-screen md:h-screen w-full overflow-hidden flex items-center py-20 md:py-0">
      {/* Fondo global 21st.dev — sin override local */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-20 flex flex-col lg:flex-row items-center gap-0 h-full">

          {/* ── Columna izquierda: texto + CTA ── */}
          <div className="flex-1 flex flex-col justify-center lg:pr-10 text-center lg:text-left py-8 lg:py-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2.5 mb-5">
                <span className="w-2 h-2 rounded-[2px] bg-neon-cyan" />
                <span className="text-[10px] font-plexmono tracking-[0.28em] text-gray-500 uppercase">
                  03 · Experiencia presencial · Bogotá
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-grotesk font-bold tracking-[-0.02em] text-white mb-4 leading-tight">
                CREART<span className="text-neon-cyan">.TECH</span><br />CLUB
              </h2>
              <p className="text-sm md:text-base text-gray-400 font-inter max-w-md mx-auto lg:mx-0 leading-relaxed mb-8">
                Una experiencia inmersiva donde aprendes, diseñas, construyes y te vas
                tocando lo que hiciste tú mismo. Haz clic en cada nodo para ver el proceso.
              </p>

              {/* Qué incluye */}
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2 mb-8 max-w-sm mx-auto lg:mx-0">
                {includes.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-gray-300 font-inter">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-neon-cyan flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>

              <motion.button
                className="px-8 py-3.5 bg-neon-cyan text-black font-plexmono font-semibold text-[13px] tracking-[0.06em] rounded-md hover:bg-cyan-300 transition-colors duration-200 mx-auto lg:mx-0 block lg:inline-block"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/configurator')}
              >
                QUIERO PARTICIPAR →
              </motion.button>
            </motion.div>
          </div>

          {/* ── Columna derecha: Radial Orbital Timeline ── */}
          <motion.div
            className="flex-shrink-0 w-full lg:w-[52%] h-[420px] lg:h-full"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <RadialOrbitalTimeline timelineData={clubTimeline} />
          </motion.div>

        </div>
      </div>
    </section>
  )
}

export default CreartClub
