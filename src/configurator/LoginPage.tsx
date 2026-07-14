import React, { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

interface User {
  name: string
  email: string
}

interface LoginPageProps {
  onLogin: (user: User) => void
}

type Mode = 'login' | 'register' | 'reset'

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const friendlyError = (err: unknown): string => {
    const code = (err as { code?: string })?.code || ''
    const map: Record<string, string> = {
      'auth/invalid-email': 'Email inválido',
      'auth/email-already-in-use': 'Ese email ya está registrado',
      'auth/weak-password': 'La contraseña debe tener al menos 8 caracteres',
      'auth/user-not-found': 'No existe una cuenta con ese email',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/invalid-credential': 'Email o contraseña incorrectos',
      'auth/popup-closed-by-user': 'Cancelaste el inicio de sesión',
      'auth/too-many-requests': 'Demasiados intentos, espera unos minutos',
      'auth/network-request-failed': 'Problema de conexión, intenta de nuevo',
    }
    return map[code] || 'Algo salió mal, intenta de nuevo'
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        const u = await signIn(email.trim(), password)
        onLogin({ name: u.displayName || email.split('@')[0], email: u.email || email })
      } else if (mode === 'register') {
        const u = await signUp(email.trim(), password, name.trim() || undefined)
        setInfo('Cuenta creada. Te enviamos un email de verificación — revísalo antes de entrar.')
        onLogin({ name: u.displayName || name || email.split('@')[0], email: u.email || email })
      } else if (mode === 'reset') {
        await resetPassword(email.trim())
        setInfo('Te enviamos un email con instrucciones para recuperar tu contraseña.')
        setMode('login')
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const googleLogin = async () => {
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      const u = await signInWithGoogle()
      onLogin({ name: u.displayName || 'Usuario', email: u.email || '' })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #0b1220 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        color: 'white',
        fontFamily: 'Inter, Arial, sans-serif',
        overflow: 'auto',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}textures/fondo.jpg)` }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 420,
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          borderRadius: 20,
          padding: '2rem',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src={`${import.meta.env.BASE_URL}models/logo.png`}
            alt="CREART.TECH"
            style={{
              height: 56,
              filter: 'drop-shadow(0 0 12px #a259ff) drop-shadow(0 0 24px #0ff)',
            }}
          />
          <h1
            style={{
              marginTop: 12,
              fontSize: '1.5rem',
              fontWeight: 800,
              background: 'linear-gradient(45deg, #a259ff, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {mode === 'login' && 'Bienvenido de vuelta'}
            {mode === 'register' && 'Crea tu cuenta'}
            {mode === 'reset' && 'Recupera tu cuenta'}
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: 4 }}>
            {mode === 'login' && 'Inicia sesión para personalizar tus controladores'}
            {mode === 'register' && 'Únete a CREART.TECH y guarda tus diseños'}
            {mode === 'reset' && 'Te enviaremos un email para restablecer tu contraseña'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}
        {info && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              color: '#86efac',
              fontSize: '0.85rem',
              marginBottom: 12,
            }}
          >
            {info}
          </div>
        )}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <Field
              label="Nombre"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Tu nombre"
              required
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="tu@email.com"
            required
            autoComplete="email"
          />
          {mode !== 'reset' && (
            <Field
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Mínimo 8 caracteres"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
            />
          )}

          {mode === 'login' && (
            <button
              type="button"
              onClick={() => { setMode('reset'); setError(null); setInfo(null) }}
              style={{
                background: 'none',
                border: 'none',
                color: '#06b6d4',
                fontSize: '0.8rem',
                cursor: 'pointer',
                marginBottom: 12,
                padding: 0,
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 12,
              border: 'none',
              background: busy ? '#475569' : 'linear-gradient(45deg, #a259ff, #06b6d4)',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: busy ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s',
              marginBottom: 12,
            }}
          >
            {busy
              ? 'Cargando...'
              : mode === 'login'
              ? 'Iniciar sesión'
              : mode === 'register'
              ? 'Crear cuenta'
              : 'Enviar email'}
          </button>
        </form>

        {mode !== 'reset' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>o continúa con</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </div>

            <button
              type="button"
              onClick={googleLogin}
              disabled={busy}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: busy ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <GoogleIcon />
              Google
            </button>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: '0.85rem', color: '#cbd5e1' }}>
          {mode === 'login' && (
            <>
              ¿No tienes cuenta?{' '}
              <SwitchLink onClick={() => { setMode('register'); setError(null); setInfo(null) }}>
                Regístrate
              </SwitchLink>
            </>
          )}
          {mode === 'register' && (
            <>
              ¿Ya tienes cuenta?{' '}
              <SwitchLink onClick={() => { setMode('login'); setError(null); setInfo(null) }}>
                Inicia sesión
              </SwitchLink>
            </>
          )}
          {mode === 'reset' && (
            <SwitchLink onClick={() => { setMode('login'); setError(null); setInfo(null) }}>
              ← Volver a iniciar sesión
            </SwitchLink>
          )}
        </div>
      </div>
    </div>
  )
}

const Field: React.FC<{
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  autoComplete?: string
  minLength?: number
}> = ({ label, type, value, onChange, placeholder, required, autoComplete, minLength }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: 4 }}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      autoComplete={autoComplete}
      minLength={minLength}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(15, 23, 42, 0.6)',
        color: 'white',
        fontSize: '0.95rem',
        outline: 'none',
      }}
    />
  </div>
)

const SwitchLink: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      background: 'none',
      border: 'none',
      color: '#06b6d4',
      cursor: 'pointer',
      fontWeight: 600,
      padding: 0,
      fontSize: '0.85rem',
    }}
  >
    {children}
  </button>
)

const GoogleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.1 29 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.3-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.6 16.1 18.9 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.1 29 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5 0 9.4-1.9 12.8-5l-5.9-5c-2 1.4-4.5 2.2-6.9 2.2-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.8l5.9 5c-.4.4 6.1-4.5 6.1-13.3 0-1.3-.1-2.3-.4-3.5z"
    />
  </svg>
)

export default LoginPage
