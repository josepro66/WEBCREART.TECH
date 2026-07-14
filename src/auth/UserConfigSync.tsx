import { useEffect, useRef } from 'react'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebaseConfig'
import { useAuth } from './AuthContext'
import { MODELS, lsColors, getActiveConfigId, setActiveConfigId } from './configStore'

/**
 * Sincroniza las configuraciones del configurador (localStorage) con Firestore,
 * soportando MÚLTIPLES configs por modelo.
 *
 * Cada modelo tiene un borrador en localStorage ({modelo}_chosenColors) y un id
 * de config activa ({modelo}_activeConfigId). Cada ~2s, si el borrador cambió y
 * el usuario está autenticado + verificado, se guarda en:
 *   users/{uid}/configs/{activeConfigId}
 *
 * Si no hay config activa para ese modelo, se crea un documento nuevo (autoId)
 * y se fija como activo. Así "empezar de cero" genera una config nueva en vez
 * de sobrescribir la anterior.
 *
 * Se monta una vez al inicio de la app del configurador.
 */
const UserConfigSync: React.FC = () => {
  const { user } = useAuth()
  const lastSyncedRef = useRef<Record<string, string>>({})

  useEffect(() => {
    // Guardar diseños no exige email verificado — eso solo aplica al pago.
    if (!user) return

    const intervalId = setInterval(async () => {
      for (const m of MODELS) {
        const local = localStorage.getItem(lsColors(m))
        if (!local) continue
        if (lastSyncedRef.current[m] === local) continue

        try {
          const colores = JSON.parse(local)

          // Obtener (o crear) el id de la config activa para este modelo
          let id = getActiveConfigId(m)
          let esNueva = false
          if (!id) {
            const nuevoRef = doc(collection(db, 'users', user.uid, 'configs'))
            id = nuevoRef.id
            setActiveConfigId(m, id)
            esNueva = true
          }

          const ref = doc(db, 'users', user.uid, 'configs', id)
          const payload: Record<string, unknown> = {
            modelo: m,
            colores,
            actualizadoEn: serverTimestamp(),
          }
          // Solo al crear fijamos nombre por defecto y fecha de creación —
          // así no pisamos el nombre que el usuario le ponga después.
          if (esNueva) {
            payload.nombre = `${m.toUpperCase()} sin nombre`
            payload.creadoEn = serverTimestamp()
          }

          await setDoc(ref, payload, { merge: true })
          lastSyncedRef.current[m] = local
        } catch (err) {
          console.warn(`[UserConfigSync] save error for ${m}`, err)
        }
      }
    }, 2000)

    return () => clearInterval(intervalId)
  }, [user])

  return null
}

export default UserConfigSync
