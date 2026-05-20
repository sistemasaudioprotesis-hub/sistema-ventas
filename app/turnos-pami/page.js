'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { fetchConToken } from '../../lib/fetchConToken'
import { usePermiso } from '../../lib/usePermisos'

const HORA_INICIO = 8
const HORA_FIN = 18

function generarHorarios() {
  const horarios = []
  for (let h = HORA_INICIO; h < HORA_FIN; h++) {
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

function formatFecha(date) { return date.toISOString().split('T')[0] }
function formatFechaMostrar(date) { return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' }) }

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const coloresEstado = {
  pendiente: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  realizado: { bg: '#dcfce7', border: '#16a34a', text: '#15803d' },
  no_asistio: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' },
  cancelado: { bg: '#f3f4f6', border: '#d1d5db', text: '#9ca3af' },
}

export default function TurnosPami() {
  const hoy = new Date()
  const hoyStr = formatFecha(hoy)
  const { verificando, permitido } = usePermiso('turnos_pami_bernal')

  const [semanaBase, setSemanaBase] = useState(getLunesDeISemana(hoy))
  const [mesCalendario, setMesCalendario] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() })
  const [calAbierto, setCalAbierto] = useState(false)
  const [turnos, setTurnos] = useState([])
  const [turnosMes, setTurnosMes] = useState([])
  const [motivos, setMotivos] = useState([])
  const [verCancelados, setVerCancelados] = useState(false)
  const [tabVista, setTabVista] = useState('semana') // 'semana' | 'dia'
  const [fechaReporte, setFechaReporte] = useState(hoyStr)

  const [modalNuevo, setModalNuevo] = useState(null)
  const [formTurno, setFormTurno] = useState({ dni: '', nombre: '', telefono: '', motivo_id: '', observaciones: '' })
  const [guardando, setGuardando] = useState(false)

  const [modalVer, setModalVer] = useState(null)
  const [editandoObs, setEditandoObs] = useState(false)
  const [obsEditada, setObsEditada] = useState('')
  const [reprogramando, setReprogramando] = useState(false)
  const [formReprogramar, setFormReprogramar] = useState({ fecha: '', hora: '' })
  const [guardandoReprogramar, setGuardandoReprogramar] = useState(false)

  useEffect(() => { cargarMotivos() }, [])
  useEffect(() => { cargarTurnos() }, [semanaBase])
  useEffect(() => { cargarTurnosMes() }, [mesCalendario])
  useEffect(() => { if (tabVista === 'dia') cargarReporte() }, [fechaReporte, tabVista])

  if (verificando || !permitido) return null

  async function cargarMotivos() {
    const res = await fetchConToken('/api/configuracion/motivos?activos=true')
    const data = await res.json()
    setMotivos(data.motivos || [])
  }

  async function cargarTurnos() {
    const lunes = new Date(semanaBase)
    const sabado = new Date(semanaBase)
    sabado.setDate(sabado.getDate() + 5)
    const res = await fetchConToken(`/api/turnos-pami?desde=${formatFecha(lunes)}&hasta=${formatFecha(sabado)}`)
    const data = await res.json()
    setTurnos(data.turnos || [])
  }

  async function cargarTurnosMes() {
    const { year, month } = mesCalendario
    const primerDia = new Date(year, month, 1)
    const ultimoDia = new Date(year, month + 1, 0)
    const res = await fetchConToken(`/api/turnos-pami?desde=${formatFecha(primerDia)}&hasta=${formatFecha(ultimoDia)}`)
    const data = await res.json()
    setTurnosMes((data.turnos || []).filter(t => t.estado !== 'cancelado'))
  }

  const [turnosReporte, setTurnosReporte] = useState([])
  async function cargarReporte() {
    const res = await fetchConToken(`/api/turnos-pami?desde=${fechaReporte}&hasta=${fechaReporte}`)
    const data = await res.json()
    setTurnosReporte(data.turnos || [])
  }

  async function guardarTurno() {
    if (guardando) return
    setGuardando(true)
    try {
      if (!modalNuevo) return
      const res = await fetchConToken('/api/turnos-pami', {
        method: 'POST',
        body: JSON.stringify({
          fecha: modalNuevo.fecha,
          hora: modalNuevo.hora + ':00',
          dni: formTurno.dni || null,
          nombre: formTurno.nombre || null,
          telefono: formTurno.telefono || null,
          motivo_id: formTurno.motivo_id ? Number(formTurno.motivo_id) : null,
          observaciones: formTurno.observaciones || null,
          estado: 'pendiente',
        })
      })
      const data = await res.json()
      if (!res.ok) { alert('Error: ' + data.error); return }
      cerrarModalNuevo()
      cargarTurnos()
      cargarTurnosMes()
    } finally {
      setGuardando(false)
    }
  }

  function cerrarModalNuevo() {
    setModalNuevo(null)
    setFormTurno({ dni: '', nombre: '', telefono: '', motivo_id: '', observaciones: '' })
  }

  async function cambiarEstado(turnoId, estado) {
    await fetchConToken(`/api/turnos-pami/${turnoId}`, {
      method: 'PUT',
      body: JSON.stringify({ estado })
    })
    setModalVer(null)
    cargarTurnos()
    if (tabVista === 'dia') cargarReporte()
  }

  async function cancelarTurno(turnoId) {
    if (!confirm('¿Cancelar este turno?')) return
    await cambiarEstado(turnoId, 'cancelado')
  }

  async function reprogramarTurno() {
    if (guardandoReprogramar) return
    if (!formReprogramar.fecha || !formReprogramar.hora) { alert('Seleccioná fecha y hora'); return }
    setGuardandoReprogramar(true)
    await fetchConToken(`/api/turnos-pami/${modalVer.id}`, {
      method: 'PUT',
      body: JSON.stringify({ fecha: formReprogramar.fecha, hora: formReprogramar.hora + ':00', estado: 'pendiente' })
    })
    setGuardandoReprogramar(false)
    setReprogramando(false)
    setModalVer(null)
    cargarTurnos()
    cargarTurnosMes()
  }

  function getTurnosSlot(fecha, hora) {
    const horaCorta = hora.slice(0, 5)
    return turnos.filter(t => t.fecha === fecha && t.hora.slice(0, 5) === horaCorta && (t.estado !== 'cancelado' || verCancelados))
  }

  function tieneTurnos(fecha) {
    return turnosMes.some(t => t.fecha === formatFecha(fecha))
  }

  function mesSiguiente() { setMesCalendario(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }) }
  function mesAnterior() { setMesCalendario(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 }) }

  function getDiasMes() {
    const { year, month } = mesCalendario
    const primer = new Date(year, month, 1)
    const ultimo = new Date(year, month + 1, 0)
    const dias = []
    let diaSemana = primer.getDay()
    if (diaSemana === 0) diaSemana = 7
    for (let i = 1; i < diaSemana; i++) dias.push(null)
    for (let d = 1; d <= ultimo.getDate(); d++) dias.push(new Date(year, month, d))
    return dias
  }

  const dias = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(semanaBase)
    d.setDate(d.getDate() + i)
    dias.push(d)
  }

  const horarios = generarHorarios()
  const semanaActualStr = formatFecha(semanaBase)

  return (
    <div style={{ maxWidth: '100%' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Turnos PAMI Bernal</h1>
          <button onClick={() => setCalAbierto(!calAbierto)} style={{ marginTop: '4px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '14px', fontFamily: "'Outfit', sans-serif" }}>
            <span>📅</span>
            <span style={{ textDecoration: 'underline dotted' }}>Semana del {dias[0] && formatFechaMostrar(dias[0])} al {dias[5] && formatFechaMostrar(dias[5])}</span>
            <span style={{ fontSize: '10px', color: '#9ca3af' }}>{calAbierto ? '▲' : '▼'}</span>
          </button>
          {calAbierto && (
            <div style={{ position: 'absolute', zIndex: 100, marginTop: '4px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '260px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <button onClick={mesAnterior} style={btnIcono}>‹</button>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>{MESES[mesCalendario.month]} {mesCalendario.year}</span>
                <button onClick={mesSiguiente} style={btnIcono}>›</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', marginBottom: '3px' }}>
                {DIAS_SEMANA.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: '600', color: '#9ca3af', padding: '2px 0' }}>{d}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
                {getDiasMes().map((dia, i) => {
                  if (!dia) return <div key={i} />
                  const fechaStr = formatFecha(dia)
                  const esHoy = fechaStr === hoyStr
                  const esDomingo = dia.getDay() === 0
                  const semanaDelDia = formatFecha(getLunesDeISemana(dia))
                  const esSemanaActual = semanaDelDia === semanaActualStr
                  const tieneT = tieneTurnos(dia)
                  return (
                    <div key={i} onClick={() => { if (esDomingo) return; setSemanaBase(getLunesDeISemana(dia)); setMesCalendario({ year: dia.getFullYear(), month: dia.getMonth() }); setCalAbierto(false) }}
                      style={{ textAlign: 'center', padding: '4px 2px', borderRadius: '5px', cursor: esDomingo ? 'default' : 'pointer', background: esHoy ? '#8B1E2D' : esSemanaActual ? '#fdf2f4' : 'transparent', color: esHoy ? 'white' : esDomingo ? '#d1d5db' : '#374151', fontWeight: esHoy ? '700' : esSemanaActual ? '600' : '400', fontSize: '11px', border: esSemanaActual && !esHoy ? '1px solid #f5c2c9' : '1px solid transparent', opacity: esDomingo ? 0.4 : 1 }}>
                      {dia.getDate()}
                      {tieneT && <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: esHoy ? 'white' : '#8B1E2D', margin: '0 auto' }} />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs vista */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button onClick={() => setTabVista('semana')} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #e5e7eb', background: tabVista === 'semana' ? '#8B1E2D' : 'white', color: tabVista === 'semana' ? 'white' : '#374151', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>📅 Vista semanal</button>
        <button onClick={() => setTabVista('dia')} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #e5e7eb', background: tabVista === 'dia' ? '#8B1E2D' : 'white', color: tabVista === 'dia' ? 'white' : '#374151', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>📋 Reporte por día</button>
      </div>

      {tabVista === 'semana' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate() - 7); setSemanaBase(d) }} style={btnSecundario}>← Anterior</button>
            <button onClick={() => { setSemanaBase(getLunesDeISemana(hoy)); setMesCalendario({ year: hoy.getFullYear(), month: hoy.getMonth() }) }} style={btnSecundario}>Hoy</button>
            <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate() + 7); setSemanaBase(d) }} style={btnSecundario}>Siguiente →</button>
            <button onClick={() => setVerCancelados(!verCancelados)} style={{ padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${verCancelados ? '#6b7280' : '#e5e7eb'}`, background: verCancelados ? '#6b7280' : 'white', color: verCancelados ? 'white' : '#9ca3af', fontSize: '13px', fontWeight: '600', fontFamily: "'Outfit', sans-serif" }}>{verCancelados ? '✕ Ocultar cancelados' : '👁 Ver cancelados'}</button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {Object.entries(coloresEstado).map(([estado, c]) => (
                <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: c.bg, border: `1px solid ${c.border}` }} />
                  {estado.replace('_', ' ')}
                </div>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${80 + dias.length * 140}px`, background: 'white' }}>
              <thead>
                <tr>
                  <th style={{ ...thBase, width: '64px', borderRight: '1px solid #e5e7eb' }}>HORA</th>
                  {dias.map((dia, di) => {
                    const esHoy = formatFecha(dia) === hoyStr
                    return (
                      <th key={di} style={{ ...thBase, background: esHoy ? '#fdf2f4' : '#f9fafb', color: esHoy ? '#8B1E2D' : '#374151', borderLeft: '1px solid #e5e7eb', fontWeight: esHoy ? '700' : '600', fontSize: '12px' }}>
                        {formatFechaMostrar(dia).toUpperCase()}
                        {esHoy && <div style={{ fontSize: '9px', color: '#8B1E2D', fontWeight: '700' }}>HOY</div>}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {horarios.map(hora => (
                  <tr key={hora} style={{ borderBottom: hora.endsWith(':00') ? '1px solid #e5e7eb' : '1px solid #f9fafb' }}>
                    <td style={{ padding: '4px 8px', fontSize: '11px', textAlign: 'right', whiteSpace: 'nowrap', color: hora.endsWith(':00') ? '#374151' : '#9ca3af', fontWeight: hora.endsWith(':00') ? '600' : '400', background: '#fafafa', borderRight: '1px solid #e5e7eb', verticalAlign: 'top', paddingTop: '6px' }}>{hora}</td>
                    {dias.map((dia, di) => {
                      const fechaStr = formatFecha(dia)
                      const esHoy = fechaStr === hoyStr
                      const turnosSlot = getTurnosSlot(fechaStr, hora)
                      return (
                        <td key={di} style={{ padding: '2px 4px', borderLeft: '1px solid #e5e7eb', verticalAlign: 'top', background: esHoy ? '#fffbfb' : 'white', cursor: 'pointer', minWidth: '130px' }}
                          onClick={() => { setModalNuevo({ fecha: fechaStr, hora }); setFormTurno({ dni: '', nombre: '', telefono: '', motivo_id: '', observaciones: '' }) }}>
                          {turnosSlot.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {turnosSlot.map(t => {
                                const cEstado = coloresEstado[t.estado] || coloresEstado.pendiente
                                return (
                                  <div key={t.id} onClick={(e) => { e.stopPropagation(); setModalVer(t); setReprogramando(false) }}
                                    style={{ padding: '3px 6px', borderRadius: '4px', fontSize: '11px', background: cEstado.bg, border: `1px solid ${cEstado.border}`, borderLeftWidth: '3px', borderLeftColor: '#8B1E2D', cursor: 'pointer', lineHeight: 1.3 }}>
                                    <div style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px', color: cEstado.text }}>{t.nombre || 'Sin nombre'}</div>
                                    {t.visita_motivos?.motivo && <div style={{ fontSize: '10px', color: '#8B1E2D', fontWeight: '600' }}>{t.visita_motivos.motivo}</div>}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div style={{ height: '32px', borderRadius: '4px', border: '1px dashed transparent', transition: '0.1s' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#f9fafb' }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }} />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tabVista === 'dia' && (
        <div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div>
              <label style={labelStyle}>Fecha del reporte</label>
              <input type="date" value={fechaReporte} onChange={e => setFechaReporte(e.target.value)} style={{ ...inputStyle, width: '180px' }} />
            </div>
            <button onClick={cargarReporte} style={btnPrimario}>🔍 Buscar</button>
            <button onClick={() => window.print()} style={btnSecundario}>🖨️ Imprimir</button>
          </div>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#8B1E2D', marginBottom: '4px' }}>Turnos PAMI Bernal</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>{new Date(fechaReporte + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {turnosReporte.filter(t => t.estado !== 'cancelado').length} turnos</div>
            {turnosReporte.length === 0 ? (
              <div style={{ color: '#9ca3af', textAlign: 'center', padding: '30px 0' }}>No hay turnos para esta fecha</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Hora</th>
                    <th style={thStyle}>DNI</th>
                    <th style={thStyle}>Nombre</th>
                    <th style={thStyle}>Teléfono</th>
                    <th style={thStyle}>Motivo</th>
                    <th style={thStyle}>Estado</th>
                    <th style={thStyle}>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {turnosReporte.sort((a, b) => a.hora.localeCompare(b.hora)).map((t, i) => {
                    const cEstado = coloresEstado[t.estado] || coloresEstado.pendiente
                    return (
                      <tr key={t.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={tdStyle}><strong>{t.hora.slice(0, 5)}</strong></td>
                        <td style={tdStyle}>{t.dni || '-'}</td>
                        <td style={{ ...tdStyle, fontWeight: '600' }}>{t.nombre || '-'}</td>
                        <td style={tdStyle}>{t.telefono || '-'}</td>
                        <td style={tdStyle}>{t.visita_motivos?.motivo || '-'}</td>
                        <td style={tdStyle}><span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: cEstado.bg, color: cEstado.text, fontWeight: '600' }}>{t.estado.replace('_', ' ')}</span></td>
                        <td style={{ ...tdStyle, fontSize: '12px', color: '#6b7280' }}>{t.observaciones || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODAL NUEVO TURNO */}
      {modalNuevo && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '4px' }}>➕ Nuevo turno PAMI</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              {new Date(modalNuevo.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {modalNuevo.hora} hs
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={labelStyle}>DNI</label><input placeholder="DNI" value={formTurno.dni} onChange={e => setFormTurno({ ...formTurno, dni: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Teléfono</label><input placeholder="11 1234-5678" value={formTurno.telefono} onChange={e => setFormTurno({ ...formTurno, telefono: e.target.value })} style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Apellido y Nombre</label><input placeholder="APELLIDO Nombre" value={formTurno.nombre} onChange={e => setFormTurno({ ...formTurno, nombre: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>Motivo</label>
                <select value={formTurno.motivo_id} onChange={e => setFormTurno({ ...formTurno, motivo_id: e.target.value })} style={inputStyle}>
                  <option value="">Sin motivo</option>
                  {motivos.map(m => <option key={m.id} value={m.id}>{m.motivo}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Observaciones</label><textarea placeholder="Observaciones..." value={formTurno.observaciones} onChange={e => setFormTurno({ ...formTurno, observaciones: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={guardarTurno} disabled={guardando} style={{ ...btnPrimario, opacity: guardando ? 0.7 : 1 }}>{guardando ? 'Guardando...' : '💾 Guardar'}</button>
              <button onClick={cerrarModalNuevo} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VER TURNO */}
      {modalVer && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a' }}>📋 Turno #{modalVer.id}</div>
              <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: coloresEstado[modalVer.estado]?.bg, color: coloresEstado[modalVer.estado]?.text, border: `1px solid ${coloresEstado[modalVer.estado]?.border}` }}>{modalVer.estado.replace('_', ' ')}</span>
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>{new Date(modalVer.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {modalVer.hora.slice(0, 5)} hs</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {modalVer.dni && <Row label="DNI">{modalVer.dni}</Row>}
              <Row label="Nombre">{modalVer.nombre || '-'}</Row>
              {modalVer.telefono && <Row label="Teléfono">{modalVer.telefono}</Row>}
              {modalVer.visita_motivos && <Row label="Motivo">{modalVer.visita_motivos.motivo}</Row>}
              <div style={{ display: 'flex', gap: '8px', fontSize: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: '600', color: '#6b7280', minWidth: '100px', flexShrink: 0 }}>Observaciones:</span>
                {editandoObs ? (
                  <div style={{ flex: 1 }}>
                    <textarea value={obsEditada} onChange={e => setObsEditada(e.target.value)} rows={3} style={{ ...inputStyle, fontSize: '13px', resize: 'vertical' }} />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button onClick={async () => {
                        await fetchConToken(`/api/turnos-pami/${modalVer.id}`, { method: 'PUT', body: JSON.stringify({ observaciones: obsEditada || null }) })
                        setEditandoObs(false)
                        setModalVer({ ...modalVer, observaciones: obsEditada })
                        cargarTurnos()
                      }} style={{ ...btnPrimario, fontSize: '12px', padding: '6px 12px' }}>💾 Guardar</button>
                      <button onClick={() => setEditandoObs(false)} style={{ ...btnSecundario, fontSize: '12px', padding: '6px 12px' }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'flex-start' }}>
                    <span style={{ color: '#1a1a1a', flex: 1 }}>{modalVer.observaciones || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>Sin observaciones</span>}</span>
                    <button onClick={() => { setObsEditada(modalVer.observaciones || ''); setEditandoObs(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#9ca3af' }}>✏️</button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '14px', borderTop: '1px solid #f3f4f6', marginBottom: '10px' }}>
              {modalVer.estado !== 'realizado' && <button onClick={() => cambiarEstado(modalVer.id, 'realizado')} style={{ ...btnPrimario, background: '#16a34a', fontSize: '13px', padding: '8px 14px' }}>✅ Asistió</button>}
              {modalVer.estado !== 'no_asistio' && <button onClick={() => cambiarEstado(modalVer.id, 'no_asistio')} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px', color: '#dc2626', borderColor: '#fecaca' }}>❌ No asistió</button>}
              {modalVer.estado !== 'cancelado' && <button onClick={() => cancelarTurno(modalVer.id)} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px' }}>🗑️ Cancelar</button>}
              {modalVer.estado !== 'cancelado' && (
                <button onClick={() => { setReprogramando(!reprogramando); setFormReprogramar({ fecha: modalVer.fecha, hora: modalVer.hora.slice(0, 5) }) }} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px', color: '#1d4ed8', borderColor: '#bfdbfe' }}>📅 Reprogramar</button>
              )}
              {modalVer.estado !== 'pendiente' && (
                <button onClick={async () => {
                  if (!confirm('¿Volver a pendiente?')) return
                  await fetchConToken(`/api/turnos-pami/${modalVer.id}`, { method: 'PUT', body: JSON.stringify({ estado: 'pendiente' }) })
                  setModalVer(null); cargarTurnos()
                }} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px', color: '#6b7280' }}>↩️ Volver a pendiente</button>
              )}
            </div>

            {reprogramando && (
              <div style={{ marginTop: '12px', padding: '14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d4ed8', marginBottom: '10px' }}>📅 Reprogramar turno</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Nueva fecha *</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <select value={formReprogramar.fecha ? formReprogramar.fecha.split('-')[2] : ''} onChange={e => { const f = formReprogramar.fecha || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-01`; const p = f.split('-'); setFormReprogramar({ ...formReprogramar, fecha: `${p[0]}-${p[1]}-${e.target.value}` }) }} style={{ ...inputStyle, width: '60px', padding: '10px 4px' }}>
                        <option value="">Día</option>
                        {Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0')).map(d=><option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={formReprogramar.fecha ? formReprogramar.fecha.split('-')[1] : ''} onChange={e => { const f = formReprogramar.fecha || `${new Date().getFullYear()}-01-01`; const p = f.split('-'); setFormReprogramar({ ...formReprogramar, fecha: `${p[0]}-${e.target.value}-${p[2]}` }) }} style={{ ...inputStyle, width: '90px', padding: '10px 4px' }}>
                        <option value="">Mes</option>
                        {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m,i)=><option key={m} value={m}>{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i]}</option>)}
                      </select>
                      <select value={formReprogramar.fecha ? formReprogramar.fecha.split('-')[0] : ''} onChange={e => { const f = formReprogramar.fecha || `2026-01-01`; const p = f.split('-'); setFormReprogramar({ ...formReprogramar, fecha: `${e.target.value}-${p[1]}-${p[2]}` }) }} style={{ ...inputStyle, width: '80px', padding: '10px 4px' }}>
                        <option value="">Año</option>
                        {['2026','2027'].map(y=><option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Nueva hora *</label>
                    <select value={formReprogramar.hora} onChange={e => setFormReprogramar({ ...formReprogramar, hora: e.target.value })} style={inputStyle}>
                      <option value="">Seleccionar hora</option>
                      {generarHorarios().map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={reprogramarTurno} disabled={guardandoReprogramar} style={{ ...btnPrimario, fontSize: '13px', padding: '8px 14px', background: '#1d4ed8', opacity: guardandoReprogramar ? 0.7 : 1 }}>{guardandoReprogramar ? 'Guardando...' : '💾 Confirmar'}</button>
                  <button onClick={() => setReprogramando(false)} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px' }}>Cancelar</button>
                </div>
              </div>
            )}

            <button onClick={() => { setModalVer(null); setReprogramando(false); setEditandoObs(false) }} style={{ ...btnSecundario, fontSize: '13px', marginTop: '10px' }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
      <span style={{ fontWeight: '600', color: '#6b7280', minWidth: '100px', flexShrink: 0 }}>{label}:</span>
      <span style={{ color: '#1a1a1a' }}>{children}</span>
    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', fontFamily: "'Outfit', sans-serif", background: 'white', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', display: 'block' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnIcono = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#374151', padding: '2px 8px', borderRadius: '4px' }
const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modalBox = { background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }
const thBase = { padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }
const thStyle = { padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', whiteSpace: 'nowrap' }
const tdStyle = { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#1a1a1a', verticalAlign: 'top' }
