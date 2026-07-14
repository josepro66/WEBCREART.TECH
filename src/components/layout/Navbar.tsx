import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

type NavItem = {
  label: string
  href: string
}

// Rutas absolutas (/#seccion) para que el navbar funcione también desde
// las páginas de producto y no solo desde el home.
const navItems: NavItem[] = [
  { label: 'Inicio', href: '/#inicio' },
  { label: 'Controladores MIDI', href: '/#productos' },
  { label: 'Club', href: '/#club' },
  { label: 'Galería', href: '/#galeria' },
  { label: 'Contacto', href: '/#contacto' },
]

export default function Navbar() {
  const [active, setActive] = useState<string>('Inicio')
  const [open, setOpen] = useState<boolean>(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = (user?.displayName || user?.email || '?')
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  const handleLogout = async () => {
    try { await signOut() } catch { /* */ }
    setUserMenuOpen(false)
    navigate('/')
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={{
            backgroundColor: scrolled ? 'rgba(9,10,12,0.92)' : 'rgba(10,11,13,0.55)',
            borderColor: scrolled ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.06)',
            boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.55)' : 'none',
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="mt-3 flex items-center justify-between rounded-xl border px-4 py-3 backdrop-blur-xl">
          <a href="/#inicio" className="flex items-center gap-2.5">
            <img src={`${import.meta.env.BASE_URL}images/logo-ce.png`} alt="CREART.TECH" className="h-7 w-auto brightness-0 invert opacity-90" />
            <span className="text-[13px] font-plexmono font-semibold tracking-[0.18em] text-white/90 uppercase">Creart.Tech</span>
            <span className="hidden sm:inline text-[9px] font-plexmono tracking-[0.2em] text-white/30 uppercase border border-white/10 rounded-[3px] px-1.5 py-0.5">BOG</span>
          </a>

          <nav className="hidden gap-6 md:flex">
            {navItems.map((item) => (
              <motion.a
                key={item.label}
                href={item.href}
                onMouseEnter={() => setActive(item.label)}
                className="relative text-[13px] text-white/70 transition-colors hover:text-white"
                whileTap={{ scale: 0.98 }}
              >
                {item.label}
                {active === item.label && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-2 left-0 right-0 h-px bg-neon-cyan"
                  />
                )}
              </motion.a>
            ))}
            <Link
              to="/editor"
              className="relative text-[13px] text-cyan-300/80 transition-colors hover:text-cyan-200"
            >
              Editor
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div ref={userMenuRef} className="relative hidden md:block">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-white/5 px-3 py-1.5 text-sm text-white/90 hover:border-cyan-400/60 transition"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 text-xs font-bold">
                    {initials || 'U'}
                  </span>
                  <span className="max-w-[120px] truncate">{user.displayName || user.email}</span>
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-56 rounded-xl border border-white/10 bg-[#0B0B16]/95 p-2 backdrop-blur-xl shadow-xl"
                    >
                      <div className="px-3 py-2 border-b border-white/10 mb-1">
                        <p className="text-xs text-white/60 truncate">{user.email}</p>
                        {!user.emailVerified && user.providerData[0]?.providerId === 'password' && (
                          <p className="text-[10px] text-amber-300 mt-1">⚠ Email sin verificar</p>
                        )}
                      </div>
                      <Link
                        to="/mis-configuraciones"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-3 py-2 rounded-lg text-sm text-white/90 hover:bg-white/5"
                      >
                        Mis configuraciones
                      </Link>
                      <Link
                        to="/configurator"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-3 py-2 rounded-lg text-sm text-white/90 hover:bg-white/5"
                      >
                        Crear nueva
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-500/10"
                      >
                        Cerrar sesión
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/configurator"
                className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono text-white/70 hover:border-cyan-500/40 hover:text-white/90 transition-all duration-200"
              >
                Iniciar sesión
              </Link>
            )}

            <motion.a
              href="/configurator"
              className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-neon-cyan px-4 py-1.5 text-xs font-plexmono font-semibold tracking-[0.05em] text-black hover:bg-cyan-300 transition-colors duration-200"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              PERSONALIZAR →
            </motion.a>

            <button
              aria-label="Abrir menú"
              aria-expanded={open}
              className="md:hidden text-white/70 hover:text-white transition-colors"
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              key="overlay"
              aria-label="Cerrar menú"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
            />

            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25 }}
              className="fixed right-0 top-0 z-50 h-full w-72 border-l border-white/10 bg-[#0B0B16]/95 p-6 backdrop-blur-xl md:hidden"
              onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
              role="dialog"
              aria-modal="true"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-sm font-semibold tracking-widest text-white/90">Menú</span>
                <button aria-label="Cerrar" className="text-white/80 hover:text-white" onClick={() => setOpen(false)}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {user && (
                <div className="mb-4 rounded-lg border border-cyan-500/20 bg-white/5 p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 text-sm font-bold">
                      {initials || 'U'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user.displayName || 'Usuario'}</p>
                      <p className="text-xs text-white/60 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <nav className="flex flex-col gap-2">
                {navItems.map((item, idx) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-base text-white/90 hover:bg-white/5"
                    tabIndex={0}
                    autoFocus={idx === 0}
                  >
                    {item.label}
                  </a>
                ))}

                <Link
                  to="/editor"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base text-cyan-300 hover:bg-white/5"
                >
                  Editor
                </Link>

                <div className="my-2 border-t border-white/10" />

                {user ? (
                  <>
                    <Link
                      to="/mis-configuraciones"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-3 text-base text-cyan-300 hover:bg-white/5"
                    >
                      Mis configuraciones
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setOpen(false) }}
                      className="rounded-lg px-3 py-3 text-base text-red-300 text-left hover:bg-red-500/10"
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <Link
                    to="/configurator"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-base text-cyan-300 hover:bg-white/5"
                  >
                    Iniciar sesión
                  </Link>
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
