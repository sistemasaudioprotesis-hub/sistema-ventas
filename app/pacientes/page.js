'use client'

export const dynamic = 'force-dynamic'

import { getUsuarioId } from '../../lib/getUsuario'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { normalizarTexto } from '../../lib/formatText'

const ESTADOS_REPARACION = {
  ingresada: { label: 'Ingresada', color: '#4b5563', bg: '#f3f4f6' },
  en_evaluacion: { label: 'En evaluación', color: '#6d28d9', bg: '#f5f3ff' },
  esperando_respuesta: { label: 'Esperando respuesta', color: '#92400e', bg: '#fffbeb' },
  aprobada: { label: 'Aprobada', color: '#0e7490', bg: '#ecfeff' },
  en_reparacion: { label: 'En reparación', color: '#1d4ed8', bg: '#eff6ff' },
  lista_entregar: { label: 'Lista para entregar', color: '#15803d', bg: '#f0fdf4' },
  entregada: { label: 'Entregada', color: '#374151', bg: '#f9fafb' },
  no_aprobada: { label: 'No aprobada', color: '#dc2626', bg: '#fef2f2' },
  no_aprobada_devuelta: { label: 'No aprobada - Devuelta', color: '#9ca3af', bg: '#f3f4f6' },
}

export default function Pacientes() {
  const searchParams = useSearchParams()
  const dniParam = searchParams.get('dni')

  const [provincias, setProvincias] = useState([])
  const [obrasSociales, setObrasSociales] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [pacienteId, setPacienteId] = useState(null)
  const [guardado, setGuardado] = useState(false)
  const [tab, setTab] = useState('datos')

  // Visitas
  const [visitas, setVisitas] = useState([])
  const [motivos, setMotivos] = useState([])
  const [busquedaMotivo, setBusquedaMotivo] = useState('')
  const [mostrarFormVisita, setMostrarFormVisita] = useState(false)
  const [mostrarABMMotivos, setMostrarABMMotivos] = useState(false)
  const [nuevoMotivo, setNuevoMotivo] = useState('')
  const [formVisita, setFormVisita] = useState({ motivo_id: '', observaciones: '', venta_id: '' })
  const [ventasPaciente, setVentasPaciente] = useState([])

  // Turnos
  const [turnos, setTurnos] = useState([])

  // Ventas y pagos
  const [ventasConPagos, setVentasConPagos] = useState([])

  // Reparaciones
  const [reparaciones, setReparaciones] = useState([])

  // Historial
  const [historial, setHistorial] = useState([])
  const [provinciasMap, setProvinciasMap] = useState({})

  const [form, setForm] = useState({
    apellido_paciente: '', nombres_paciente: '', dni: '', telefono: '',
    domicilio: '', localidad: '', provincia_id: '', mail: '', observaciones: '', obra_social_id: '',
  })

  useEffect(() => {
    obtenerProvincias()
    obtenerObrasSociales()
    obtenerMotivos()
    if (dniParam) {
      setBusqueda(dniParam)
      cargarPacientePorDni(dniParam)
    }
  }, [])

  async function obtenerProvincias() {
    const { data } = await supabase.from('provincias').select('*')
    setProvincias(data || [])
    const map = {}
    ;(data || []).forEach(p => { map[p.id] = p.provincia })
    setProvinciasMap(map)
  }

  async function obtenerObrasSociales() {
    const { data } = await supabase.from('obras_sociales').select('*').order('obra_social')
    setObrasSociales(data || [])
  }

  async function obtenerMotivos() {
    const { data } = await supabase.from('visita_motivos').select('*').eq('activo', true).order('motivo')
    setMotivos(data || [])
  }

  function handleChange(e) {
    const { name, value } = e.target
    const camposTexto = ['apellido_paciente', 'nombres_paciente', 'domicilio', 'localidad', 'observaciones', 'mail']
    const nuevoValor = camposTexto.includes(name) ? normalizarTexto(value) : value
    setForm({ ...form, [name]: nuevoValor })
    setGuardado(false)
  }

  function limpiarFormulario() {
    setPacienteId(null); setBusqueda(''); setResultados([]); setGuardado(false); setTab('datos')
    setVisitas([]); setVentasPaciente([]); setTurnos([]); setHistorial([])
    setVentasConPagos([]); setReparaciones([])
    setForm({ apellido_paciente: '', nombres_paciente: '', dni: '', telefono: '', domicilio: '', localidad: '', provincia_id: '', mail: '', observaciones: '', obra_social_id: '' })
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

  function cargarDesdeObjeto(p) {
    setPacienteId(p.id)
    setForm({
      apellido_paciente: p.apellido_paciente || '', nombres_paciente: p.nombres_paciente || '',
      dni: p.dni || '', telefono: p.telefono || '', domicilio: p.domicilio || '',
      localidad: p.localidad || '', provincia_id: p.provincia_id ? String(p.provincia_id) : '',
      mail: p.mail || '', observaciones: p.observaciones || '',
      obra_social_id: p.obra_social_id ? String(p.obra_social_id) : '',
    })
    setGuardado(true)
    cargarVisitas(p.id)
    cargarVentasPaciente(p.id)
    cargarTurnos(p.id)
    cargarHistorial(p.id)
    cargarVentasConPagos(p.id)
    cargarReparaciones(p.id)
  }

  async function cargarPacientePorDni(dni) {
    const { data } = await supabase.from('pacientes').select('*').eq('dni', dni).maybeSingle()
    if (data) cargarDesdeObjeto(data)
  }

  async function cargarVisitas(pid) {
    const { data } = await supabase.from('visitas')
      .select(`id, fecha, observaciones, created_at, atendido_por, visita_motivos (motivo), ventas (id, fecha, total_pesos, total_dolares)`)
      .eq('paciente_id', pid).order('fecha', { ascending: false })
    setVisitas(data || [])
  }

  async function cargarVentasPaciente(pid) {
    const { data } = await supabase.from('ventas').select('id, fecha, total_pesos, total_dolares').eq('paciente_id', pid).order('fecha', { ascending: false })
    setVentasPaciente(data || [])
  }

  async function cargarVentasConPagos(pid) {
    const { data: ventasData } = await supabase.from('ventas')
      .select(`id, fecha, confirmada, total_pesos, total_dolares, obras_sociales (obra_social),
        venta_detalle (id, precio_venta_pesos, precio_venta_usd, numeros_serie (numero_serie, productos (producto)), productos (producto))`)
      .eq('paciente_id', pid).order('fecha', { ascending: false })
    const ventasConSaldo = await Promise.all((ventasData || []).map(async v => {
      const { data: pagos } = await supabase.from('pagos').select('id, monto_pesos, monto_usd, fecha_pago, formas_pago (forma_pago)').eq('venta_id', v.id).order('fecha_pago')
      const pagadoP = (pagos || []).reduce((acc, p) => acc + (Number(p.monto_pesos) || 0), 0)
      const pagadoU = (pagos || []).reduce((acc, p) => acc + (Number(p.monto_usd) || 0), 0)
      return { ...v, pagos: pagos || [], pagadoPesos: pagadoP, pagadoUSD: pagadoU }
    }))
    setVentasConPagos(ventasConSaldo)
  }

  async function cargarTurnos(pid) {
    const { data } = await supabase.from('turnos')
      .select(`id, fecha, hora, estado, observaciones, asistio, profesionales (nombre), visita_motivos (motivo), obras_sociales (obra_social)`)
      .eq('paciente_id', pid).order('fecha', { ascending: false }).order('hora', { ascending: false })
    setTurnos(data || [])
  }

  async function cargarReparaciones(pid) {
    const { data } = await supabase.from('visitas')
      .select(`id, fecha, observaciones, marca, costo_pesos, costo_usd, respuesta_paciente, fecha_entrega, numero_orden, ventas (id, total_pesos, total_dolares)`)
      .eq('paciente_id', pid).eq('es_reparacion', true)
      .order('numero_orden', { ascending: false })
    setReparaciones(data || [])
  }

  async function cargarHistorial(pid) {
    const { data } = await supabase.from('pacientes_historial')
      .select('*, usuarios:creado_por (nombre)').eq('paciente_id', pid).order('created_at', { ascending: false })
    setHistorial(data || [])
  }

  async function guardar(destino) {
   if (!form.apellido_paciente || !form.nombres_paciente || !form.dni || !form.telefono) { alert('Completar campos obligatorios'); return }
    if (!form.provincia_id) { alert('Seleccionar provincia'); return }
    const dataGuardar = { ...form, provincia_id: Number(form.provincia_id), obra_social_id: form.obra_social_id ? Number(form.obra_social_id) : null }
    if (pacienteId) {
      const { data: pacienteActual } = await supabase.from('pacientes').select('*').eq('id', pacienteId).single()
      await supabase.from('pacientes_historial').insert([{
        paciente_id: pacienteId, apellido_paciente: pacienteActual.apellido_paciente,
        nombres_paciente: pacienteActual.nombres_paciente, telefono: pacienteActual.telefono,
        domicilio: pacienteActual.domicilio, localidad: pacienteActual.localidad,
        provincia_id: pacienteActual.provincia_id, mail: pacienteActual.mail,
        observaciones: pacienteActual.observaciones, creado_por: getUsuarioId(),
      }])
      await supabase.from('pacientes').update(dataGuardar).eq('id', pacienteId)
      alert('Paciente actualizado')
      cargarHistorial(pacienteId)
    } else {
      await supabase.from('pacientes').insert([{ ...dataGuardar, creado_por: getUsuarioId() }])
      alert('Paciente creado')
    }
    setGuardado(true)
    if (destino === 'ventas') window.location.href = `/ventas?dni=${form.dni}`
    if (destino === 'pagos') window.location.href = `/pagos?dni=${form.dni}`
    if (!destino) limpiarFormulario()
  }

  async function guardarVisita() {
    if (!pacienteId) { alert('Primero seleccioná un paciente'); return }
    if (!formVisita.motivo_id) { alert('Seleccionar motivo'); return }
    const { error } = await supabase.from('visitas').insert([{
      paciente_id: pacienteId, fecha: new Date().toISOString(),
      motivo_id: Number(formVisita.motivo_id), observaciones: formVisita.observaciones || null,
      venta_id: formVisita.venta_id ? Number(formVisita.venta_id) : null,
      atendido_por: getUsuarioId(), creado_por: getUsuarioId(), 
    }])
    if (error) { alert('Error: ' + error.message); return }
    const pid = pacienteId
    const { data: nuevasVisitas } = await supabase.from('visitas')
      .select(`id, fecha, observaciones, created_at, atendido_por, visita_motivos (motivo), ventas (id, fecha, total_pesos, total_dolares)`)
      .eq('paciente_id', pid).eq('es_reparacion', false).order('fecha', { ascending: false })
    setVisitas(nuevasVisitas || [])
    setFormVisita({ motivo_id: '', observaciones: '', venta_id: '' })
    setMostrarFormVisita(false); setBusquedaMotivo('')
    alert('✅ Visita registrada')
  }

  async function eliminarVisita(id) {
    if (!confirm('¿Eliminar esta visita?')) return
    await supabase.from('visitas').delete().eq('id', id)
    cargarVisitas(pacienteId)
  }

  async function guardarMotivo() {
    if (!nuevoMotivo) { alert('Ingresar nombre del motivo'); return }
    const nombre = normalizarTexto(nuevoMotivo)
    const { data: existe } = await supabase.from('visita_motivos').select('id').ilike('motivo', nombre).maybeSingle()
    if (existe) { alert('❌ Ese motivo ya existe'); return }
    await supabase.from('visita_motivos').insert([{ motivo: nombre, creado_por: getUsuarioId() }])
    setNuevoMotivo(''); obtenerMotivos()
  }

  async function toggleMotivo(m) {
    await supabase.from('visita_motivos').update({ activo: !m.activo }).eq('id', m.id)
    obtenerMotivos()
  }

  const motivosFiltrados = motivos.filter(m => m.motivo.toLowerCase().includes(busquedaMotivo.toLowerCase()))
  const fmtFecha = (f) => new Date(f).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
  const fmtFechaCorta = (f) => f ? new Date(f + 'T12:00:00').toLocaleDateString('es-AR') : '-'
  const fmtHora = (f) => new Date(f).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
  const fmtUSD = (n) => `U$S ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const hoy = new Date().toISOString().split('T')[0]
  const turnosFuturos = turnos.filter(t => t.fecha >= hoy && t.estado !== 'cancelado')
  const turnosPasados = turnos.filter(t => t.fecha < hoy || t.estado === 'cancelado')
  const reparacionesActivas = reparaciones.filter(r => !['entregada', 'no_aprobada_devuelta'].includes(r.respuesta_paciente))
  const reparacionesCerradas = reparaciones.filter(r => ['entregada', 'no_aprobada_devuelta'].includes(r.respuesta_paciente))

  const coloresEstado = {
    pendiente: { bg: '#fef3c7', color: '#92400e' },
    realizado: { bg: '#dcfce7', color: '#15803d' },
    no_asistio: { bg: '#fef2f2', color: '#dc2626' },
    cancelado: { bg: '#f3f4f6', color: '#6b7280' },
  }

  return (
    <div style={{ maxWidth: '720px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Pacientes</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
            {pacienteId ? `${form.apellido_paciente} ${form.nombres_paciente}` : 'Alta y búsqueda de pacientes'}
          </p>
        </div>
        {pacienteId && <button onClick={limpiarFormulario} style={btnSecundario}>+ Nuevo paciente</button>}
      </div>

      {/* Buscador */}
      <div style={card}>
        <div style={cardTitle}>🔍 Buscar paciente</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input placeholder="DNI o Apellido" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscarPaciente()} style={{ ...inputStyle, flex: 1, minWidth: '180px' }} />
          <button onClick={buscarPaciente} style={btnPrimario}>Buscar</button>
          {!pacienteId && <button onClick={limpiarFormulario} style={btnSecundario}>+ Nuevo</button>}
        </div>
        {resultados.length > 0 && (
          <select value="" onChange={(e) => {
            const p = resultados.find(x => x.id == e.target.value)
            if (!p) return
            setResultados([]); cargarDesdeObjeto(p)
          }} style={{ ...inputStyle, marginTop: '10px' }}>
            <option value="">Seleccionar paciente ({resultados.length} encontrados)</option>
            {resultados.map(p => <option key={p.id} value={p.id}>{p.apellido_paciente} {p.nombres_paciente} — DNI: {p.dni}</option>)}
          </select>
        )}
      </div>

      {/* Tabs */}
      {pacienteId && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            ['datos', '👤 Datos'],
            ['visitas', `📋 Visitas (${visitas.length})`],
            ['turnos', `📅 Turnos (${turnos.filter(t => t.estado !== 'cancelado').length})`],
            ['ventas', `💰 Ventas (${ventasConPagos.length})`],
            ['reparaciones', `🔧 Reparaciones (${reparaciones.length})`],
            ['historial', `🕐 Historial datos (${historial.length})`],
          ].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)} style={{
              padding: '9px 20px', borderRadius: '8px', border: '1px solid #e5e7eb',
              background: tab === val ? '#8B1E2D' : 'white',
              color: tab === val ? 'white' : '#374151',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
            }}>{label}</button>
          ))}
        </div>
      )}

      {/* TAB DATOS */}
      {tab === 'datos' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={cardTitle}>{pacienteId ? '✏️ Editar paciente' : '👤 Nuevo paciente'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Apellido *"><input name="apellido_paciente" placeholder="Apellido" value={form.apellido_paciente} onChange={handleChange} style={inputStyle} /></Field>
              <Field label="Nombre *"><input name="nombres_paciente" placeholder="Nombre" value={form.nombres_paciente} onChange={handleChange} style={inputStyle} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="DNI *"><input name="dni" placeholder="DNI" value={form.dni} onChange={handleChange} disabled={pacienteId !== null} style={{ ...inputStyle, background: pacienteId ? '#f9fafb' : 'white', color: pacienteId ? '#9ca3af' : '#1a1a1a' }} /></Field>
              <Field label="Teléfono *"><input name="telefono" placeholder="Teléfono" value={form.telefono} onChange={handleChange} style={inputStyle} /></Field>
            </div>
            <Field label="Domicilio"><input name="domicilio" placeholder="Domicilio" value={form.domicilio} onChange={handleChange} style={inputStyle} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Localidad"><input name="localidad" placeholder="Localidad" value={form.localidad} onChange={handleChange} style={inputStyle} /></Field>
              <Field label="Provincia *">
                <select name="provincia_id" value={form.provincia_id} onChange={handleChange} style={inputStyle}>
                  <option value="">Seleccionar provincia</option>
                  {provincias.map(p => <option key={p.id} value={p.id}>{p.provincia}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Mail"><input name="mail" placeholder="correo@ejemplo.com" value={form.mail} onChange={handleChange} style={inputStyle} /></Field>
              <Field label="Obra Social">
                <select name="obra_social_id" value={form.obra_social_id} onChange={handleChange} style={inputStyle}>
                  <option value="">Sin obra social</option>
                  {obrasSociales.map(o => <option key={o.id} value={o.id}>{o.obra_social}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Observaciones"><textarea name="observaciones" placeholder="Observaciones..." value={form.observaciones} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
            <div style={{ paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <button onClick={() => guardar('')} style={btnPrimario}>💾 Guardar</button>
                <button onClick={() => guardar('ventas')} style={btnSecundario}>Guardar e ir a Ventas</button>
                <button onClick={() => guardar('pagos')} style={btnSecundario}>Guardar e ir a Pagos</button>
              </div>
              {pacienteId && guardado && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={() => window.location.href = `/ventas?dni=${form.dni}`} style={btnFantasma}>→ Ir a Ventas sin guardar</button>
                  <button onClick={() => window.location.href = `/pagos?dni=${form.dni}`} style={btnFantasma}>→ Ir a Pagos sin guardar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB VISITAS */}
      {tab === 'visitas' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button onClick={() => setMostrarFormVisita(!mostrarFormVisita)} style={btnPrimario}>{mostrarFormVisita ? '✕ Cancelar' : '+ Nueva visita'}</button>
            <button onClick={() => setMostrarABMMotivos(!mostrarABMMotivos)} style={btnFantasma}>⚙️ Gestionar motivos</button>
          </div>
          {mostrarABMMotivos && (
            <div style={{ ...card, marginBottom: '16px' }}>
              <div style={{ ...cardTitle, marginBottom: '14px' }}>⚙️ Motivos de visita</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input placeholder="Nuevo motivo..." value={nuevoMotivo} onChange={(e) => setNuevoMotivo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guardarMotivo()} style={{ ...inputStyle, flex: 1, textTransform: 'uppercase' }} />
                <button onClick={guardarMotivo} style={btnPrimario}>+ Agregar</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {motivos.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: m.activo ? '#1a1a1a' : '#9ca3af' }}>{m.motivo}</span>
                    <button onClick={() => toggleMotivo(m)} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: m.activo ? '#fef2f2' : '#f0fdf4', color: m.activo ? '#dc2626' : '#16a34a' }}>
                      {m.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {mostrarFormVisita && (
            <div style={card}>
              <div style={{ ...cardTitle, marginBottom: '14px' }}>📋 Nueva visita</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Field label="Motivo *">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input placeholder="Buscar motivo..." value={busquedaMotivo} onChange={(e) => setBusquedaMotivo(e.target.value)} style={inputStyle} />
                    <select value={formVisita.motivo_id} onChange={(e) => setFormVisita({ ...formVisita, motivo_id: e.target.value })} style={inputStyle}>
                      <option value="">Seleccionar motivo</option>
                      {motivosFiltrados.map(m => <option key={m.id} value={m.id}>{m.motivo}</option>)}
                    </select>
                  </div>
                </Field>
                <Field label="Venta relacionada (opcional)">
                  <select value={formVisita.venta_id} onChange={(e) => setFormVisita({ ...formVisita, venta_id: e.target.value })} style={inputStyle}>
                    <option value="">Sin venta relacionada</option>
                    {ventasPaciente.map(v => <option key={v.id} value={v.id}>Venta #{v.id} — {new Date(v.fecha).toLocaleDateString('es-AR')}{v.total_pesos ? ` · $${v.total_pesos}` : ''}{v.total_dolares ? ` · U$S ${v.total_dolares}` : ''}</option>)}
                  </select>
                </Field>
                <Field label="Observaciones">
                  <textarea placeholder="Observaciones de la visita..." value={formVisita.observaciones} onChange={(e) => setFormVisita({ ...formVisita, observaciones: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </Field>
              </div>
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
                <button onClick={guardarVisita} style={btnPrimario}>💾 Guardar visita</button>
              </div>
            </div>
          )}
          <div style={card}>
            <div style={{ ...cardTitle, marginBottom: '14px' }}>Historial de visitas <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>({visitas.length} registros)</span></div>
            {visitas.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay visitas registradas</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {visitas.map(v => (
                  <div key={v.id} style={{ padding: '14px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#8B1E2D' }}>{v.visita_motivos?.motivo || '-'}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>{fmtFecha(v.fecha)} {fmtHora(v.fecha)}</div>
                        {v.ventas && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>🔗 Venta #{v.ventas.id} — {new Date(v.ventas.fecha).toLocaleDateString('es-AR')}</div>}
                        {v.observaciones && <div style={{ fontSize: '13px', color: '#374151', marginTop: '6px', padding: '8px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>{v.observaciones}</div>}
                      </div>
                      <button onClick={() => eliminarVisita(v.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ef4444' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB TURNOS */}
      {tab === 'turnos' && (
        <>
          <div style={card}>
            <div style={{ ...cardTitle, marginBottom: '14px' }}>📅 Próximos turnos <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>({turnosFuturos.length})</span></div>
            {turnosFuturos.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>No hay turnos próximos</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {turnosFuturos.map(t => (
                  <div key={t.id} style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb', borderLeft: '4px solid #8B1E2D' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a1a' }}>{new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} · {t.hora.slice(0, 5)} hs</div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '3px' }}>{t.profesionales?.nombre}{t.visita_motivos?.motivo && ` · ${t.visita_motivos.motivo}`}{t.obras_sociales?.obra_social && ` · ${t.obras_sociales.obra_social}`}</div>
                        {t.observaciones && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>{t.observaciones}</div>}
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: coloresEstado[t.estado]?.bg, color: coloresEstado[t.estado]?.color }}>{t.estado}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={card}>
            <div style={{ ...cardTitle, marginBottom: '14px' }}>📂 Turnos anteriores <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>({turnosPasados.length})</span></div>
            {turnosPasados.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>No hay turnos anteriores</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {turnosPasados.map(t => (
                  <div key={t.id} style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>{new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} · {t.hora.slice(0, 5)} hs</div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '3px' }}>{t.profesionales?.nombre}{t.visita_motivos?.motivo && ` · ${t.visita_motivos.motivo}`}{t.obras_sociales?.obra_social && ` · ${t.obras_sociales.obra_social}`}</div>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: coloresEstado[t.estado]?.bg, color: coloresEstado[t.estado]?.color }}>{t.estado.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB VENTAS Y PAGOS */}
      {tab === 'ventas' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={cardTitle}>💰 Ventas y pagos <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>({ventasConPagos.length} ventas)</span></div>
            <button onClick={() => window.location.href = `/ventas?dni=${form.dni}`} style={{ ...btnFantasma, fontSize: '13px' }}>+ Nueva venta</button>
          </div>
          {ventasConPagos.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay ventas registradas para este paciente</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {ventasConPagos.map(v => {
                const saldoP = (v.total_pesos || 0) - v.pagadoPesos
                const saldoU = (v.total_dolares || 0) - v.pagadoUSD
                const pagada = saldoP <= 0 && saldoU <= 0
                return (
                  <div key={v.id} style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a1a' }}>Venta #{v.id} — {fmtFecha(v.fecha)}</div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                          {v.total_pesos > 0 && fmt(v.total_pesos)}{v.total_dolares > 0 && ` · ${fmtUSD(v.total_dolares)}`}{v.obras_sociales?.obra_social && ` · ${v.obras_sociales.obra_social}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: pagada ? '#dcfce7' : '#fef2f2', color: pagada ? '#16a34a' : '#dc2626' }}>
                          {pagada ? '✅ Pagada' : `Saldo: ${saldoP > 0 ? fmt(saldoP) : fmtUSD(saldoU)}`}
                        </span>
                        {!pagada && <button onClick={() => window.location.href = `/pagos?venta_id=${v.id}&dni=${form.dni}`} style={{ ...btnFantasma, fontSize: '12px', padding: '4px 10px' }}>💳 Pagar</button>}
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      {v.venta_detalle?.map(d => (
                        <div key={d.id} style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>
                          · {d.numeros_serie?.productos?.producto || d.productos?.producto || '-'}
                          {d.numeros_serie?.numero_serie ? ` (${d.numeros_serie.numero_serie})` : ''}
                          {d.precio_venta_pesos ? ` — ${fmt(d.precio_venta_pesos)}` : ''}
                          {d.precio_venta_usd ? ` — ${fmtUSD(d.precio_venta_usd)}` : ''}
                        </div>
                      ))}
                    </div>
                    {v.pagos.length > 0 && (
                      <div style={{ paddingTop: '10px', borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>Pagos</div>
                        {v.pagos.map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                            <span>{fmtFecha(p.fecha_pago)} · {p.formas_pago?.forma_pago}</span>
                            <span style={{ fontWeight: '600', color: '#16a34a' }}>{p.monto_pesos ? fmt(p.monto_pesos) : fmtUSD(p.monto_usd)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB REPARACIONES */}
      {tab === 'reparaciones' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>{reparaciones.length} reparaciones</div>
            <button onClick={() => window.location.href = `/reparaciones`} style={{ ...btnFantasma, fontSize: '13px' }}>+ Nueva reparación</button>
          </div>

          {/* Activas */}
          <div style={card}>
            <div style={{ ...cardTitle, marginBottom: '14px' }}>🔧 En curso <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>({reparacionesActivas.length})</span></div>
            {reparacionesActivas.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>No hay reparaciones activas</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reparacionesActivas.map(r => {
                  const estado = r.respuesta_paciente || 'ingresada'
                  const c = ESTADOS_REPARACION[estado] || ESTADOS_REPARACION.ingresada
                  return (
                    <div key={r.id} style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb', borderLeft: `4px solid ${c.color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#8B1E2D' }}>#{r.numero_orden} · {r.marca || '-'}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Ingresada: {fmtFecha(r.fecha)}</div>
                          {(r.costo_pesos || r.costo_usd) && (
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#15803d', marginTop: '3px' }}>
                              {r.costo_pesos ? fmt(r.costo_pesos) : ''}{r.costo_usd ? ` U$S ${r.costo_usd}` : ''}
                            </div>
                          )}
                          {r.observaciones && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', whiteSpace: 'pre-line' }}>{r.observaciones}</div>}
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: c.bg, color: c.color }}>{c.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cerradas */}
          {reparacionesCerradas.length > 0 && (
            <div style={card}>
              <div style={{ ...cardTitle, marginBottom: '14px' }}>📂 Cerradas <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>({reparacionesCerradas.length})</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reparacionesCerradas.map(r => {
                  const estado = r.respuesta_paciente || 'ingresada'
                  const c = ESTADOS_REPARACION[estado] || ESTADOS_REPARACION.ingresada
                  return (
                    <div key={r.id} style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>#{r.numero_orden} · {r.marca || '-'}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                            Ingresada: {fmtFecha(r.fecha)}
                            {r.fecha_entrega && ` · Entregada: ${fmtFechaCorta(r.fecha_entrega)}`}
                          </div>
                          {(r.costo_pesos || r.costo_usd) && (
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#15803d', marginTop: '3px' }}>
                              {r.costo_pesos ? fmt(r.costo_pesos) : ''}{r.costo_usd ? ` U$S ${r.costo_usd}` : ''}
                            </div>
                          )}
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: c.bg, color: c.color }}>{c.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB HISTORIAL DATOS */}
      {tab === 'historial' && (
        <div style={card}>
          <div style={{ ...cardTitle, marginBottom: '14px' }}>🕐 Historial de cambios <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>({historial.length} registros)</span></div>
          {historial.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay cambios registrados — los cambios se registran automáticamente al guardar</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {historial.map((h, i) => (
                <div key={h.id} style={{ padding: '14px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Versión anterior #{historial.length - i}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{fmtFecha(h.created_at)} {fmtHora(h.created_at)}{h.usuarios?.nombre && ` · por ${h.usuarios.nombre}`}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px' }}>
                    {[['Apellido', h.apellido_paciente], ['Nombre', h.nombres_paciente], ['Teléfono', h.telefono], ['Mail', h.mail], ['Domicilio', h.domicilio], ['Localidad', h.localidad], ['Provincia', provinciasMap[h.provincia_id]]].filter(([, v]) => v).map(([label, valor]) => (
                      <div key={label} style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ color: '#9ca3af', minWidth: '70px' }}>{label}:</span>
                        <span style={{ color: '#374151' }}>{valor}</span>
                      </div>
                    ))}
                    {h.observaciones && (
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '6px' }}>
                        <span style={{ color: '#9ca3af', minWidth: '70px' }}>Obs:</span>
                        <span style={{ color: '#374151' }}>{h.observaciones}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
const btnFantasma = { padding: '8px 16px', background: 'transparent', color: '#8B1E2D', border: '1px dashed #8B1E2D', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
