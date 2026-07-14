import React, { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../firebaseConfig'
import { useAuth } from '../auth/AuthContext'
import { startNewConfig, openExistingConfig, modeloToProduct } from '../auth/configStore'

interface SavedConfig {
  id: string
  modelo: string
  nombre: string
  colores: Record<string, any>
  actualizadoEn?: { seconds: number }
}

const MODEL_LABEL: Record<string, string> = {
  beato: 'BEATO8',
  beato8: 'BEATO8',
  beato16: 'BEATO16',
  knobo: 'KNOBO',
  mixo: 'MIXO',
  loopo: 'LOOPO',
  fado: 'FADO',
  wavo: 'WAVO',
}

const MODEL_THUMB: Record<string, string> = {
  beato: 'images/products/BEATO.png',
  beato8: 'images/products/BEATO.png',
  beato16: 'images/products/BEATO16.png',
  knobo: 'images/products/KNOBO.png',
  mixo: 'images/products/MIXO.png',
  loopo: 'images/products/LOOPO.png',
  fado: 'images/products/FADO.png',
  wavo: 'images/products/wavo.png',
}

// Modelos disponibles para crear una config nueva
const NEW_OPTIONS: { modelo: string; label: string }[] = [
  { modelo: 'beato', label: 'BEATO8' },
  { modelo: 'beato16', label: 'BEATO16' },
  { modelo: 'knobo', label: 'KNOBO' },
  { modelo: 'mixo', label: 'MIXO' },
  { modelo: 'loopo', label: 'LOOPO' },
  { modelo: 'fado', label: 'FADO' },
  { modelo: 'wavo', label: 'WAVO' },
]

const MyConfigsPage: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth()
  const [configs, setConfigs] = useState<SavedConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const navigate = useNavigate()
  const base = import.meta.env.BASE_URL

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/configurator')
      return
    }
    const load = async () => {
      try {
        const col = collection(db, 'users', user.uid, 'configs')
        const snap = await getDocs(col)
        const list: SavedConfig[] = []
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<SavedConfig, 'id'>) }))
        list.sort((a, b) => (b.actualizadoEn?.seconds || 0) - (a.actualizadoEn?.seconds || 0))
        setConfigs(list)
      } catch (err) {
        console.error(err)
        setError('No pudimos cargar tus configuraciones')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, authLoading, navigate])

  const handleDelete = async (configId: string) => {
    if (!user) return
    if (!confirm('¿Eliminar esta configuración?')) return
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'configs', configId))
      setConfigs((prev) => prev.filter((c) => c.id !== configId))
    } catch (err) {
      console.error(err)
      alert('No pudimos eliminar la configuración')
    }
  }

  const handleRename = async (c: SavedConfig) => {
    if (!user) return
    const nuevo = prompt('Nombre de la configuración', c.nombre || '')?.trim()
    if (!nuevo || nuevo === c.nombre) return
    try {
      // La regla de Firestore exige actualizadoEn == request.time en cada update
      await updateDoc(doc(db, 'users', user.uid, 'configs', c.id), {
        nombre: nuevo.slice(0, 80),
        actualizadoEn: serverTimestamp(),
      })
      setConfigs((prev) => prev.map((x) => (x.id === c.id ? { ...x, nombre: nuevo } : x)))
    } catch (err) {
      console.error(err)
      alert('No pudimos renombrar la configuración')
    }
  }

  // Abrir una config existente en el configurador
  const handleOpen = (c: SavedConfig) => {
    openExistingConfig(c.modelo, c.id, c.colores)
    navigate(`/configurator?product=${modeloToProduct(c.modelo)}`)
  }

  // Crear una configuración nueva desde cero
  const handleNew = (modelo: string) => {
    startNewConfig(modelo)
    setPickerOpen(false)
    navigate(`/configurator?product=${modeloToProduct(modelo)}`)
  }

  const fecha = (c: SavedConfig) =>
    c.actualizadoEn
      ? new Date(c.actualizadoEn.seconds * 1000).toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : ''

  return (
    <div className="min-h-screen w-full bg-dark-900 text-white pt-24 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-orbitron font-bold text-white">
              Mis configuraciones
            </h1>
            <p className="text-gray-400 mt-2 text-sm">{user?.email}</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/"
              className="px-4 py-2 rounded-lg border border-white/15 hover:border-cyan-500/50 text-sm transition"
            >
              ← Volver al inicio
            </Link>
            <button
              onClick={async () => { try { await signOut(); navigate('/') } catch { /* */ } }}
              className="px-4 py-2 rounded-lg border border-red-500/30 hover:border-red-400/60 text-sm transition text-red-300"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-400">Cargando tus configuraciones...</div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tarjeta "+" para crear nueva configuración */}
            <button
              onClick={() => setPickerOpen(true)}
              className="group flex flex-col items-center justify-center min-h-[260px] rounded-2xl border border-dashed border-white/20 hover:border-cyan-400/60 bg-white/[0.02] hover:bg-cyan-500/[0.04] transition-all"
            >
              <div className="w-14 h-14 rounded-full border border-cyan-500/40 flex items-center justify-center text-neon-cyan text-3xl font-light mb-3 group-hover:scale-110 transition-transform">
                +
              </div>
              <span className="font-orbitron font-bold text-sm text-white">Nueva configuración</span>
              <span className="text-xs text-gray-500 mt-1">Empieza un diseño desde cero</span>
            </button>

            {/* Configuraciones guardadas */}
            {configs.map((c) => (
              <div
                key={c.id}
                className="flex flex-col rounded-2xl border border-white/10 hover:border-cyan-500/40 bg-white/[0.03] p-5 transition-colors"
              >
                <div className="flex items-center justify-center h-32 mb-4 bg-black/30 rounded-xl">
                  <img
                    src={`${base}${MODEL_THUMB[c.modelo] || 'images/products/BEATO.png'}`}
                    alt={MODEL_LABEL[c.modelo] || c.modelo}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-orbitron font-bold text-base text-white truncate" title={c.nombre}>
                    {c.nombre || MODEL_LABEL[c.modelo] || c.modelo.toUpperCase()}
                  </h3>
                  <button
                    onClick={() => handleRename(c)}
                    className="text-gray-500 hover:text-neon-cyan transition shrink-0"
                    title="Renombrar"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mb-4">
                  {MODEL_LABEL[c.modelo] || c.modelo.toUpperCase()} · {fecha(c)}
                </p>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => handleOpen(c)}
                    className="flex-1 px-3 py-2 rounded-lg bg-neon-cyan text-black text-sm font-bold hover:bg-cyan-300 transition-colors"
                  >
                    Abrir
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="px-3 py-2 rounded-lg border border-red-500/30 hover:border-red-400/60 text-red-300 text-sm transition"
                    title="Eliminar"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selector de producto para nueva configuración */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-dark-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-orbitron font-bold text-lg text-white mb-1">Nueva configuración</h3>
            <p className="text-sm text-gray-400 mb-5">¿Qué producto quieres personalizar?</p>
            <div className="grid grid-cols-2 gap-3">
              {NEW_OPTIONS.map((opt) => (
                <button
                  key={opt.modelo}
                  onClick={() => handleNew(opt.modelo)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:border-cyan-500/50 bg-white/[0.03] hover:bg-cyan-500/[0.05] transition-all"
                >
                  <img
                    src={`${base}${MODEL_THUMB[opt.modelo]}`}
                    alt={opt.label}
                    className="w-10 h-10 object-contain"
                  />
                  <span className="font-orbitron font-bold text-sm text-white">{opt.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPickerOpen(false)}
              className="w-full mt-5 px-4 py-2 rounded-lg border border-white/15 hover:border-white/30 text-sm text-gray-300 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyConfigsPage
