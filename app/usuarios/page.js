'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { fetchConToken } from '../../lib/fetchConToken'
import { usePermiso } from '../../lib/usePermisos'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editando, setEditando] = useState(null)
  const { verificando, permitido } = usePermiso('usuarios')

  const [form, setForm] = useState({ usuario: '', nombre: '', password: '', rol: 'vendedor', activo: true })

  useEffect(() => { obtenerUsuarios() }, [])

  if (verificando || !permitido) return null

  async function obtenerUsuarios() {
    const res = await fetchConToken('/api/usuarios')
    const data = await res.json()
    setUsuarios(data.usuarios || [])
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  function nuevoUsuario() {
    setEditando(null)
    setForm({ usuario: '', nombre: '', password: '', rol: 'vendedor', activo: true })
    setMostrarFormulario(true)
  }

  function editarUsuario(u) {
    setEditando(u)
    setForm({ usuario: u.usuario, nombre: u.nombre, password: '', rol: u.rol, activo: u.activo })
    setMostrarFormulario(true)
  }

  async function guardar() {
    if (!form.usuario || !form.nombre || !form.rol) { alert('Completar campos obligatorios'); return }
    if (!editando && !form.password) { alert('Ingresar contraseña para el nuevo usuario'); return }

    if (editando) {
      const body = { nombre: form.nombre, rol: form.rol, activo: form.activo }
      if (form.password) body.password = form.password
      const res = await fetchConToken(`/api/usuarios/${editando.id}`, { method: 'PUT', body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); alert('Error: ' + d.error); return }
      alert('✅ Usuario actualizado')
    } else {
      const res = await fetchConToken('/api/usuarios', {
        method: 'POST',
        body: JSON.stringify({ usuario: form.usuario.toLowerCase().trim(), nombre: form.nombre, password: form.password, rol: form.rol, activo: form.activo })
      })
      if (!res.ok) { const d = await res.json(); alert('Error: ' + d.error); return }
      alert('✅ Usuario creado')
    }

    setMostrarFormulario(false)
    setEditando(null)
    obtenerUsuarios()
  }

  async function toggleActivo(u) {
    await fetchConToken(`/api/usuarios/${u.id}`, { method: 'PUT', body: JSON.stringify({ activo: !u.activo }) })
    obtenerUsuarios()
  }

  const rolColor = {
    admin: { bg: '#fef2f2', color: '#dc2626' },
    director: { bg: '#eff6ff', color: '#2563eb' },
    vendedor: { bg: '#f0fdf4', color: '#16a34a' },
  }

  return (
    <div style={{ maxWidth: '750px' }}>

      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Usuarios</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Gestión de accesos al sistema</p>
        </div>
        <button onClick={nuevoUsuario} style={btnPrimario}>+ Nuevo usuario</button>
      </div>

      {mostrarFormulario && (
        <div style={card}>
          <div style={cardTitle}>{editando ? '✏️ Editar usuario' : '👤 Nuevo usuario'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Usuario *">
              <input name="usuario" placeholder="nombre.apellido" value={form.usuario} onChange={handleChange} disabled={!!editando}
                style={{ ...inputStyle, background: editando ? '#f9fafb' : 'white', color: editando ? '#9ca3af' : '#1a1a1a' }} />
            </Field>
            <Field label="Nombre completo *">
              <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label={editando ? 'Nueva contraseña (dejá vacío para no cambiar)' : 'Contraseña *'}>
              <input name="password" type="password" placeholder="Contraseña" value={form.password} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="Rol *">
              <select name="rol" value={form.rol} onChange={handleChange} style={inputStyle}>
                <option value="vendedor">Vendedor</option>
                <option value="director">Director</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} id="activo" />
            <label htmlFor="activo" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>Usuario activo</label>
          </div>
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '10px' }}>
            <button onClick={guardar} style={btnPrimario}>💾 Guardar</button>
            <button onClick={() => setMostrarFormulario(false)} style={btnSecundario}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={card}>
        <div style={cardTitle}>👥 Usuarios del sistema</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {usuarios.map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: u.activo ? '#f9fafb' : '#fafafa', borderRadius: '10px', border: `1px solid ${u.activo ? '#e5e7eb' : '#f3f4f6'}`, opacity: u.activo ? 1 : 0.6, flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a' }}>{u.nombre}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>@{u.usuario}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: rolColor[u.rol]?.bg || '#f3f4f6', color: rolColor[u.rol]?.color || '#6b7280' }}>{u.rol}</span>
                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: u.activo ? '#dcfce7' : '#fee2e2', color: u.activo ? '#16a34a' : '#dc2626' }}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                <button onClick={() => editarUsuario(u)} style={btnSecundario}>✏️ Editar</button>
                <button onClick={() => toggleActivo(u)} style={{ ...btnSecundario, color: u.activo ? '#dc2626' : '#16a34a', borderColor: u.activo ? '#fecaca' : '#bbf7d0' }}>{u.activo ? 'Desactivar' : 'Activar'}</button>
              </div>
            </div>
          ))}
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
const btnSecundario = { padding: '8px 14px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
