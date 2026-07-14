import React from 'react'
import { motion } from 'framer-motion'

const SocialLinks = [
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/creart.tech',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@creart.tech',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    href: 'https://www.tiktok.com/@creart.tech',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
]

const navLinks = {
  productos: [
    { name: 'Wavo', href: '/wavoinfo' },
    { name: 'Beato 16', href: '/beato16info' },
    { name: 'Beato 8', href: '/beato8info' },
    { name: 'Mixo', href: '/mixoinfo' },
    { name: 'Fado', href: '/fadoinfo' },
    { name: 'Loopo', href: '/loopoinfo' },
    { name: 'Knobo', href: '/knoboinfo' },
  ],
  empresa: [
    { name: 'Acerca de', href: '#' },
    { name: 'Galería', href: '#galeria' },
    { name: 'Contacto', href: '#contacto' },
  ],
}

const Footer: React.FC = () => {
  return (
    <footer className="relative w-full h-full flex flex-col justify-center border-t border-white/[0.06] overflow-hidden">
      {/* Fondo global 21st.dev — sin override local */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-center px-6 py-12 max-w-7xl mx-auto w-full">

        {/* ── Fila superior: marca + columnas ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

          {/* Marca */}
          <motion.div
            className="col-span-2 md:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="flex items-center gap-2.5 mb-3">
              <img src={`${import.meta.env.BASE_URL}images/logo-ce.png`} alt="CREART.TECH" className="h-7 w-auto brightness-0 invert opacity-90" />
              <span className="text-lg font-plexmono font-semibold tracking-[0.18em] text-white uppercase">Creart.Tech</span>
            </h3>
            <p className="text-gray-400 text-sm font-inter leading-relaxed mb-3">
              Fábrica de tecnología musical.
            </p>
            <p className="text-gray-500 text-xs font-inter flex items-center gap-1.5 mb-5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,245,255,0.8)]" />
              Bogotá D.C, Colombia
            </p>
            {/* Redes sociales */}
            <div className="flex gap-3">
              {SocialLinks.map((s) => (
                <motion.a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="w-9 h-9 rounded-md border border-white/[0.12] bg-white/[0.03] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/40 transition-all duration-200"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {s.icon}
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Productos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h4 className="text-[11px] font-plexmono font-semibold text-gray-500 mb-3 tracking-[0.24em] uppercase">Productos</h4>
            <ul className="space-y-2">
              {navLinks.productos.map((p) => (
                <li key={p.name}>
                  <a href={p.href} className="text-gray-400 hover:text-cyan-400 transition-colors duration-200 text-sm font-inter">
                    {p.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Empresa */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h4 className="text-[11px] font-plexmono font-semibold text-gray-500 mb-3 tracking-[0.24em] uppercase">Empresa</h4>
            <ul className="space-y-2">
              {navLinks.empresa.map((e) => (
                <li key={e.name}>
                  <a href={e.href} className="text-gray-400 hover:text-cyan-400 transition-colors duration-200 text-sm font-inter">
                    {e.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Newsletter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h4 className="text-[11px] font-plexmono font-semibold text-gray-500 mb-3 tracking-[0.24em] uppercase">Novedades</h4>
            <p className="text-gray-400 text-xs font-inter mb-3 leading-relaxed">
              Lanzamientos, prototipos y proceso de fabricación — lo publicamos primero en Instagram.
            </p>
            <div className="flex flex-col gap-2">
              <motion.a
                href="https://www.instagram.com/creart.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-neon-cyan text-black text-[11px] font-semibold rounded-md font-plexmono tracking-[0.08em] hover:bg-cyan-300 transition-colors duration-200 text-center"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                SEGUIR @CREART.TECH →
              </motion.a>
              <a
                href="mailto:info@crearttech.com"
                className="w-full py-2.5 bg-transparent text-gray-400 text-[11px] font-plexmono tracking-[0.08em] rounded-md border border-white/[0.12] hover:border-white/30 hover:text-white transition-colors duration-200 text-center"
              >
                info@crearttech.com
              </a>
            </div>
          </motion.div>
        </div>

        {/* ── Separador ── */}
        <div className="border-t border-white/10 mb-5" />

        {/* ── Barra inferior ── */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-gray-500 text-xs font-plexmono tracking-[0.04em]">
            © 2026 CREART.TECH — Bogotá, Colombia
          </p>
          <div className="flex gap-5 text-xs">
            {['Privacidad', 'Términos', 'Cookies'].map((l) => (
              <a key={l} href="#" className="text-gray-500 hover:text-cyan-400 transition-colors duration-200 font-inter">
                {l}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  )
}

export default Footer
