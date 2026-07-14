import { useEffect, useRef, useState } from 'react'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebaseConfig'
import { useAuth } from './AuthContext'

type Modelo = 'beato' | 'beato8' | 'beato16' | 'knobo' | 'mixo' | 'loopo' | 'fado' | 'wavo'

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Auto-guarda la configuración del usuario en Firestore (con debounce).
 * - Requiere usuario autenticado y email verificado para guardar.
 * - Devuelve un estado de "saving" y la config cargada (si existe).
 *
 * Doc path: users/{uid}/configs/{modelo}  (una config por modelo, la última)
 */
export function useUserConfig(modelo: Modelo, colores: Record<string, any> | null) {
  const { user } = useAuth()
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const [loadedConfig, setLoadedConfig] = useState<Record<string, any> | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')

  // Cargar config existente al iniciar sesión
  useEffect(() => {
    let cancelled = false
    setHasLoaded(false)
    setLoadedConfig(null)

    if (!user) {
      setHasLoaded(true)
      return
    }

    const load = async () => {
      try {
        const ref = doc(db, 'users', user.uid, 'configs', modelo)
        const snap = await getDoc(ref)
        if (cancelled) return
        if (snap.exists()) {
          const data = snap.data() as { colores?: Record<string, any> }
          if (data.colores) setLoadedConfig(data.colores)
        }
      } catch (err) {
        if (!cancelled) console.warn('[useUserConfig] load error', err)
      } finally {
        if (!cancelled) setHasLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user, modelo])

  // Auto-guardar con debounce
  useEffect(() => {
    if (!user || !user.emailVerified || !colores) return
    if (!hasLoaded) return

    const serialized = JSON.stringify(colores)
    if (serialized === lastSavedRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus('saving')

    timerRef.current = setTimeout(async () => {
      try {
        const ref = doc(db, 'users', user.uid, 'configs', modelo)
        await setDoc(
          ref,
          {
            modelo,
            colores,
            nombre: `${modelo.toUpperCase()} personalizado`,
            creadoEn: serverTimestamp(),
            actualizadoEn: serverTimestamp(),
          },
          { merge: true }
        )
        lastSavedRef.current = serialized
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 1500)
      } catch (err) {
        console.error('[useUserConfig] save error', err)
        setStatus('error')
        setTimeout(() => setStatus('idle'), 3000)
      }
    }, 1200)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [user, modelo, colores, hasLoaded])

  return { status, loadedConfig, hasLoaded, isAuthed: !!user, emailVerified: !!user?.emailVerified }
}
