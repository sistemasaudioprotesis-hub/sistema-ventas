'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [form, setForm] = useState({ usuario: '', password: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  async function handleLogin() {
    if (!form.usuario || !form.password) {
      setError('Completar usuario y contraseña')
      return
    }

    setCargando(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: form.usuario, password: form.password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al ingresar')
        setCargando(false)
        return
      }

      // Guardar token y usuario en localStorage
      localStorage.setItem('token', data.token)
      localStorage.setItem('usuario', JSON.stringify(data.usuario))

      router.push('/')

    } catch (e) {
      setError('Error de conexión')
      setCargando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
      }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: '#8B1E2D', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>AudioProtesis</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Sistema de gestión</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Usuario</label>
            <input
              name="usuario"
              placeholder="Tu usuario"
              value={form.usuario}
              onChange={handleChange}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              style={inputStyle}
              autoComplete="username"
            />
          </div>

          <div>
            <label style={labelStyle}>Contraseña</label>
            <input
              name="password"
              type="password"
              placeholder="Tu contraseña"
              value={form.password}
              onChange={handleChange}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              style={inputStyle}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: '8px',
              color: '#dc2626', fontSize: '14px',
            }}>
              ❌ {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={cargando}
            style={{
              ...btnPrimario, width: '100%',
              padding: '12px', fontSize: '16px',
              opacity: cargando ? 0.7 : 1, marginTop: '4px',
            }}
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>

      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px',
  border: '1px solid #e5e7eb', fontSize: '15px',
  fontFamily: "'Outfit', sans-serif", background: 'white',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const labelStyle = {
  fontSize: '13px', fontWeight: '600', color: '#6b7280',
  marginBottom: '4px', display: 'block',
}
const btnPrimario = {
  padding: '10px 20px', background: '#8B1E2D', color: 'white',
  border: 'none', borderRadius: '8px', fontSize: '15px',
  fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
}
