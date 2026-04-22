'use client'

export const dynamic = 'force-dynamic'

import { getUsuarioId } from '../../lib/getUsuario'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { normalizarTexto } from '../../lib/formatText'

const HORA_INICIO = 9
const HORA_FIN_SEMANA = 18
const HORA_FIN_SABADO = 13
const INTERVALO = 30 // minutos

function generarHorarios(esSabado) {
  const horarios = []
  const fin = esSabado ? HORA_FIN_SABADO : HORA_FIN_SEMANA
  for (let h = HORA_INICIO; h < fin; h++) {
    horarios.push(`${String(h).padStart(2, '0')}:00`)
    horarios.push(`${String(h).padStart(2, '0')}:30`)
  }
  return horarios
}

function getLunesDeISemana(fecha) {
  const d = new Date(fecha)
  const dia = d.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatFecha(date) {
  return date.toISOString().split('T')[0]
}

function formatFechaMostrar(date) {
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric' })
}

export default function Agenda() {
  const [semanaBase, setSemanaBase] = useState(getLunesDeISemana(new Date()))
  const [profesionales, setProfesionales] = useState([])
  const [turnos, setTurnos] = useState([])
  const [motivos, setMotivos] = useState([])
  const [obrasSociales, setObrasSociales] = useState([])
  const [pacientesResultados, setPacientesResultados] = useState([])

  // Modal nuevo turno
  const [modalNuevo, setModalNuevo] = useState(null) // { fecha, hora, profesional_id }
  const [formTurno, setFormTurno] = useState({
    paciente_id: '', nombre_libre: '', telefono: '',
    motivo_id: '', obra_social_id: '', observaciones: '',
  })
  const [busquedaPaciente, setBusquedaPaciente] = useState('')
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null)

  // Modal ver turno
  const [modalVer, setModalVer] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    cargarTurnos()
  }, [semanaBase])

  async function cargarDatos() {
    const [{ data: profs }, { data: movs }, { data: os }] = await Promise.all([
      supabase.from('profesionales').select('*').eq('activo', true).order('nombre'),
      supabase.from('visita_motivos').select('*').eq('activo', true).order('motivo'),
      supabase.from('obras_sociales').select('*').order('obra_social'),
    ])
    setProfesionales(profs || [])
    setMotivos(movs || [])
    setObrasSociales(os || [])
    cargarTurnos()
  }

  async function cargarTurnos() {
    const lunes = new Date(semanaBase)
    const sabado = new Date(semanaBase)
    sabado.setDate(sabado.getDate() + 5)

    const { data } = await supabase
      .from('turnos')
      .select(`
        id, fecha, hora, observaciones, estado, asistio, nombre_libre, telefono,
        pacientes (id, apellido_paciente, nombres_paciente, dni, telefono),
        profesionales (id, nombre),
        visita_motivos (motivo),
        obras_sociales (obra_social)
      `)
      .gte('fecha', formatFecha(lunes))
      .lte('fecha', formatFecha(sabado))
      .order('hora')

    setTurnos(data || [])
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
  }

  async function guardarTurno() {
    if (!modalNuevo) return
    if (!pacienteSeleccionado && !formTurno.nombre_libre) {
      alert('Seleccioná un paciente o ingresá un nombre'); return
    }

    const { error } = await supabase.from('turnos').insert([{
      fecha: modalNuevo.fecha,
      hora: modalNuevo.hora,
      profesional_id: modalNuevo.profesional_id,
      paciente_id: pacienteSeleccionado?.id || null,
      nombre_libre: !pacienteSeleccionado ? normalizarTexto(formTurno.nombre_libre) : null,
      telefono: formTurno.telefono || pacienteSeleccionado?.telefono || null,
      motivo_id: formTurno.motivo_id ? Number(formTurno.motivo_id) : null,
      obra_social_id: formTurno.obra_social_id ? Number(formTurno.obra_social_id) : null,
      observaciones: formTurno.observaciones || null,
      estado: 'pendiente',
      creado_por: getUsuarioId(),
    }])

    if (error) { alert('Error: ' + error.message); return }

    cerrarModalNuevo()
    cargarTurnos()
  }

  async function marcarAsistencia(turnoId, asistio) {
    await supabase.from('turnos').update({
      asistio,
      estado: asistio ? 'realizado' : 'no_asistio',
    }).eq('id', turnoId)
    setModalVer(null)
    cargarTurnos()
  }

  async function cancelarTurno(turnoId) {
    if (!confirm('¿Cancelar este turno?')) return
    await supabase.from('turnos').update({ estado: 'cancelado' }).eq('id', turnoId)
    setModalVer(null)
    cargarTurnos()
  }

  async function reprogramarTurno(turno) {
    // Abre modal nuevo con datos del turno original
    setModalVer(null)
    setModalNuevo({ fecha: turno.fecha, hora: turno.hora, profesional_id: turno.profesionales?.id, reprogramandoId: turno.id })
    if (turno.pacientes) {
      setPacienteSeleccionado(turno.pacientes)
    }
    setFormTurno({
      paciente_id: turno.pacientes?.id || '',
      nombre_libre: turno.nombre_libre || '',
      telefono: turno.telefono || '',
      motivo_id: '',
      obra_social_id: '',
      observaciones: `Reprogramado desde ${turno.fecha} ${turno.hora.slice(0, 5)}`,
    })
  }

  function cerrarModalNuevo() {
    setModalNuevo(null)
    setFormTurno({ paciente_id: '', nombre_libre: '', telefono: '', motivo_id: '', obra_social_id: '', observaciones: '' })
    setBusquedaPaciente('')
    setPacienteSeleccionado(null)
    setPacientesResultados([])
  }

  function getTurno(fecha, hora, profesionalId) {
    const horaCorta = hora.slice(0, 5)
    return turnos.find(t =>
      t.fecha === fecha &&
      t.hora.slice(0, 5) === horaCorta &&
      t.profesionales?.id === profesionalId &&
      t.estado !== 'cancelado'
    )
  }

  // Días de la semana (L a S)
  const dias = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(semanaBase)
    d.setDate(d.getDate() + i)
    dias.push(d)
  }

  const colores = {
    pendiente: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    realizado: { bg: '#dcfce7', border: '#16a34a', text: '#15803d' },
    no_asistio: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' },
    cancelado: { bg: '#f3f4f6', border: '#9ca3af', text: '#6b7280' },
  }

  return (
    <div style={{ maxWidth: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Agenda</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Turnos semanales</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate() - 7); setSemanaBase(d) }} style={btnSecundario}>← Semana anterior</button>
          <button onClick={() => setSemanaBase(getLunesDeISemana(new Date()))} style={btnSecundario}>Hoy</button>
          <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate() + 7); setSemanaBase(d) }} style={btnSecundario}>Semana siguiente →</button>
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {Object.entries(colores).map(([estado, c]) => (
          <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: c.bg, border: `1px solid ${c.border}` }} />
            <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>{estado.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Grilla de agenda */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${200 + profesionales.length * dias.length * 120}px` }}>
          <thead>
            {/* Fila de días */}
            <tr>
              <th style={{ ...thBase, width: '60px' }}></th>
              {dias.map((dia, di) => {
                const esSabado = dia.getDay() === 6
                const esHoy = formatFecha(dia) === formatFecha(new Date())
                return (
                  <th
                    key={di}
                    colSpan={profesionales.length}
                    style={{
                      ...thBase,
                      background: esHoy ? '#fdf2f4' : '#f9fafb',
                      color: esHoy ? '#8B1E2D' : '#374151',
                      borderBottom: '1px solid #e5e7eb',
                      borderLeft: '2px solid #e5e7eb',
                      fontSize: '13px',
                      fontWeight: esHoy ? '700' : '600',
                    }}
                  >
                    {formatFechaMostrar(dia).toUpperCase()}
                    {esSabado && <span style={{ fontSize: '10px', marginLeft: '4px', color: '#9ca3af' }}>hasta 13hs</span>}
                  </th>
                )
              })}
            </tr>
            {/* Fila de profesionales */}
            <tr>
              <th style={{ ...thBase, fontSize: '11px', color: '#9ca3af' }}>HORA</th>
              {dias.map((dia, di) => (
                profesionales.map((prof, pi) => (
                  <th key={`${di}-${pi}`} style={{
                    ...thBase,
                    fontSize: '11px',
                    color: '#8B1E2D',
                    borderLeft: pi === 0 ? '2px solid #e5e7eb' : '1px solid #f3f4f6',
                    minWidth: '120px',
                  }}>
                    {prof.nombre}
                  </th>
                ))
              ))}
            </tr>
          </thead>
          <tbody>
            {generarHorarios(false).map(hora => (
              <tr key={hora} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{
                  padding: '4px 8px', fontSize: '12px', color: '#9ca3af',
                  fontWeight: hora.endsWith(':00') ? '600' : '400',
                  background: '#fafafa', borderRight: '1px solid #e5e7eb',
                  whiteSpace: 'nowrap',
                }}>
                  {hora}
                </td>
                {dias.map((dia, di) => {
                  const fechaStr = formatFecha(dia)
                  const esSabado = dia.getDay() === 6
                  const fueraHorario = esSabado && hora >= '13:00'

                  return profesionales.map((prof, pi) => {
                    if (fueraHorario) {
                      return <td key={`${di}-${pi}`} style={{ background: '#f3f4f6', borderLeft: pi === 0 ? '2px solid #e5e7eb' : '1px solid #f3f4f6' }} />
                    }

                    const turno = getTurno(fechaStr, hora, prof.id)

                    return (
                      <td
                        key={`${di}-${pi}`}
                        style={{
                          padding: '2px 4px',
                          borderLeft: pi === 0 ? '2px solid #e5e7eb' : '1px solid #f3f4f6',
                          verticalAlign: 'top',
                          minHeight: '36px',
                          cursor: turno ? 'pointer' : 'default',
                        }}
                        onClick={() => {
                          if (turno) {
                            setModalVer(turno)
                          } else {
                            setModalNuevo({ fecha: fechaStr, hora, profesional_id: prof.id })
                          }
                        }}
                      >
                        {turno ? (
                          <div style={{
                            padding: '3px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            background: colores[turno.estado]?.bg || '#fef3c7',
                            border: `1px solid ${colores[turno.estado]?.border || '#f59e0b'}`,
                            color: colores[turno.estado]?.text || '#92400e',
                            lineHeight: 1.3,
                          }}>
                            <div style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                              {turno.pacientes
                                ? `${turno.pacientes.apellido_paciente} ${turno.pacientes.nombres_paciente}`
                                : turno.nombre_libre || '-'}
                            </div>
                            {turno.visita_motivos?.motivo && (
                              <div style={{ fontSize: '10px', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {turno.visita_motivos.motivo}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{
                            height: '32px', borderRadius: '4px',
                            border: '1px dashed transparent',
                            transition: '0.15s',
                          }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#d1d5db'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                          />
                        )}
                      </td>
                    )
                  })
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL NUEVO TURNO */}
      {modalNuevo && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '4px' }}>
              ➕ Nuevo turno
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              {new Date(modalNuevo.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} · {modalNuevo.hora.slice(0, 5)} hs · {profesionales.find(p => p.id === modalNuevo.profesional_id)?.nombre}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Buscar paciente */}
              <div>
                <label style={labelStyle}>Paciente</label>
                {pacienteSeleccionado ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ ...inputStyle, background: '#fdf2f4', color: '#8B1E2D', fontWeight: '600', fontSize: '13px', padding: '10px 14px' }}>
                      {pacienteSeleccionado.apellido_paciente} {pacienteSeleccionado.nombres_paciente} — DNI: {pacienteSeleccionado.dni}
                    </div>
                    <button onClick={() => { setPacienteSeleccionado(null); setBusquedaPaciente('') }} style={{ padding: '10px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        placeholder="DNI o apellido..."
                        value={busquedaPaciente}
                        onChange={(e) => setBusquedaPaciente(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && buscarPacientes()}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button onClick={buscarPacientes} style={{ ...btnSecundario, whiteSpace: 'nowrap' }}>Buscar</button>
                    </div>
                    {pacientesResultados.length > 0 && (
                      <select value="" onChange={(e) => {
                        const p = pacientesResultados.find(x => x.id == e.target.value)
                        if (!p) return
                        setPacienteSeleccionado(p)
                        setPacientesResultados([])
                        setBusquedaPaciente('')
                      }} style={{ ...inputStyle, marginTop: '6px' }}>
                        <option value="">Seleccionar ({pacientesResultados.length} encontrados)</option>
                        {pacientesResultados.map(p => (
                          <option key={p.id} value={p.id}>{p.apellido_paciente} {p.nombres_paciente} — DNI: {p.dni}</option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>

              {/* Nombre libre si no hay paciente */}
              {!pacienteSeleccionado && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Nombre (sin paciente)</label>
                    <input
                      placeholder="Nombre y apellido..."
                      value={formTurno.nombre_libre}
                      onChange={(e) => setFormTurno({ ...formTurno, nombre_libre: e.target.value })}
                      style={{ ...inputStyle, textTransform: 'uppercase' }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Teléfono</label>
                    <input
                      placeholder="11 1234-5678"
                      value={formTurno.telefono}
                      onChange={(e) => setFormTurno({ ...formTurno, telefono: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Motivo</label>
                  <select value={formTurno.motivo_id} onChange={(e) => setFormTurno({ ...formTurno, motivo_id: e.target.value })} style={inputStyle}>
                    <option value="">Sin motivo</option>
                    {motivos.map(m => <option key={m.id} value={m.id}>{m.motivo}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Obra social</label>
                  <select value={formTurno.obra_social_id} onChange={(e) => setFormTurno({ ...formTurno, obra_social_id: e.target.value })} style={inputStyle}>
                    <option value="">Sin obra social</option>
                    {obrasSociales.map(o => <option key={o.id} value={o.id}>{o.obra_social}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Observaciones</label>
                <textarea
                  placeholder="Observaciones del turno..."
                  value={formTurno.observaciones}
                  onChange={(e) => setFormTurno({ ...formTurno, observaciones: e.target.value })}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={guardarTurno} style={btnPrimario}>💾 Guardar turno</button>
              <button onClick={cerrarModalNuevo} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VER TURNO */}
      {modalVer && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '4px' }}>
              📋 Turno #{modalVer.id}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              {new Date(modalVer.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} · {modalVer.hora.slice(0, 5)} hs · {modalVer.profesionales?.nombre}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <Row label="Paciente">
                {modalVer.pacientes
                  ? `${modalVer.pacientes.apellido_paciente} ${modalVer.pacientes.nombres_paciente} (DNI: ${modalVer.pacientes.dni})`
                  : modalVer.nombre_libre || '-'}
              </Row>
              {modalVer.telefono && <Row label="Teléfono">{modalVer.telefono}</Row>}
              {modalVer.visita_motivos && <Row label="Motivo">{modalVer.visita_motivos.motivo}</Row>}
              {modalVer.obras_sociales && <Row label="Obra social">{modalVer.obras_sociales.obra_social}</Row>}
              {modalVer.observaciones && <Row label="Observaciones">{modalVer.observaciones}</Row>}
              <Row label="Estado">
                <span style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                  background: colores[modalVer.estado]?.bg, color: colores[modalVer.estado]?.text,
                }}>
                  {modalVer.estado.replace('_', ' ')}
                </span>
              </Row>
            </div>

            {/* Acciones */}
            {modalVer.estado === 'pendiente' && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
                <button onClick={() => marcarAsistencia(modalVer.id, true)} style={{ ...btnPrimario, background: '#16a34a', fontSize: '13px', padding: '8px 14px' }}>
                  ✅ Asistió
                </button>
                <button onClick={() => marcarAsistencia(modalVer.id, false)} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px', color: '#dc2626', borderColor: '#fecaca' }}>
                  ❌ No asistió
                </button>
                <button onClick={() => reprogramarTurno(modalVer)} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px' }}>
                  🔄 Reprogramar
                </button>
                <button onClick={() => cancelarTurno(modalVer.id)} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px', color: '#6b7280' }}>
                  🗑️ Cancelar
                </button>
              </div>
            )}

            <div style={{ marginTop: '14px' }}>
              <button onClick={() => setModalVer(null)} style={btnSecundario}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
      <span style={{ fontWeight: '600', color: '#6b7280', minWidth: '100px' }}>{label}:</span>
      <span style={{ color: '#1a1a1a' }}>{children}</span>
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

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', fontFamily: "'Outfit', sans-serif", background: 'white', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', display: 'block' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modalBox = { background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }
const thBase = { padding: '8px 10px', textAlign: 'center', fontSize: '12px', fontWeight: '600', background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }
