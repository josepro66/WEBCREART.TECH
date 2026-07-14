import React, { useEffect, useRef } from 'react'

const STAR_COLORS = ['#ffffff', '#ffffff', '#ffffff', '#aee7ff', '#00e5ff', '#ffe45e']

interface Star {
  x: number; y: number; z: number; speed: number; color: string
}

const CardStarfield: React.FC = () => {
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
      s.x = Math.random() * 2 - 1
      s.y = Math.random() * 2 - 1
      s.z = initial ? 0.15 + Math.random() * 0.85 : 1
      s.speed = 0.12 + Math.random() * 0.22
      s.color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
    }

    const init = () => {
      const parent = canvas.parentElement
      width = parent ? parent.offsetWidth : canvas.offsetWidth
      height = parent ? parent.offsetHeight : canvas.offsetHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(100, Math.floor((width * height) / 5000))
      stars = Array.from({ length: count }, () => {
        const s = { x: 0, y: 0, z: 1, speed: 0, color: '#fff' }
        spawn(s, true)
        return s
      })
    }

    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      ctx.clearRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2
      const focal = Math.max(width, height) * 0.5

      for (const s of stars) {
        const zPrev = s.z
        s.z -= s.speed * dt
        if (s.z <= 0.04) { spawn(s); continue }

        const px = cx + (s.x / s.z) * focal
        const py = cy + (s.y / s.z) * focal
        if (px < -10 || px > width + 10 || py < -10 || py > height + 10) { spawn(s); continue }

        const depth = 1 - s.z
        const radius = 0.6 + depth * depth * 4
        const alpha = Math.min(1, 0.25 + depth * 1.1)

        const pxPrev = cx + (s.x / zPrev) * focal
        const pyPrev = cy + (s.y / zPrev) * focal
        ctx.globalAlpha = alpha * 0.5
        ctx.strokeStyle = s.color
        ctx.lineWidth = radius * 0.9
        ctx.beginPath()
        ctx.moveTo(pxPrev, pyPrev)
        ctx.lineTo(px, py)
        ctx.stroke()

        ctx.globalAlpha = alpha * 0.22
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(px, py, radius * 2.4, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    const ro = new ResizeObserver(init)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    init()
    raf = requestAnimationFrame(frame)

    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        background: 'linear-gradient(160deg, #010204 0%, #03040a 55%, #04060f 100%)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

export default CardStarfield
