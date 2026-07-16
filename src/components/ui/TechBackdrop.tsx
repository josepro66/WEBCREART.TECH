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
        'radial-gradient(1400px 900px at 50% 12%, #12151A 0%, #0A0B0D 55%, #060708 100%)',
    }}
  >
    {/* Aurora 1: mancha cián derivando lento */}
    <div
      className="absolute -inset-[10%]"
      style={{
        background:
          'radial-gradient(600px 400px at 30% 40%, rgba(0,229,255,0.08) 0%, transparent 60%)',
        filter: 'blur(60px)',
        animation: 'tb-aurora-1 26s ease-in-out infinite alternate',
      }}
    />
    {/* Aurora 2: mancha magenta contraria */}
    <div
      className="absolute -inset-[10%]"
      style={{
        background:
          'radial-gradient(500px 350px at 75% 65%, rgba(255,61,119,0.06) 0%, transparent 60%)',
        filter: 'blur(70px)',
        animation: 'tb-aurora-2 32s ease-in-out infinite alternate',
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
