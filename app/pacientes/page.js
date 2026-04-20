'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { normalizarTexto } from '../../lib/formatText'

export default function Pacientes() {
  const searchParams = useSearchParams()
  const dniParam = searchParams.get('dni')

  const [provincias, setProvincias] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [pacienteId, setPacienteId] = useState(null)
  const [guardado, setGuardado] = useState(false)

  const [form, setForm] = useState({
    apellido_paciente: '',
    nombres_paciente: '',
    dni: '',
    telefono: '',
    domicilio: '',
    localidad: '',
    provincia_id: '',
    mail: '',
    observaciones: '',
  })

  useEffect(() => {
    obtenerProvincias()
    if (dniParam) {
      setBusqueda(dniParam)
      cargarPacientePorDni(dniParam)
    }
  }, [])

  async function obtenerProvincias() {
    const { data } = await supabase.from('provincias').select('*')
    setProvincias(data || [])
  }

  function handleChange(e) {
    const { name, value } = e.target
    const camposTexto = ['apellido_paciente', 'nombres_paciente', 'domicilio', 'localidad', 'observaciones', 'mail']
    const nuevoValor = camposTexto.includes(name) ? normalizarTexto(value) : value
    setForm({ ...form, [name]: nuevoValor })
    setGuardado(false)
  }

  function limpiarFormulario() {
    setPacienteId(null)
    setBusqueda('')
    setResultados([])
    setGuardado(false)
    setForm({ apellido_paciente: '', nombres_paciente: '', dni: '', telefono: '', domicilio: '', localidad: '', provincia_id: '', mail: '', observaciones: '' })
  }

  async function buscarPaciente() {
    const valor = busqueda.trim()
    if (!valor) { alert('Ingresar DNI o apellido'); return }

    let query = supabase.from('pacientes').select('*')
    if (/^\d+$/.test(valor)) {
      query = query.eq('dni', valor)
    } else {
      query = query.ilike('apellido_paciente', `%${valor}%`)
    }

    const { data, error } = await query.order('apellido_paciente')
    if (error) { alert('Error buscando pacientes'); return }
    if (!data || data.length === 0) { alert('No se encontraron resultados'); setResultados([]); return }
    setResultados(data)
  }

  async function cargarPacientePorDni(dni) {
    const { data } = await supabase.from('pacientes').select('*').eq('dni', dni).maybeSingle()
    if (data) {
      setPacienteId(data.id)
      setForm({
        apellido_paciente: data.apellido_paciente || '',
        nombres_paciente: data.nombres_paciente || '',
        dni: data.dni || '',
        telefono: data.telefono || '',
        domicilio: data.domicilio || '',
        localidad: data.localidad || '',
        provincia_id: data.provincia_id ? String(data.provincia_id) : '',
        mail: data.mail || '',
        observaciones: data.observaciones || '',
      })
      setGuardado(true)
    }
  }

  async function guardar(destino) {
    if (!form.apellido_paciente || !form.nombres_paciente || !form.dni) { alert('Completar campos obligatorios'); return }
    if (!form.provincia_id) { alert('Seleccionar provincia'); return }

    if (pacienteId) {
      const { data: pacienteActual } = await supabase.from('pacientes').select('*').eq('id', pacienteId).single()
      await supabase.from('pacientes_historial').insert([{
        paciente_id: pacienteId,
        apellido_paciente: pacienteActual.apellido_paciente,
        nombres_paciente: pacienteActual.nombres_paciente,
        telefono: pacienteActual.telefono,
        domicilio: pacienteActual.domicilio,
        localidad: pacienteActual.localidad,
        provincia_id: pacienteActual.provincia_id,
        mail: pacienteActual.mail,
        observaciones: pacienteActual.observaciones,
        creado_por: 1,
      }])
      await supabase.from('pacientes').update({ ...form, provincia_id: Number(form.provincia_id) }).eq('id', pacienteId)
      alert('Paciente actualizado')
    } else {
      await supabase.from('pacientes').insert([{ ...form, provincia_id: Number(form.provincia_id), creado_por: 1 }])
      alert('Paciente creado')
    }

    setGuardado(true)

    if (destino === 'ventas') window.location.href = `/ventas?dni=${form.dni}`
    if (destino === 'pagos') window.location.href = `/pagos?dni=${form.dni}`
    if (!destino) limpiarFormulario()
  }

  return (
    <div style={{ maxWidth: '720px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Pacientes</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
            {pacienteId ? `Editando: ${form.apellido_paciente} ${form.nombres_paciente}` : 'Alta y búsqueda de pacientes'}
          </p>
        </div>
        {pacienteId && (
          <button onClick={limpiarFormulario} style={btnSecundario}>+ Nuevo paciente</button>
        )}
      </div>

      {/* Buscador */}
      <div style={card}>
        <div style={cardTitle}>🔍 Buscar paciente</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            placeholder="DNI o Apellido"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarPaciente()}
            style={{ ...inputStyle, flex: 1, minWidth: '180px' }}
          />
          <button onClick={buscarPaciente} style={btnPrimario}>Buscar</button>
          {!pacienteId && <button onClick={limpiarFormulario} style={btnSecundario}>+ Nuevo</button>}
        </div>

        {resultados.length > 0 && (
          <select value="" onChange={(e) => {
            const p = resultados.find(x => x.id == e.target.value)
            if (!p) return
            setPacienteId(p.id)
            setForm({
              apellido_paciente: p.apellido_paciente || '',
              nombres_paciente: p.nombres_paciente || '',
              dni: p.dni || '',
              telefono: p.telefono || '',
              domicilio: p.domicilio || '',
              localidad: p.localidad || '',
              provincia_id: p.provincia_id ? String(p.provincia_id) : '',
              mail: p.mail || '',
              observaciones: p.observaciones || '',
            })
            setResultados([])
            setGuardado(true)
          }} style={{ ...inputStyle, marginTop: '10px' }}>
            <option value="">Seleccionar paciente ({resultados.length} encontrados)</option>
            {resultados.map(p => (
              <option key={p.id} value={p.id}>{p.apellido_paciente} {p.nombres_paciente} — DNI: {p.dni}</option>
            ))}
          </select>
        )}
      </div>

      {/* Formulario */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={cardTitle}>{pacienteId ? '✏️ Editar paciente' : '👤 Nuevo paciente'}</div>
          {pacienteId && (
            <a href={`/historial-pacientes?dni=${form.dni}`} style={{ fontSize: '13px', color: '#8B1E2D', fontWeight: '600', textDecoration: 'none' }}>
              Ver historial →
            </a>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Apellido *">
              <input name="apellido_paciente" placeholder="Apellido" value={form.apellido_paciente} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="Nombre *">
              <input name="nombres_paciente" placeholder="Nombre" value={form.nombres_paciente} onChange={handleChange} style={inputStyle} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="DNI *">
              <input name="dni" placeholder="DNI" value={form.dni} onChange={handleChange} disabled={pacienteId !== null} style={{ ...inputStyle, background: pacienteId ? '#f9fafb' : 'white', color: pacienteId ? '#9ca3af' : '#1a1a1a' }} />
            </Field>
            <Field label="Teléfono">
              <input name="telefono" placeholder="Teléfono" value={form.telefono} onChange={handleChange} style={inputStyle} />
            </Field>
          </div>

          <Field label="Domicilio">
            <input name="domicilio" placeholder="Domicilio" value={form.domicilio} onChange={handleChange} style={inputStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Localidad">
              <input name="localidad" placeholder="Localidad" value={form.localidad} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="Provincia *">
              <select name="provincia_id" value={form.provincia_id} onChange={handleChange} style={inputStyle}>
                <option value="">Seleccionar provincia</option>
                {provincias.map(p => <option key={p.id} value={p.id}>{p.provincia}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Mail">
            <input name="mail" placeholder="correo@ejemplo.com" value={form.mail} onChange={handleChange} style={inputStyle} />
          </Field>

          <Field label="Observaciones">
            <textarea name="observaciones" placeholder="Observaciones..." value={form.observaciones} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          {/* Botones */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>

            {/* Guardar */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <button onClick={() => guardar('')} style={btnPrimario}>💾 Guardar</button>
              <button onClick={() => guardar('ventas')} style={btnSecundario}>Guardar e ir a Ventas</button>
              <button onClick={() => guardar('pagos')} style={btnSecundario}>Guardar e ir a Pagos</button>
            </div>

            {/* Ir sin guardar — solo si hay paciente cargado */}
            {pacienteId && guardado && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => window.location.href = `/ventas?dni=${form.dni}`} style={btnFantasma}>
                  → Ir a Ventas sin guardar
                </button>
                <button onClick={() => window.location.href = `/pagos?dni=${form.dni}`} style={btnFantasma}>
                  → Ir a Pagos sin guardar
                </button>
              </div>
            )}

          </div>
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

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  fontSize: '15px',
  fontFamily: "'Outfit', sans-serif",
  background: 'white',
  color: '#1a1a1a',
  outline: 'none',
  boxSizing: 'border-box',
}

const card = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '20px 24px',
  marginBottom: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const cardTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '0',
}

const btnPrimario = {
  padding: '10px 20px',
  background: '#8B1E2D',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600',
  cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
}

const btnSecundario = {
  padding: '10px 20px',
  background: 'white',
  color: '#374151',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '500',
  cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
}

const btnFantasma = {
  padding: '8px 16px',
  background: 'transparent',
  color: '#8B1E2D',
  border: '1px dashed #8B1E2D',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: '500',
  cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
}
