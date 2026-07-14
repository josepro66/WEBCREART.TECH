import React, { useEffect, useRef } from 'react'

const WARP_COLORS = ['#ffffff', '#ffffff', '#e0d0ff', '#aee7ff', '#00e5ff', '#ff80c8', '#c084fc']
const TWINKLE_COLORS = ['#ffffff', '#e0d0ff', '#aee7ff', '#ffd6f0', '#c084fc']

interface WarpStar {
  x: number; y: number; z: number; speed: number; color: string
}
interface TwinkleStar {
  x: number; y: number; r: number; alpha: number; phase: number; speed: number; color: string
}
interface Nebula {
  x: number; y: number; rx: number; ry: number; r: number; g: number; b: number; alpha: number
  vx: number; vy: number
}

const StarfieldBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let width = 0, height = 0
    let warpStars: WarpStar[] = []
    let twinkleStars: TwinkleStar[] = []
    let nebulae: Nebula[] = []
    let time = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const spawnWarp = (s: WarpStar, initial = false) => {
      s.x = Math.random() * 2 - 1
      s.y = Math.random() * 2 - 1
      s.z = initial ? 0.15 + Math.random() * 0.85 : 1
      s.speed = 0.08 + Math.random() * 0.18
      s.color = WARP_COLORS[Math.floor(Math.random() * WARP_COLORS.length)]
    }

    const init = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Warp stars
      const warpCount = Math.min(220, Math.floor((width * height) / 8000))
      warpStars = Array.from({ length: warpCount }, () => {
        const s: WarpStar = { x: 0, y: 0, z: 1, speed: 0, color: '#fff' }
        spawnWarp(s, true)
        return s
      })

      // Background twinkling stars — dense, tiny, static
      const twinkleCount = Math.min(400, Math.floor((width * height) / 5000))
      twinkleStars = Array.from({ length: twinkleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.3 + Math.random() * 1.1,
        alpha: 0.1 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 1.2,
        color: TWINKLE_COLORS[Math.floor(Math.random() * TWINKLE_COLORS.length)],
      }))

      // Nebula blobs
      nebulae = [
        // Large purple upper-right
        { x: width * 0.72, y: height * 0.18, rx: width * 0.44, ry: height * 0.40, r: 123, g: 33, b: 126, alpha: 0.13, vx: -0.015, vy: 0.008 },
        // Teal lower-left
        { x: width * 0.18, y: height * 0.78, rx: width * 0.40, ry: height * 0.34, r: 0, g: 130, b: 160, alpha: 0.11, vx: 0.012, vy: -0.006 },
        // Pink/magenta center-right
        { x: width * 0.60, y: height * 0.58, rx: width * 0.30, ry: height * 0.28, r: 190, g: 20, b: 120, alpha: 0.10, vx: -0.008, vy: 0.01 },
        // Blue upper-left
        { x: width * 0.22, y: height * 0.25, rx: width * 0.32, ry: height * 0.30, r: 30, g: 70, b: 210, alpha: 0.09, vx: 0.009, vy: 0.005 },
        // Wide diffuse purple center — ties it all together
        { x: width * 0.5, y: height * 0.5, rx: width * 0.60, ry: height * 0.50, r: 80, g: 15, b: 130, alpha: 0.07, vx: 0.003, vy: -0.004 },
        // Cyan accent lower-right
        { x: width * 0.82, y: height * 0.72, rx: width * 0.22, ry: height * 0.22, r: 0, g: 200, b: 220, alpha: 0.08, vx: -0.006, vy: -0.008 },
      ]
    }

    const drawNebulae = (dt: number) => {
      for (const n of nebulae) {
        n.x += n.vx * dt * 60
        n.y += n.vy * dt * 60
        if (n.x < -n.rx * 0.5) n.vx = Math.abs(n.vx)
        if (n.x > width + n.rx * 0.5) n.vx = -Math.abs(n.vx)
        if (n.y < -n.ry * 0.5) n.vy = Math.abs(n.vy)
        if (n.y > height + n.ry * 0.5) n.vy = -Math.abs(n.vy)

        ctx.save()
        ctx.translate(n.x, n.y)
        ctx.scale(1, n.ry / n.rx)
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, n.rx)
        g.addColorStop(0,    `rgba(${n.r},${n.g},${n.b},${n.alpha * 2.2})`)
        g.addColorStop(0.35, `rgba(${n.r},${n.g},${n.b},${n.alpha * 1.1})`)
        g.addColorStop(0.7,  `rgba(${n.r},${n.g},${n.b},${n.alpha * 0.4})`)
        g.addColorStop(1,    `rgba(${n.r},${n.g},${n.b},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(0, 0, n.rx, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    const drawTwinkleStars = (dt: number) => {
      time += dt
      for (const s of twinkleStars) {
        s.phase += s.speed * dt
        const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(s.phase))
        const a = s.alpha * pulse
        ctx.globalAlpha = a
        ctx.fillStyle = s.color
        // Soft glow for brighter ones
        if (a > 0.45) {
          ctx.globalAlpha = a * 0.2
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = a
        }
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const drawWarpStars = (dt: number) => {
      const cx = width / 2
      const cy = height / 2
      const focal = Math.max(width, height) * 0.5

      for (const s of warpStars) {
        const zPrev = s.z
        s.z -= s.speed * dt
        if (s.z <= 0.04) { spawnWarp(s); continue }

        const px = cx + (s.x / s.z) * focal
        const py = cy + (s.y / s.z) * focal
        if (px < -20 || px > width + 20 || py < -20 || py > height + 20) { spawnWarp(s); continue }

        const depth = 1 - s.z
        const radius = 0.5 + depth * depth * 4.5
        const alpha = Math.min(1, 0.2 + depth * 1.1)

        const pxPrev = cx + (s.x / zPrev) * focal
        const pyPrev = cy + (s.y / zPrev) * focal

        // Trail
        ctx.globalAlpha = alpha * 0.45
        ctx.strokeStyle = s.color
        ctx.lineWidth = radius * 0.85
        ctx.beginPath()
        ctx.moveTo(pxPrev, pyPrev)
        ctx.lineTo(px, py)
        ctx.stroke()

        // Glow
        ctx.globalAlpha = alpha * 0.18
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(px, py, radius * 2.8, 0, Math.PI * 2)
        ctx.fill()

        // Core
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      ctx.clearRect(0, 0, width, height)

      // Layer 1: nebulae (bottom)
      drawNebulae(dt)

      // Layer 2: twinkling background stars
      drawTwinkleStars(dt)

      // Layer 3: warp stars (top)
      drawWarpStars(dt)

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
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
        // Richer deep-space gradient: dark indigo core with purple/teal edges
        background:
          'radial-gradient(ellipse 90% 55% at 72% 12%, #12052a 0%, transparent 70%), ' +
          'radial-gradient(ellipse 70% 50% at 12% 82%, #020f16 0%, transparent 65%), ' +
          'radial-gradient(ellipse 50% 40% at 58% 60%, #1a0420 0%, transparent 65%), ' +
          'linear-gradient(155deg, #08020e 0%, #060210 35%, #020411 60%, #040208 100%)',
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export default StarfieldBackground
