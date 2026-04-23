'use client'

export const dynamic = 'force-dynamic'

import { getUsuarioId } from '../../lib/getUsuario'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { normalizarTexto } from '../../lib/formatText'

const ESTADOS = [
  { key: 'ingresada', label: 'Ingresada', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'en_evaluacion', label: 'En evaluación', color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'esperando_respuesta', label: 'Esperando respuesta', color: '#b45309', bg: '#fffbeb' },
  { key: 'aprobada', label: 'Aprobada', color: '#0e7490', bg: '#ecfeff' },
  { key: 'en_reparacion', label: 'En reparación', color: '#1d4ed8', bg: '#eff6ff' },
  { key: 'lista_entregar', label: 'Lista para entregar', color: '#15803d', bg: '#f0fdf4' },
  { key: 'entregada', label: 'Entregada', color: '#374151', bg: '#f9fafb' },
  { key: 'no_aprobada', label: 'No aprobada', color: '#dc2626', bg: '#fef2f2' },
  { key: 'no_aprobada_devuelta', label: 'No aprobada - Devuelta', color: '#9ca3af', bg: '#f3f4f6' },
]

const ESTADOS_ACTIVOS = ['ingresada', 'en_evaluacion', 'esperando_respuesta', 'aprobada', 'en_reparacion', 'lista_entregar']

function getEstado(key) {
  return ESTADOS.find(e => e.key === key) || ESTADOS[0]
}

