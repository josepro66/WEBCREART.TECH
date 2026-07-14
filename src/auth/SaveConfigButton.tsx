import React, { useState } from 'react'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebaseConfig'
import { useAuth } from './AuthContext'
import {
  lsColors,
  getActiveConfigId,
  setActiveConfigId,
  productToModelo,
} from './configStore'

type Status = 'idle' | 'saving' | 'saved' | 'error' | 'empty'

/**
 * Botón flotante "Guardar configuración".
 * Guarda el diseño actual del producto activo en Firestore (configs/{id}),
 * creando un documento nuevo si aún no hay config activa. Da feedback visible.
 *
 * Convive con el auto-guardado (UserConfigSync): ambos escriben en el mismo
 * documento activo. Este botón existe para que el usuario sepa que se guardó.
 */
const SaveConfigButton: React.FC<{ product: string }> = ({ product }) => {
  const { user } = useAuth()
  const [status, setStatus] = useState<Status>('idle')

  if (!user) return null

  const modelo = productToModelo(product)

  const save = async () => {
    const local = localStorage.getItem(lsColors(modelo))
    if (!local) {
      setStatus('empty')
      setTimeout(() => setStatus('idle'), 2500)
      return
    }

    setStatus('saving')
    try {
      const colores = JSON.parse(local)

      let id = getActiveConfigId(modelo)
      let esNueva = false
      if (!id) {
        const nuevoRef = doc(collection(db, 'users', user.uid, 'configs'))
        id = nuevoRef.id
        setActiveConfigId(modelo, id)
        esNueva = true
      }

      const ref = doc(db, 'users', user.uid, 'configs', id)
      const payload: Record<string, unknown> = {
        modelo,
        colores,
        actualizadoEn: serverTimestamp(),
      }
      if (esNueva) {
        payload.nombre = `${modelo.toUpperCase()} sin nombre`
        payload.creadoEn = serverTimestamp()
      }

      await setDoc(ref, payload, { merge: true })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } catch (err) {
      console.error('[SaveConfigButton] error', err)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  const label: Record<Status, string> = {
    idle: 'Guardar configuración',
    saving: 'Guardando…',
    saved: '✓ Guardado',
    error: 'Error — reintenta',
    empty: 'Personaliza algo primero',
  }

  const bg: Record<Status, string> = {
    idle: '#00E5FF',
    saving: '#475569',
    saved: '#22c55e',
    error: '#ef4444',
    empty: '#f59e0b',
  }

  return (
    <button
      onClick={save}
      disabled={status === 'saving'}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 20px',
        borderRadius: 12,
        border: 'none',
        background: bg[status],
        color: status === 'idle' || status === 'saved' ? '#000' : '#fff',
        fontWeight: 800,
        fontSize: 13,
        fontFamily: 'Orbitron, sans-serif',
        letterSpacing: 0.5,
        cursor: status === 'saving' ? 'default' : 'pointer',
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        transition: 'background 0.25s ease, transform 0.15s ease',
      }}
      onMouseEnter={(e) => { if (status === 'idle') e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {status === 'idle' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-10.5a2.25 2.25 0 01-2.25-2.25V6.75m16.5 0a2.25 2.25 0 00-2.25-2.25h-1.5m3.75 2.25l-3.75-3.75M8.25 4.5v3.75c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75V4.5" />
        </svg>
      )}
      {label[status]}
    </button>
  )
}

export default SaveConfigButton
