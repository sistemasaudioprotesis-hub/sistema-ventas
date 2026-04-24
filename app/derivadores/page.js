'use client'

export const dynamic = 'force-dynamic'

import { getUsuarioId } from '../../lib/getUsuario'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { normalizarTexto } from '../../lib/formatText'
import { usePermiso } from '../../lib/usePermisos'

export default function Derivadores() {
  const [derivadores, setDerivadores] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    derivador: '', especialidad: '', telefono: '', mail: '',
    observaciones: '', porcentaje: '', monto_fijo: '',
  })
  const { verificando, permitido } = usePermiso('derivadores')

  useEffect(() => { cargarDerivadores() }, [])

  if (verificando || !permitido) return null

  async function cargarDerivadores() {
    const { data } = await supabase.from('derivadores').select('*').order('derivador')
    setDerivadores(data || [])
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ derivador: '', especialidad: '', telefono: '', mail: '', observaciones: '', porcentaje: '', monto_fijo: '' })
    setMostrarForm(true)
  }

  function abrirEdicion(d) {
    setEditando(d)
    setForm({
      derivador: d.derivador || '',
      especialidad: d.especialidad || '',
      telefono: d.telefono || '',
      mail: d.mail || '',
      observaciones: d.observaciones || '',
      porcentaje: d.porcentaje || '',
      monto_fijo: d.monto_fijo || '',
    })
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditando(null)
    setForm({ derivador: '', especialidad: '', telefono: '', mail: '', observaciones: '', porcentaje: '', monto_fijo: '' })
  }

  async function guardar() {
    if (!form.derivador) { alert('Ingresar nombre del derivador'); return }
    if (!form.porcentaje && !form.monto_fijo) { alert('Ingresar porcentaje o monto fijo de comisión'); return }

    const data = {
      derivador: normalizarTexto(form.derivador),
      especialidad: form.especialidad ? normalizarTexto(form.especialidad) : null,
      telefono: form.telefono || null,
      mail: form.mail || null,
      observaciones: form.observaciones || null,
      porcentaje: form.porcentaje ? Number(form.porcentaje) : null,
      monto_fijo: form.monto_fijo ? Number(form.monto_fijo) : null,
    }

    if (editando) {
      await supabase.from('derivadores').update(data).eq('id', editando.id)
    } else {
      await supabase.from('derivadores').insert([{ ...data, activo: true, creado_por: getUsuarioId() }])
    }

    cerrarForm()
    cargarDerivadores()
  }

  async function toggleActivo(d) {
    await supabase.from('derivadores').update({ activo: !d.activo }).eq('id', d.id)
    cargarDerivadores()
  }

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

  return (
    <div style={{ maxWidth: '720px' }}>

      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Derivadores</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Gestión de derivadores y comisiones</p>
        </div>
        <button onClick={abrirNuevo} style={btnPrimario}>+ Nuevo derivador</button>
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <div style={card}>
          <div style={{ ...cardTitle, marginBottom: '16px' }}>{editando ? '✏️ Editar derivador' : '➕ Nuevo derivador'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Nombre *">
                <input placeholder="Apellido Nombre" value={form.derivador} onChange={(e) => setForm({ ...form, derivador: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="Especialidad">
                <input placeholder="Ej: Fonoaudióloga, ORL..." value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Teléfono">
                <input placeholder="11 1234-5678" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="Mail">
                <input placeholder="correo@ejemplo.com" value={form.mail} onChange={(e) => setForm({ ...form, mail: e.target.value })} style={inputStyle} />
              </Field>
            </div>

            {/* Comisión */}
            <div style={{ padding: '14px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>💰 Comisión por defecto</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>Podés definir porcentaje, monto fijo, o ambos. Al asignar a una venta se puede modificar.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="Porcentaje (%)">
                  <input type="number" placeholder="Ej: 5" value={form.porcentaje} onChange={(e) => setForm({ ...form, porcentaje: e.target.value })} style={inputStyle} />
                </Field>
                <Field label="Monto fijo ($)">
                  <input type="number" placeholder="Ej: 50000" value={form.monto_fijo} onChange={(e) => setForm({ ...form, monto_fijo: e.target.value })} style={inputStyle} />
                </Field>
              </div>
            </div>

            <Field label="Observaciones">
              <textarea placeholder="Notas sobre el derivador..." value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
            <button onClick={guardar} style={btnPrimario}>💾 Guardar</button>
            <button onClick={cerrarForm} style={btnSecundario}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div style={card}>
        <div style={{ ...cardTitle, marginBottom: '16px' }}>
          Derivadores registrados
          <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>({derivadores.length})</span>
        </div>
        {derivadores.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay derivadores registrados</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {derivadores.map(d => (
              <div key={d.id} style={{
                padding: '14px 16px', background: d.activo ? '#f9fafb' : '#fafafa',
                borderRadius: '10px', border: '1px solid #e5e7eb',
                opacity: d.activo ? 1 : 0.6,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a1a' }}>{d.derivador}</div>
                    {d.especialidad && <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{d.especialidad}</div>}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {d.porcentaje && (
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#8B1E2D', background: '#fdf2f4', padding: '2px 8px', borderRadius: '20px', border: '1px solid #f5c2c9' }}>
                          {d.porcentaje}%
                        </span>
                      )}
                      {d.monto_fijo && (
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#15803d', background: '#f0fdf4', padding: '2px 8px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                          {fmt(d.monto_fijo)} fijo
                        </span>
                      )}
                      {d.telefono && <span style={{ fontSize: '12px', color: '#6b7280' }}>📞 {d.telefono}</span>}
                      {d.mail && <span style={{ fontSize: '12px', color: '#6b7280' }}>✉️ {d.mail}</span>}
                    </div>
                    {d.observaciones && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{d.observaciones}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => abrirEdicion(d)} style={{ ...btnSecundario, fontSize: '12px', padding: '6px 12px', color: '#8B1E2D', borderColor: '#f5c2c9' }}>✏️ Editar</button>
                    <button onClick={() => toggleActivo(d)} style={{ ...btnSecundario, fontSize: '12px', padding: '6px 12px', color: d.activo ? '#dc2626' : '#16a34a', borderColor: d.activo ? '#fecaca' : '#bbf7d0' }}>
                      {d.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
const cardTitle = { fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '0' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
