import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Editor de comportamiento MIDI del Beato 16 (Fase 1).
 * Sirve la herramienta standalone (public/editor-midi.html) a pantalla
 * completa dentro de la app. El atributo allow="midi" habilita Web MIDI
 * dentro del iframe para conectarse al hardware.
 *
 * Fase 2: reemplazar el panel CSS del editor por el modelo 3D del BEATO16.
 */
const MidiEditorPage: React.FC = () => {
  const base = import.meta.env.BASE_URL

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0E0E10' }}>
      {/* Botón para volver al sitio */}
      <Link
        to="/"
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#F2F1ED',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          textDecoration: 'none',
        }}
      >
        ← Volver
      </Link>

      <iframe
        src={`${base}editor-midi.html`}
        title="Editor MIDI Beato 16"
        allow="midi"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  )
}

export default MidiEditorPage
