'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { fetchConToken } from '../../lib/fetchConToken'

export default function MiPerfil() {
  const [usuario, setUsuario] = useState(null)
  const [form, setForm] = useState({ password_actual: '', password_nueva: '', password_confirmar: '' })
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('usuario')
    if (stored) setUsuario(JSON.parse(stored))
  }, [])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(''); setExito('')
  }

  async function cambiarClave() {
    if (!form.password_actual || !form.password_nueva || !form.password_confirmar) { setError('Completar todos los campos'); return }
    if (form.password_nueva !== form.password_confirmar) { setError('La nueva contraseña no coincide'); return }
    if (form.password_nueva.length < 4) { setError('La contraseña debe tener al menos 4 caracteres'); return }
    setCargando(true)
    const res = await fetchConToken('/api/auth/cambiar-clave', {
      method: 'POST',
      body: JSON.stringify({ password_actual: form.password_actual, password_nueva: form.password_nueva })
    })
    const data = await res.json()
    setCargando(false)
    if (!res.ok) { setError(data.error || 'Error al actualizar'); return }
    setExito('✅ Contraseña actualizada correctamente')
    setForm({ password_actual: '', password_nueva: '', password_confirmar: '' })
  }

  const rolColor = {
    admin: { bg: '#fef2f2', color: '#dc2626' },
    director: { bg: '#eff6ff', color: '#2563eb' },
    vendedor: { bg: '#f0fdf4', color: '#16a34a' },
    laboratorio: { bg: '#f5f3ff', color: '#7c3aed' },
  }

  return (
    <div style={{ maxWidth: '500px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Mi Perfil</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Configuración de tu cuenta</p>
      </div>
      {usuario && (
        <div style={{ ...card, borderLeft: '4px solid #8B1E2D', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#8B1E2D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px', fontWeight: '700' }}>
              {usuario.nombre?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '17px', color: '#1a1a1a' }}>{usuario.nombre}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>@{usuario.usuario}</div>
              <span style={{ display: 'inline-block', marginTop: '6px', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: rolColor[usuario.rol]?.bg || '#f3f4f6', color: rolColor[usuario.rol]?.color || '#6b7280' }}>
                {usuario.rol}
              </span>
            </div>
          </div>
        </div>
      )}
      <div style={card}>
        <div style={cardTitle}>🔒 Cambiar contraseña</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Field label="Contraseña actual"><input name="password_actual" type="password" placeholder="Tu contraseña actual" value={form.password_actual} onChange={handleChange} style={inputStyle} /></Field>
          <Field label="Nueva contraseña"><input name="password_nueva" type="password" placeholder="Nueva contraseña" value={form.password_nueva} onChange={handleChange} style={inputStyle} /></Field>
          <Field label="Confirmar nueva contraseña"><input name="password_confirmar" type="password" placeholder="Repetí la nueva contraseña" value={form.password_confirmar} onChange={handleChange} onKeyDown={(e) => e.key === 'Enter' && cambiarClave()} style={inputStyle} /></Field>
          {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px' }}>❌ {error}</div>}
          {exito && <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', fontSize: '14px' }}>{exito}</div>}
          <button onClick={cambiarClave} disabled={cargando} style={{ ...btnPrimario, opacity: cargando ? 0.7 : 1 }}>
            {cargando ? 'Guardando...' : '💾 Cambiar contraseña'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '15px', fontFamily: "'Outfit', sans-serif", background: 'white', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const card = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const cardTitle = { fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '16px' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
