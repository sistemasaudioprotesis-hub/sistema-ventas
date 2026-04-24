'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { normalizarTexto } from '../../lib/formatText'
import { getUsuarioId } from '../../lib/getUsuario'
import { usePermiso } from '../../lib/usePermisos'

export default function ObrasSociales() {
  const [obrasSociales, setObrasSociales] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editando, setEditando] = useState(null)
  const { verificando, permitido } = usePermiso('configuracion')

  const [form, setForm] = useState({
    obra_social: '',
    observaciones: '',
  })

  useEffect(() => {
    obtenerObrasSociales()
  }, [])

    if (verificando || !permitido) return null

  async function obtenerObrasSociales() {
    const { data } = await supabase
      .from('obras_sociales')
      .select('*')
      .order('obra_social')
    setObrasSociales(data || [])
  }

  function nueva() {
    setEditando(null)
    setForm({ obra_social: '', observaciones: '' })
    setMostrarFormulario(true)
  }

  function editar(o) {
    setEditando(o.id)
    setForm({ obra_social: o.obra_social, observaciones: o.observaciones || '' })
    setMostrarFormulario(true)
  }

  async function guardar() {
    if (!form.obra_social) { alert('Ingresar nombre de la obra social'); return }

    const nombre = normalizarTexto(form.obra_social)

    // Verificar duplicado
    let query = supabase.from('obras_sociales').select('id').ilike('obra_social', nombre)
    if (editando) query = query.neq('id', editando)
    const { data: existe } = await query.maybeSingle()
    if (existe) { alert('❌ Esa obra social ya existe'); return }

    if (editando) {
      const { error } = await supabase.from('obras_sociales').update({
        obra_social: nombre,
        observaciones: form.observaciones || null,
      }).eq('id', editando)
      if (error) { alert('Error: ' + error.message); return }
      alert('✅ Obra social actualizada')
    } else {
      const { error } = await supabase.from('obras_sociales').insert([{
        obra_social: nombre,
        observaciones: form.observaciones || null,
        creado_por: getUsuarioId(),
      }])
      if (error) { alert('Error: ' + error.message); return }
      alert('✅ Obra social creada')
    }

    setMostrarFormulario(false)
    setEditando(null)
    obtenerObrasSociales()
  }

  return (
    <div style={{ maxWidth: '700px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Obras Sociales</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Gestión de obras sociales y prepagas</p>
        </div>
        <button onClick={nueva} style={btnPrimario}>+ Nueva obra social</button>
      </div>

      {/* Formulario */}
      {mostrarFormulario && (
        <div style={card}>
          <div style={cardTitle}>{editando ? '✏️ Editar obra social' : '➕ Nueva obra social'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <Field label="Nombre *">
              <input
                placeholder="Ej: OSDE"
                value={form.obra_social}
                onChange={(e) => setForm({ ...form, obra_social: e.target.value })}
                style={{ ...inputStyle, textTransform: 'uppercase' }}
              />
            </Field>

            <Field label="Observaciones">
              <textarea
                placeholder="Observaciones opcionales..."
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </Field>

          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
            <button onClick={guardar} style={btnPrimario}>💾 Guardar</button>
            <button onClick={() => setMostrarFormulario(false)} style={btnSecundario}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div style={card}>
        <div style={cardTitle}>
          Lista de obras sociales
          <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>
            ({obrasSociales.length} registros)
          </span>
        </div>

        {obrasSociales.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
            No hay obras sociales cargadas
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {obrasSociales.map(o => (
              <div key={o.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: '#f9fafb',
                borderRadius: '8px', border: '1px solid #e5e7eb',
                flexWrap: 'wrap', gap: '8px',
              }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a' }}>
                    {o.obra_social}
                  </div>
                  {o.observaciones && (
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                      {o.observaciones}
                    </div>
                  )}
                </div>
                <button onClick={() => editar(o)} style={btnSecundario}>✏️ Editar</button>
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

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
  fontSize: '15px', fontFamily: "'Outfit', sans-serif", background: 'white',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}

const card = {
  background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px',
  padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const cardTitle = {
  fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '16px',
}

const btnPrimario = {
  padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
}

const btnSecundario = {
  padding: '8px 14px', background: 'white', color: '#374151', border: '1px solid #e5e7eb',
  borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
}
