import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const BASE = import.meta.env.BASE_URL
const items = [
  { title: 'Beato 16', img: `${BASE}images/products/BEATO16.png` },
  { title: 'Mixo', img: `${BASE}images/products/MIXO.png` },
  { title: 'Beato 8', img: `${BASE}images/products/BEATO.png` },
  { title: 'Fado', img: `${BASE}images/products/FADO.png` },
  { title: 'Loopo', img: `${BASE}images/products/LOOPO.png` },
  { title: 'Knobo', img: `${BASE}images/products/KNOBO.png` },
]

export default function ProductRail() {
  const ref = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !trackRef.current) return
    const ctx = gsap.context(() => {
      const totalWidth = trackRef.current!.scrollWidth
      const viewport = ref.current!.offsetWidth
      const distance = totalWidth - viewport
      ScrollTrigger.create({
        trigger: ref.current,
        start: 'top top',
        end: `+=${distance}`,
        pin: true,
        scrub: 0.6,
        animation: gsap.to(trackRef.current, { x: -distance, ease: 'none' }),
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section className="relative bg-[#0A0A1A] py-20">
      <div ref={ref} className="relative overflow-hidden">
        <div ref={trackRef} className="flex gap-6 px-6">
          {items.map((it) => (
            <motion.div key={it.title} whileHover={{ y: -6 }} className="min-w-[70vw] sm:min-w-[50vw] lg:min-w-[40vw]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <img src={it.img} alt={it.title} className="h-64 w-full rounded-xl object-contain bg-black/40" />
                <div className="mt-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{it.title}</h3>
                  <a href="#productos" className="text-cyan-300 hover:text-cyan-200">Más info →</a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}