export default function Reparaciones() {
  const [reparaciones, setReparaciones] = useState([])
  const [soloActivas, setSoloActivas] = useState(true)
  const [modalNueva, setModalNueva] = useState(false)
  const [modalVer, setModalVer] = useState(null)
  const [cargando, setCargando] = useState(false)

  // Búsqueda paciente
  const [busquedaPaciente, setBusquedaPaciente] = useState('')
  const [pacientesResultados, setPacientesResultados] = useState([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null)
  const [buscoPaciente, setBuscoPaciente] = useState(false)
  const [altaRapida, setAltaRapida] = useState(false)
  const [formAltaRapida, setFormAltaRapida] = useState({ apellido: '', nombre: '', dni: '', telefono: '' })

  // Form nueva reparación
  const [formNueva, setFormNueva] = useState({
    marca: '', motivo_reparacion: '', observaciones: '',
    costo_pesos: '', costo_usd: '',
  })

  // Form edición en modal ver
  const [formEdicion, setFormEdicion] = useState({})
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  useEffect(() => { cargarReparaciones() }, [soloActivas])

  async function cargarReparaciones() {
    setCargando(true)
    let query = supabase.from('visitas')
      .select(`
        id, fecha, observaciones, created_at,
        marca, costo_pesos, costo_usd, respuesta_paciente, fecha_entrega, numero_orden,
        pacientes (id, apellido_paciente, nombres_paciente, dni, telefono),
        visita_motivos (motivo),
        ventas (id, total_pesos, total_dolares)
      `)
      .eq('es_reparacion', true)
      .order('numero_orden', { ascending: false })

    if (soloActivas) {
      query = query.in('respuesta_paciente', [...ESTADOS_ACTIVOS, null, ''])
    }

    const { data } = await query
    // Filtrar nulos para soloActivas
    let resultado = data || []
    if (soloActivas) {
      resultado = resultado.filter(r => !r.respuesta_paciente || ESTADOS_ACTIVOS.includes(r.respuesta_paciente))
    }
    setReparaciones(resultado)
    setCargando(false)
  }

  async function buscarPacientes() {
    const termino = busquedaPaciente.trim()
    if (!termino) return
    let query = supabase.from('pacientes').select('id, apellido_paciente, nombres_paciente, dni, telefono')
    if (/^\d+$/.test(termino)) {
      query = query.eq('dni', termino)
    } else {
      query = query.ilike('apellido_paciente', `%${termino}%`)
    }
    const { data } = await query.order('apellido_paciente').limit(10)
    setPacientesResultados(data || [])
    setBuscoPaciente(true)
  }

  async function guardarAltaRapida() {
    if (!formAltaRapida.apellido || !formAltaRapida.nombre || !formAltaRapida.dni) {
      alert('Apellido, nombre y DNI son obligatorios'); return
    }
    const { data: existe } = await supabase.from('pacientes').select('id').eq('dni', formAltaRapida.dni).maybeSingle()
    if (existe) { alert('❌ Ya existe un paciente con ese DNI'); return }
    const { data: nuevo, error } = await supabase.from('pacientes').insert([{
      apellido_paciente: formAltaRapida.apellido,
      nombres_paciente: formAltaRapida.nombre,
      dni: formAltaRapida.dni,
      telefono: formAltaRapida.telefono || null,
      creado_por: getUsuarioId(),
    }]).select().single()
    if (error) { alert('Error: ' + error.message); return }
    setPacienteSeleccionado(nuevo)
    setAltaRapida(false)
    setFormAltaRapida({ apellido: '', nombre: '', dni: '', telefono: '' })
    setBusquedaPaciente(''); setPacientesResultados([]); setBuscoPaciente(false)
  }

  async function guardarNuevaReparacion() {
    if (!pacienteSeleccionado) { alert('Seleccioná un paciente'); return }
    if (!formNueva.marca) { alert('Ingresar marca'); return }
    if (!formNueva.motivo_reparacion) { alert('Ingresar motivo'); return }

    // Obtener próximo número de orden
    const { data: ultimaOrden } = await supabase.from('visitas')
      .select('numero_orden').eq('es_reparacion', true)
      .order('numero_orden', { ascending: false }).limit(1).maybeSingle()
    const proximoOrden = (ultimaOrden?.numero_orden || 0) + 1

    // Buscar o crear motivo REPARACION
    let { data: motivo } = await supabase.from('visita_motivos').select('id').ilike('motivo', 'REPARACION').maybeSingle()
    if (!motivo) {
      const { data: nuevoMotivo } = await supabase.from('visita_motivos').insert([{ motivo: 'REPARACION', creado_por: getUsuarioId() }]).select().single()
      motivo = nuevoMotivo
    }

    const { error } = await supabase.from('visitas').insert([{
      paciente_id: pacienteSeleccionado.id,
      fecha: new Date().toISOString(),
      motivo_id: motivo.id,
      es_reparacion: true,
      numero_orden: proximoOrden,
      marca: normalizarTexto(formNueva.marca),
      observaciones: formNueva.observaciones || null,
      costo_pesos: formNueva.costo_pesos ? Number(formNueva.costo_pesos) : null,
      costo_usd: formNueva.costo_usd ? Number(formNueva.costo_usd) : null,
      respuesta_paciente: 'ingresada',
      atendido_por: getUsuarioId(),
      creado_por: getUsuarioId(),
      // motivo libre guardado en observaciones con prefijo
      ...(formNueva.motivo_reparacion ? { observaciones: `MOTIVO: ${normalizarTexto(formNueva.motivo_reparacion)}${formNueva.observaciones ? '\n\nOBS TÉCNICAS: ' + formNueva.observaciones : ''}` } : {}),
    }])

    if (error) { alert('Error: ' + error.message); return }
    cerrarModalNueva()
    cargarReparaciones()
    alert(`✅ Reparación #${proximoOrden} creada`)
  }

  function cerrarModalNueva() {
    setModalNueva(false)
    setFormNueva({ marca: '', motivo_reparacion: '', observaciones: '', costo_pesos: '', costo_usd: '' })
    setPacienteSeleccionado(null); setBusquedaPaciente(''); setPacientesResultados([])
    setBuscoPaciente(false); setAltaRapida(false)
    setFormAltaRapida({ apellido: '', nombre: '', dni: '', telefono: '' })
  }

  function abrirVer(r) {
    setModalVer(r)
    setFormEdicion({
      observaciones: r.observaciones || '',
      costo_pesos: r.costo_pesos || '',
      costo_usd: r.costo_usd || '',
      respuesta_paciente: r.respuesta_paciente || 'ingresada',
      fecha_entrega: r.fecha_entrega || '',
    })
  }

  async function guardarEdicion() {
    setGuardandoEdicion(true)
    const { error } = await supabase.from('visitas').update({
      observaciones: formEdicion.observaciones || null,
      costo_pesos: formEdicion.costo_pesos ? Number(formEdicion.costo_pesos) : null,
      costo_usd: formEdicion.costo_usd ? Number(formEdicion.costo_usd) : null,
      respuesta_paciente: formEdicion.respuesta_paciente,
      fecha_entrega: formEdicion.fecha_entrega || null,
    }).eq('id', modalVer.id)
    setGuardandoEdicion(false)
    if (error) { alert('Error: ' + error.message); return }
    setModalVer(null)
    cargarReparaciones()
  }

  async function cambiarEstadoRapido(id, nuevoEstado) {
    await supabase.from('visitas').update({ respuesta_paciente: nuevoEstado }).eq('id', id)
    cargarReparaciones()
  }

  // Agrupar por estado
  const porEstado = ESTADOS.reduce((acc, e) => {
    acc[e.key] = reparaciones.filter(r => (r.respuesta_paciente || 'ingresada') === e.key)
    return acc
  }, {})

  const estadosMostrar = soloActivas ? ESTADOS.filter(e => ESTADOS_ACTIVOS.includes(e.key)) : ESTADOS

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
  const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '-'

  return (
    <div style={{ maxWidth: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Reparaciones</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
            {reparaciones.length} reparaciones {soloActivas ? 'activas' : 'totales'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSoloActivas(!soloActivas)}
            style={{
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
              border: '1px solid #e5e7eb', fontSize: '13px', fontWeight: '600',
              background: soloActivas ? '#1a1a1a' : 'white',
              color: soloActivas ? 'white' : '#374151',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {soloActivas ? '👁 Ver todas' : '🔧 Solo activas'}
          </button>
          <button onClick={() => setModalNueva(true)} style={btnPrimario}>+ Nueva reparación</button>
        </div>
      </div>

      {/* Tablero kanban */}
      {cargando ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Cargando...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: '16px', minWidth: `${estadosMostrar.length * 240}px`, alignItems: 'flex-start' }}>
            {estadosMostrar.map(estado => (
              <div key={estado.key} style={{ width: '230px', flexShrink: 0 }}>
                {/* Header columna */}
                <div style={{
                  padding: '8px 12px', borderRadius: '8px', marginBottom: '10px',
                  background: estado.bg, border: `1px solid ${estado.color}20`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: estado.color }}>{estado.label.toUpperCase()}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: estado.color, background: 'white', borderRadius: '20px', padding: '1px 8px' }}>
                    {porEstado[estado.key]?.length || 0}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(porEstado[estado.key] || []).map(r => (
                    <div
                      key={r.id}
                      onClick={() => abrirVer(r)}
                      style={{
                        padding: '12px', background: 'white', borderRadius: '10px',
                        border: '1px solid #e5e7eb', cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        borderLeft: `4px solid ${estado.color}`,
                        transition: '0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#8B1E2D' }}>#{r.numero_orden}</span>
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{fmtFecha(r.fecha)}</span>
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#1a1a1a', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.pacientes?.apellido_paciente} {r.pacientes?.nombres_paciente}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{r.marca || '-'}</div>
                      {(r.costo_pesos || r.costo_usd) && (
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#16a34a' }}>
                          {r.costo_pesos ? fmt(r.costo_pesos) : ''}
                          {r.costo_usd ? ` U$S ${r.costo_usd}` : ''}
                        </div>
                      )}
                      {r.fecha_entrega && (
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>📦 {fmtFecha(r.fecha_entrega)}</div>
                      )}
                    </div>
                  ))}
                  {(porEstado[estado.key] || []).length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#d1d5db', fontSize: '12px', border: '1px dashed #e5e7eb', borderRadius: '8px' }}>
                      Sin reparaciones
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL NUEVA REPARACIÓN */}
      {modalNueva && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '20px' }}>🔧 Nueva reparación</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Paciente */}
              <div>
                <label style={labelStyle}>Paciente *</label>
                {pacienteSeleccionado ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ ...inputStyle, background: '#fdf2f4', color: '#8B1E2D', fontWeight: '600', fontSize: '13px', padding: '10px 14px' }}>
                      {pacienteSeleccionado.apellido_paciente} {pacienteSeleccionado.nombres_paciente} — DNI: {pacienteSeleccionado.dni}
                    </div>
                    <button onClick={() => { setPacienteSeleccionado(null); setBusquedaPaciente(''); setPacientesResultados([]); setBuscoPaciente(false) }} style={{ padding: '10px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input placeholder="DNI o apellido..." value={busquedaPaciente} onChange={(e) => { setBusquedaPaciente(e.target.value); setBuscoPaciente(false) }} onKeyDown={(e) => e.key === 'Enter' && buscarPacientes()} style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={buscarPacientes} style={{ ...btnSecundario, whiteSpace: 'nowrap', fontSize: '13px' }}>Buscar</button>
                    </div>
                    {pacientesResultados.length > 0 && (
                      <select value="" onChange={(e) => {
                        const p = pacientesResultados.find(x => x.id == e.target.value)
                        if (!p) return
                        setPacienteSeleccionado(p); setPacientesResultados([]); setBusquedaPaciente(''); setBuscoPaciente(false)
                      }} style={{ ...inputStyle, marginTop: '6px' }}>
                        <option value="">Seleccionar ({pacientesResultados.length} encontrados)</option>
                        {pacientesResultados.map(p => <option key={p.id} value={p.id}>{p.apellido_paciente} {p.nombres_paciente} — DNI: {p.dni}</option>)}
                      </select>
                    )}
                    {buscoPaciente && pacientesResultados.length === 0 && !altaRapida && (
                      <button onClick={() => setAltaRapida(true)} style={{ ...btnFantasma, marginTop: '8px', width: '100%', textAlign: 'center' }}>
                        + No encontrado — Dar de alta como nuevo paciente
                      </button>
                    )}
                    {altaRapida && (
                      <div style={{ marginTop: '10px', padding: '14px', background: '#fdf2f4', borderRadius: '8px', border: '1px solid #f5c2c9' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#8B1E2D', marginBottom: '10px' }}>Alta rápida de paciente</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div><label style={labelStyle}>Apellido *</label><input placeholder="APELLIDO" value={formAltaRapida.apellido} onChange={(e) => setFormAltaRapida(f => ({ ...f, apellido: e.target.value.toUpperCase() }))} style={inputStyle} /></div>
                          <div><label style={labelStyle}>Nombre *</label><input placeholder="NOMBRE" value={formAltaRapida.nombre} onChange={(e) => setFormAltaRapida(f => ({ ...f, nombre: e.target.value.toUpperCase() }))} style={inputStyle} /></div>
                          <div><label style={labelStyle}>DNI *</label><input placeholder="DNI" value={formAltaRapida.dni} onChange={(e) => setFormAltaRapida(f => ({ ...f, dni: e.target.value }))} style={inputStyle} /></div>
                          <div><label style={labelStyle}>Teléfono</label><input placeholder="11 1234-5678" value={formAltaRapida.telefono} onChange={(e) => setFormAltaRapida(f => ({ ...f, telefono: e.target.value }))} style={inputStyle} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button onClick={guardarAltaRapida} style={{ ...btnPrimario, fontSize: '13px', padding: '8px 14px' }}>💾 Guardar y seleccionar</button>
                          <button onClick={() => setAltaRapida(false)} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px' }}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label style={labelStyle}>Marca *</label>
                <input placeholder="Ej: Oticon, Siemens, Signia..." value={formNueva.marca} onChange={(e) => setFormNueva({ ...formNueva, marca: e.target.value })} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Motivo de la reparación *</label>
                <textarea placeholder="Describí el problema..." value={formNueva.motivo_reparacion} onChange={(e) => setFormNueva({ ...formNueva, motivo_reparacion: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div>
                <label style={labelStyle}>Observaciones técnicas (opcional)</label>
                <textarea placeholder="Diagnóstico inicial, notas técnicas..." value={formNueva.observaciones} onChange={(e) => setFormNueva({ ...formNueva, observaciones: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Costo en pesos</label>
                  <input type="number" placeholder="$0" value={formNueva.costo_pesos} onChange={(e) => setFormNueva({ ...formNueva, costo_pesos: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Costo en USD</label>
                  <input type="number" placeholder="U$S 0" value={formNueva.costo_usd} onChange={(e) => setFormNueva({ ...formNueva, costo_usd: e.target.value })} style={inputStyle} />
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={guardarNuevaReparacion} style={btnPrimario}>💾 Guardar reparación</button>
              <button onClick={cerrarModalNueva} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VER / EDITAR REPARACIÓN */}
      {modalVer && (
        <div style={overlay}>
          <div style={{ ...modalBox, maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a' }}>
                  🔧 Reparación #{modalVer.numero_orden}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                  Ingresada: {fmtFecha(modalVer.fecha)}
                </div>
              </div>
              <span style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                background: getEstado(formEdicion.respuesta_paciente).bg,
                color: getEstado(formEdicion.respuesta_paciente).color,
              }}>
                {getEstado(formEdicion.respuesta_paciente).label}
              </span>
            </div>

            {/* Info paciente */}
            <div style={{ padding: '12px 16px', background: '#fdf2f4', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#8B1E2D' }}>
                {modalVer.pacientes?.apellido_paciente} {modalVer.pacientes?.nombres_paciente}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                DNI: {modalVer.pacientes?.dni}
                {modalVer.pacientes?.telefono && ` · Tel: ${modalVer.pacientes.telefono}`}
              </div>
              <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px', fontWeight: '600' }}>
                {modalVer.marca}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Estado */}
              <div>
                <label style={labelStyle}>Estado</label>
                <select value={formEdicion.respuesta_paciente} onChange={(e) => setFormEdicion({ ...formEdicion, respuesta_paciente: e.target.value })} style={inputStyle}>
                  {ESTADOS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>
              </div>

              {/* Observaciones */}
              <div>
                <label style={labelStyle}>Observaciones / Notas técnicas</label>
                <textarea value={formEdicion.observaciones} onChange={(e) => setFormEdicion({ ...formEdicion, observaciones: e.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              {/* Costo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Costo en pesos</label>
                  <input type="number" placeholder="$0" value={formEdicion.costo_pesos} onChange={(e) => setFormEdicion({ ...formEdicion, costo_pesos: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Costo en USD</label>
                  <input type="number" placeholder="U$S 0" value={formEdicion.costo_usd} onChange={(e) => setFormEdicion({ ...formEdicion, costo_usd: e.target.value })} style={inputStyle} />
                </div>
              </div>

              {/* Fecha de entrega */}
              <div>
                <label style={labelStyle}>Fecha de entrega</label>
                <input type="date" value={formEdicion.fecha_entrega} onChange={(e) => setFormEdicion({ ...formEdicion, fecha_entrega: e.target.value })} style={inputStyle} />
              </div>

              {/* Venta vinculada */}
              {modalVer.ventas && (
                <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '13px' }}>
                  🔗 Cobro vinculado: Venta #{modalVer.ventas.id}
                  {modalVer.ventas.total_pesos ? ` — ${fmt(modalVer.ventas.total_pesos)}` : ''}
                </div>
              )}

              {/* Accesos rápidos de estado */}
              <div>
                <label style={labelStyle}>Cambio rápido de estado</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {ESTADOS.filter(e => e.key !== formEdicion.respuesta_paciente).map(e => (
                    <button key={e.key} onClick={() => setFormEdicion({ ...formEdicion, respuesta_paciente: e.key })} style={{
                      padding: '5px 10px', borderRadius: '20px', border: `1px solid ${e.color}`,
                      background: 'white', color: e.color, fontSize: '11px', fontWeight: '600',
                      cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                    }}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
              <button onClick={guardarEdicion} disabled={guardandoEdicion} style={{ ...btnPrimario, opacity: guardandoEdicion ? 0.7 : 1 }}>
                {guardandoEdicion ? 'Guardando...' : '💾 Guardar cambios'}
              </button>
              {!modalVer.ventas && (
                <button onClick={() => window.location.href = `/ventas?dni=${modalVer.pacientes?.dni}`} style={{ ...btnSecundario, fontSize: '13px' }}>
                  💳 Registrar cobro
                </button>
              )}
              <button onClick={() => setModalVer(null)} style={btnSecundario}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', fontFamily: "'Outfit', sans-serif", background: 'white', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', display: 'block' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnFantasma = { padding: '8px 16px', background: 'transparent', color: '#8B1E2D', border: '1px dashed #8B1E2D', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modalBox = { background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }
