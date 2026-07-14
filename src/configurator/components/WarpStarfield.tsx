import React, { useEffect, useRef } from 'react'

const STAR_COLORS = ['#ffffff', '#ffffff', '#aee7ff', '#00e5ff', '#00e5ff', '#ffe45e', '#ff80ff']

interface Star {
  x: number; y: number; z: number; speed: number; color: string
}

const WarpStarfield: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let width = 0
    let height = 0
    let stars: Star[] = []
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const spawn = (s: Star, initial = false) => {
      s.x = (Math.random() * 2 - 1) * 0.6
      s.y = (Math.random() * 2 - 1) * 0.6
      s.z = initial ? 0.05 + Math.random() * 0.95 : 0.9 + Math.random() * 0.1
      s.speed = 1.2 + Math.random() * 2.4
      s.color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
    }

    const init = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = Array.from({ length: 420 }, () => {
        const s = { x: 0, y: 0, z: 1, speed: 0, color: '#fff' }
        spawn(s, true)
        return s
      })
    }

    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      // Rastro de movimiento: no limpiar completamente — da efecto de estela
      ctx.fillStyle = 'rgba(1,2,4,0.35)'
      ctx.fillRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2
      const focal = Math.max(width, height) * 0.55

      for (const s of stars) {
        const zPrev = s.z
        s.z -= s.speed * dt
        if (s.z <= 0.02) { spawn(s); continue }

        const px = cx + (s.x / s.z) * focal
        const py = cy + (s.y / s.z) * focal
        if (px < -20 || px > width + 20 || py < -20 || py > height + 20) { spawn(s); continue }

        const depth = 1 - s.z
        const radius = 0.5 + depth * depth * 6
        const alpha = Math.min(1, 0.3 + depth * 1.2)

        const pxPrev = cx + (s.x / zPrev) * focal
        const pyPrev = cy + (s.y / zPrev) * focal

        // Estela larga — efecto turbo/warp
        ctx.globalAlpha = alpha * 0.7
        ctx.strokeStyle = s.color
        ctx.lineWidth = radius * 1.1
        ctx.beginPath()
        ctx.moveTo(pxPrev, pyPrev)
        ctx.lineTo(px, py)
        ctx.stroke()

        // Núcleo brillante
        ctx.globalAlpha = alpha
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame) }
    }

    init()
    raf = requestAnimationFrame(frame)
    window.addEventListener('resize', init)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', init)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        display: 'block',
        background: 'linear-gradient(160deg, #010204 0%, #020308 50%, #04060f 100%)',
        pointerEvents: 'none',
        zIndex: -2,
      }}
    />
  )
}

export default WarpStarfield
