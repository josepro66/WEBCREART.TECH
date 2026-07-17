/**
 * TechBackdrop — fondo global industrial del sitio.
 *
 * Grafito neutro con dos capas de aurora cián/magenta que se mueven muy
 * despacio, micro-rejilla de plano de ingeniería y viñeta. Da atmósfera
 * futurista sin robarle protagonismo a los renders 3D.
 */
import React from 'react'

const TechBackdrop: React.FC = () => (
  <div
    aria-hidden
    className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
    style={{
      background:
        'radial-gradient(1400px 900px at 50% 12%, #232b4d 0%, #141a36 55%, #0c1026 100%)',
    }}
  >
    {/* Aurora 1: mancha cián derivando lento */}
    <div
      className="absolute -inset-[10%]"
      style={{
        background:
          'radial-gradient(750px 500px at 30% 40%, rgba(0,229,255,0.17) 0%, transparent 60%)',
        filter: 'blur(60px)',
        animation: 'tb-aurora-1 26s ease-in-out infinite alternate',
      }}
    />
    {/* Aurora 2: mancha magenta contraria */}
    <div
      className="absolute -inset-[10%]"
      style={{
        background:
          'radial-gradient(650px 450px at 75% 65%, rgba(255,61,119,0.13) 0%, transparent 60%)',
        filter: 'blur(70px)',
        animation: 'tb-aurora-2 32s ease-in-out infinite alternate',
      }}
    />
    {/* Aurora 3: violeta superior derecha */}
    <div
      className="absolute -inset-[10%]"
      style={{
        background:
          'radial-gradient(700px 480px at 82% 18%, rgba(139,92,246,0.16) 0%, transparent 60%)',
        filter: 'blur(70px)',
        animation: 'tb-aurora-2 38s ease-in-out infinite alternate',
      }}
    />
    {/* Aurora 4: toque lima inferior izquierda */}
    <div
      className="absolute -inset-[10%]"
      style={{
        background:
          'radial-gradient(550px 380px at 15% 85%, rgba(200,255,77,0.08) 0%, transparent 60%)',
        filter: 'blur(80px)',
        animation: 'tb-aurora-1 34s ease-in-out infinite alternate',
      }}
    />
    {/* Micro-rejilla de plano técnico */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'linear-gradient(rgba(140,160,185,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(140,160,185,0.045) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        maskImage:
          'radial-gradient(1300px 900px at 50% 30%, rgba(0,0,0,0.85), transparent 85%)',
        WebkitMaskImage:
          'radial-gradient(1300px 900px at 50% 30%, rgba(0,0,0,0.85), transparent 85%)',
      }}
    />
    {/* Viñeta que asienta el borde inferior */}
    <div
      className="absolute inset-0"
      style={{ background: 'linear-gradient(180deg, transparent 65%, rgba(0,0,0,0.45) 100%)' }}
    />

    <style>{`
      @keyframes tb-aurora-1 {
        0%   { transform: translate(-4%, -3%); }
        100% { transform: translate(6%, 4%); }
      }
      @keyframes tb-aurora-2 {
        0%   { transform: translate(3%, 4%); }
        100% { transform: translate(-5%, -3%); }
      }
    `}</style>
  </div>
)

export default TechBackdrop
