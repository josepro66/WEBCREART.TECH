import React from 'react'
import { motion } from 'framer-motion'
import { Splide, SplideSlide } from '@splidejs/react-splide'
import '@splidejs/splide/dist/css/splide.min.css'

const INSTAGRAM_URL = 'https://www.instagram.com/creart.tech'

// Renders reales de producto (public/images/products) — cada tarjeta
// enlaza al post de Instagram correspondiente.
const posts = [
  { id: 'DXXRR80Cb3F', img: 'images/products/BEATO.png',   name: 'BEATO 8' },
  { id: 'DOJHElJjJ88', img: 'images/products/BEATO16.png', name: 'BEATO 16' },
  { id: 'DMwAVgnsDhN', img: 'images/products/FADO.png',    name: 'FADO' },
  { id: 'DMAxjqLsWuG', img: 'images/products/KNOBO.png',   name: 'KNOBO' },
  { id: 'CuX8gmKPk1d', img: 'images/products/LOOPO.png',   name: 'LOOPO' },
  { id: 'C8rpAvFONDZ', img: 'images/products/MIXO.png',    name: 'MIXO' },
]

const InstagramIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
)

const GallerySection: React.FC = () => {
  const base = import.meta.env.BASE_URL

  return (
    <section className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center py-16 md:py-20">
      {/* Sin fondo local — fondo global de 21st.dev */}

      <div className="relative z-10 w-full container mx-auto max-w-7xl px-4">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2.5 mb-4">
            <span className="w-2 h-2 rounded-[2px] bg-neon-cyan" />
            <span className="text-[10px] font-plexmono tracking-[0.28em] text-gray-500 uppercase">
              04 · Trabajo real
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-grotesk font-bold tracking-[-0.02em] mb-3 text-white">
            Galería
          </h2>
          <p className="text-sm md:text-base text-gray-400 font-inter tracking-wide mb-5">
            Nuestros últimos diseños y lanzamientos
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-white text-sm transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
            }}
          >
            <InstagramIcon />
            @creart.tech
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Splide
            options={{
              type: 'slide',
              rewind: true,
              perPage: 3,
              gap: '1rem',
              padding: '0.5rem',
              arrows: true,
              pagination: true,
              autoplay: true,
              interval: 4000,
              pauseOnHover: true,
              breakpoints: {
                1024: { perPage: 2 },
                640: { perPage: 1 },
              },
            }}
            className="splide gallery-splide"
            aria-label="Galería Instagram CREART.TECH"
          >
            {posts.map((post) => (
              <SplideSlide key={post.id}>
                <a
                  href={`https://www.instagram.com/p/${post.id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/[0.22] transition-all duration-300 bg-[#0E1013] relative mx-auto"
                  style={{ aspectRatio: '1 / 1', width: 'min(100%, 45dvh, 400px)' }}
                >
                  <img
                    src={`${base}${post.img}`}
                    alt={`Controlador MIDI ${post.name} — CREART.TECH`}
                    className="w-full h-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Etiqueta del modelo */}
                  <span className="absolute bottom-3 left-4 text-[10px] font-plexmono tracking-[0.22em] text-gray-500 uppercase group-hover:opacity-0 transition-opacity duration-300">
                    {post.name}
                  </span>
                  {/* Overlay al hacer hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center gap-2">
                      <InstagramIcon />
                      <span className="text-white text-sm font-semibold tracking-wide">Ver en Instagram</span>
                    </div>
                  </div>
                </a>
              </SplideSlide>
            ))}
          </Splide>
        </motion.div>
      </div>

      <style>{`
        .gallery-splide .splide__arrow {
          background: rgba(14, 16, 19, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: white;
          width: 2.75rem;
          height: 2.75rem;
          border-radius: 8px;
        }
        .gallery-splide .splide__arrow:hover {
          border-color: rgba(255, 255, 255, 0.4);
        }
        .gallery-splide .splide__pagination__page {
          background: rgba(255,255,255,0.18);
          border-radius: 2px;
          width: 14px;
          height: 3px;
        }
        .gallery-splide .splide__pagination__page.is-active {
          background: #00E5FF;
          transform: none;
        }
      `}</style>
    </section>
  )
}

export default GallerySection
