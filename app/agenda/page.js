'use client'

export const dynamic = 'force-dynamic'

import { getUsuarioId } from '../../lib/getUsuario'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { normalizarTexto } from '../../lib/formatText'

const HORA_INICIO = 9
const HORA_FIN_SEMANA = 18
const HORA_FIN_SABADO = 13

function generarHorarios() {
  const horarios = []
  for (let h = HORA_INICIO; h < HORA_FIN_SEMANA; h++) {
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
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })
}

const COLORES_AGENDA = ['#8B1E2D', '#1d4ed8', '#15803d', '#b45309', '#7c3aed', '#0e7490']
const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const coloresEstado = {
  pendiente: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  realizado: { bg: '#dcfce7', border: '#16a34a', text: '#15803d' },
  no_asistio: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' },
  cancelado: { bg: '#f3f4f6', border: '#d1d5db', text: '#9ca3af' },
}

export default function Agenda() {
  const hoy = new Date()
  const [semanaBase, setSemanaBase] = useState(getLunesDeISemana(hoy))
  const [mesCalendario, setMesCalendario] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() })
  const [agendas, setAgendas] = useState([])
  const [agendaFiltro, setAgendaFiltro] = useState('todas')
  const [turnos, setTurnos] = useState([])
  const [turnosMes, setTurnosMes] = useState([])
  const [bloqueos, setBloqueos] = useState([])
  const [motivos, setMotivos] = useState([])
  const [obrasSociales, setObrasSociales] = useState([])
  const [verCancelados, setVerCancelados] = useState(false)
  const [verBloqueos, setVerBloqueos] = useState(false)

  // Modal nuevo turno
  const [modalNuevo, setModalNuevo] = useState(null)
  const [formTurno, setFormTurno] = useState({ agenda_id: '', nombre_libre: '', telefono: '', motivo_id: '', obra_social_id: '', observaciones: '' })
  const [busquedaPaciente, setBusquedaPaciente] = useState('')
  const [pacientesResultados, setPacientesResultados] = useState([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null)
  const [buscoPaciente, setBuscoPaciente] = useState(false)
  const [altaRapida, setAltaRapida] = useState(false)
  const [formAltaRapida, setFormAltaRapida] = useState({ apellido: '', nombre: '', dni: '', telefono: '' })

  // Modal ver turno
  const [modalVer, setModalVer] = useState(null)

  // Modal bloqueo
  const [modalBloqueo, setModalBloqueo] = useState(false)
  const [bloqueoEditando, setBloqueoEditando] = useState(null)
  const [formBloqueo, setFormBloqueo] = useState({
    fecha_inicio: '', fecha_fin: '', hora_inicio: '', hora_fin: '',
    profesional_id: '', motivo: '', todo_el_dia: true, todas_las_agendas: false,
  })

  useEffect(() => { cargarDatos() }, [])
  useEffect(() => { cargarTurnos() }, [semanaBase])
  useEffect(() => { cargarTurnosMes() }, [mesCalendario])
  useEffect(() => { cargarBloqueosSemana() }, [semanaBase])

  async function cargarDatos() {
    const [{ data: ags }, { data: movs }, { data: os }] = await Promise.all([
      supabase.from('profesionales').select('*').eq('activo', true).order('nombre'),
      supabase.from('visita_motivos').select('*').eq('activo', true).order('motivo'),
      supabase.from('obras_sociales').select('*').order('obra_social'),
    ])
    setAgendas(ags || [])
    setMotivos(movs || [])
    setObrasSociales(os || [])
    cargarTurnos()
  }

  async function cargarTurnos() {
    const lunes = new Date(semanaBase)
    const sabado = new Date(semanaBase)
    sabado.setDate(sabado.getDate() + 5)
    const { data } = await supabase.from('turnos')
      .select(`id, fecha, hora, observaciones, estado, asistio, nombre_libre, telefono,
        pacientes (id, apellido_paciente, nombres_paciente, dni, telefono),
        profesionales (id, nombre, tipo),
        visita_motivos (motivo),
        obras_sociales (obra_social)`)
      .gte('fecha', formatFecha(lunes)).lte('fecha', formatFecha(sabado)).order('hora')
    setTurnos(data || [])
  }

  async function cargarTurnosMes() {
    const { year, month } = mesCalendario
    const primerDia = new Date(year, month, 1)
    const ultimoDia = new Date(year, month + 1, 0)
    const { data } = await supabase.from('turnos')
      .select('fecha, estado')
      .gte('fecha', formatFecha(primerDia))
      .lte('fecha', formatFecha(ultimoDia))
      .neq('estado', 'cancelado')
    setTurnosMes(data || [])
  }

  async function cargarBloqueosSemana() {
    const lunes = new Date(semanaBase)
    const sabado = new Date(semanaBase)
    sabado.setDate(sabado.getDate() + 5)
    const { data } = await supabase.from('agenda_bloqueos')
      .select('*, profesionales (nombre)')
      .lte('fecha_inicio', formatFecha(sabado))
      .gte('fecha_fin', formatFecha(lunes))
    setBloqueos(data || [])
  }

  async function buscarPacientes() {
    const termino = busquedaPaciente.trim()
    if (!termino) return
    let query = supabase.from('pacientes').select('id, apellido_paciente, nombres_paciente, dni, telefono')
    if (/^\d+$/.test(termino)) { query = query.eq('dni', termino) } else { query = query.ilike('apellido_paciente', `%${termino}%`) }
    const { data } = await query.order('apellido_paciente').limit(10)
    setPacientesResultados(data || [])
    setBuscoPaciente(true)
  }

  async function guardarAltaRapida() {
    if (!formAltaRapida.apellido || !formAltaRapida.nombre || !formAltaRapida.dni) { alert('Apellido, nombre y DNI son obligatorios'); return }
    const { data: existe } = await supabase.from('pacientes').select('id').eq('dni', formAltaRapida.dni).maybeSingle()
    if (existe) { alert('❌ Ya existe un paciente con ese DNI'); return }
    const { data: nuevo, error } = await supabase.from('pacientes').insert([{
      apellido_paciente: formAltaRapida.apellido, nombres_paciente: formAltaRapida.nombre,
      dni: formAltaRapida.dni, telefono: formAltaRapida.telefono || null, creado_por: getUsuarioId(),
    }]).select().single()
    if (error) { alert('Error: ' + error.message); return }
    setPacienteSeleccionado(nuevo)
    setAltaRapida(false); setFormAltaRapida({ apellido: '', nombre: '', dni: '', telefono: '' })
    setBusquedaPaciente(''); setPacientesResultados([]); setBuscoPaciente(false)
  }

  async function guardarTurno() {
    if (!modalNuevo) return
    const agendaId = formTurno.agenda_id || modalNuevo.agenda_id
    if (!agendaId) { alert('Seleccioná una agenda'); return }
    if (!pacienteSeleccionado && !formTurno.nombre_libre) { alert('Seleccioná un paciente o ingresá un nombre'); return }
    const { data: existente } = await supabase.from('turnos').select('id')
      .eq('fecha', modalNuevo.fecha).eq('hora', modalNuevo.hora + ':00')
      .eq('profesional_id', Number(agendaId)).neq('estado', 'cancelado').maybeSingle()
    if (existente) { alert('Ya hay un turno en ese horario para esa agenda'); return }
    const { error } = await supabase.from('turnos').insert([{
      fecha: modalNuevo.fecha, hora: modalNuevo.hora + ':00', profesional_id: Number(agendaId),
      paciente_id: pacienteSeleccionado?.id || null,
      nombre_libre: !pacienteSeleccionado ? normalizarTexto(formTurno.nombre_libre) : null,
      telefono: formTurno.telefono || pacienteSeleccionado?.telefono || null,
      motivo_id: formTurno.motivo_id ? Number(formTurno.motivo_id) : null,
      obra_social_id: formTurno.obra_social_id ? Number(formTurno.obra_social_id) : null,
      observaciones: formTurno.observaciones || null, estado: 'pendiente', creado_por: getUsuarioId(),
    }])
    if (error) { alert('Error: ' + error.message); return }
    cerrarModalNuevo(); cargarTurnos(); cargarTurnosMes()
  }

  async function marcarAsistencia(turnoId, asistio) {
    await supabase.from('turnos').update({ asistio, estado: asistio ? 'realizado' : 'no_asistio' }).eq('id', turnoId)
    setModalVer(null); cargarTurnos()
  }

  async function cancelarTurno(turnoId) {
    if (!confirm('¿Cancelar este turno?')) return
    await supabase.from('turnos').update({ estado: 'cancelado' }).eq('id', turnoId)
    setModalVer(null); cargarTurnos()
  }

  function cerrarModalNuevo() {
    setModalNuevo(null)
    setFormTurno({ agenda_id: '', nombre_libre: '', telefono: '', motivo_id: '', obra_social_id: '', observaciones: '' })
    setBusquedaPaciente(''); setPacienteSeleccionado(null); setPacientesResultados([])
    setBuscoPaciente(false); setAltaRapida(false); setFormAltaRapida({ apellido: '', nombre: '', dni: '', telefono: '' })
  }

  async function guardarBloqueo() {
    if (!formBloqueo.fecha_inicio || !formBloqueo.fecha_fin) { alert('Ingresar fechas'); return }
    if (!formBloqueo.todas_las_agendas && !formBloqueo.profesional_id) { alert('Seleccionar agenda o marcar todas'); return }
    if (!formBloqueo.todo_el_dia && (!formBloqueo.hora_inicio || !formBloqueo.hora_fin)) { alert('Ingresar horarios'); return }
    const data = {
      fecha_inicio: formBloqueo.fecha_inicio, fecha_fin: formBloqueo.fecha_fin,
      hora_inicio: formBloqueo.todo_el_dia ? null : formBloqueo.hora_inicio,
      hora_fin: formBloqueo.todo_el_dia ? null : formBloqueo.hora_fin,
      profesional_id: formBloqueo.todas_las_agendas ? null : Number(formBloqueo.profesional_id),
      motivo: formBloqueo.motivo || null,
      todo_el_dia: formBloqueo.todo_el_dia,
      todas_las_agendas: formBloqueo.todas_las_agendas,
      creado_por: getUsuarioId(),
    }
    if (bloqueoEditando) {
      await supabase.from('agenda_bloqueos').update(data).eq('id', bloqueoEditando.id)
    } else {
      await supabase.from('agenda_bloqueos').insert([data])
    }
    setModalBloqueo(false); setBloqueoEditando(null)
    setFormBloqueo({ fecha_inicio: '', fecha_fin: '', hora_inicio: '', hora_fin: '', profesional_id: '', motivo: '', todo_el_dia: true, todas_las_agendas: false })
    cargarBloqueosSemana()
  }

  async function eliminarBloqueo(id) {
    if (!confirm('¿Eliminar este bloqueo?')) return
    await supabase.from('agenda_bloqueos').delete().eq('id', id)
    cargarBloqueosSemana()
  }

  function abrirEditarBloqueo(b) {
    setBloqueoEditando(b)
    setFormBloqueo({
      fecha_inicio: b.fecha_inicio, fecha_fin: b.fecha_fin,
      hora_inicio: b.hora_inicio || '', hora_fin: b.hora_fin || '',
      profesional_id: b.profesional_id ? String(b.profesional_id) : '',
      motivo: b.motivo || '', todo_el_dia: b.todo_el_dia, todas_las_agendas: b.todas_las_agendas,
    })
    setModalBloqueo(true)
  }

  function esBloqueado(fechaStr, hora) {
    return bloqueos.some(b => {
      if (fechaStr < b.fecha_inicio || fechaStr > b.fecha_fin) return false
      if (b.todo_el_dia) return true
      if (!b.hora_inicio || !b.hora_fin) return true
      return hora >= b.hora_inicio.slice(0, 5) && hora < b.hora_fin.slice(0, 5)
    })
  }

  function getBloqueosDia(fechaStr) {
    return bloqueos.filter(b => fechaStr >= b.fecha_inicio && fechaStr <= b.fecha_fin && b.todo_el_dia)
  }

  function getTurnosSlot(fecha, hora) {
    const horaCorta = hora.slice(0, 5)
    return turnos.filter(t =>
      t.fecha === fecha && t.hora.slice(0, 5) === horaCorta &&
      (t.estado !== 'cancelado' || verCancelados)
    )
  }

  function getColorAgenda(agendaId) {
    const idx = agendas.findIndex(a => a.id === agendaId)
    return COLORES_AGENDA[idx % COLORES_AGENDA.length]
  }

  function mesSiguiente() {
    setMesCalendario(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 })
  }
  function mesAnterior() {
    setMesCalendario(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 })
  }

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

  function tieneTurnos(fecha) {
    const f = formatFecha(fecha)
    return turnosMes.some(t => t.fecha === f)
  }

  const dias = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(semanaBase)
    d.setDate(d.getDate() + i)
    dias.push(d)
  }

  const horarios = generarHorarios()
  const hoyStr = formatFecha(hoy)
  const semanaActualStr = formatFecha(semanaBase)

  return (
    <div style={{ maxWidth: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Turnos</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
            Semana del {dias[0] && formatFechaMostrar(dias[0])} al {dias[5] && formatFechaMostrar(dias[5])}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setVerBloqueos(!verBloqueos)} style={{
            padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
            border: `1px solid ${verBloqueos ? '#8B1E2D' : '#e5e7eb'}`,
            background: verBloqueos ? '#fdf2f4' : 'white', color: verBloqueos ? '#8B1E2D' : '#374151',
            fontFamily: "'Outfit', sans-serif",
          }}>🔒 Bloqueos {bloqueos.length > 0 && `(${bloqueos.length})`}</button>
          <button onClick={() => {
            setBloqueoEditando(null)
            setFormBloqueo({ fecha_inicio: hoyStr, fecha_fin: hoyStr, hora_inicio: '', hora_fin: '', profesional_id: '', motivo: '', todo_el_dia: true, todas_las_agendas: false })
            setModalBloqueo(true)
          }} style={btnSecundario}>+ Bloquear</button>
        </div>
      </div>

      {/* CALENDARIO MENSUAL */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button onClick={mesAnterior} style={btnIcono}>‹</button>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a1a' }}>{MESES[mesCalendario.month]} {mesCalendario.year}</span>
          <button onClick={mesSiguiente} style={btnIcono}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
          {DIAS_SEMANA.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#9ca3af', padding: '2px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {getDiasMes().map((dia, i) => {
            if (!dia) return <div key={i} />
            const fechaStr = formatFecha(dia)
            const esHoy = fechaStr === hoyStr
            const esDomingo = dia.getDay() === 0
            const semanaDelDia = formatFecha(getLunesDeISemana(dia))
            const esSemanaActual = semanaDelDia === semanaActualStr
            const tieneT = tieneTurnos(dia)
            return (
              <div key={i} onClick={() => {
                if (esDomingo) return
                setSemanaBase(getLunesDeISemana(dia))
                setMesCalendario({ year: dia.getFullYear(), month: dia.getMonth() })
              }} style={{
                textAlign: 'center', padding: '5px 2px', borderRadius: '6px',
                cursor: esDomingo ? 'default' : 'pointer',
                background: esHoy ? '#8B1E2D' : esSemanaActual ? '#fdf2f4' : 'transparent',
                color: esHoy ? 'white' : esDomingo ? '#d1d5db' : '#374151',
                fontWeight: esHoy ? '700' : esSemanaActual ? '600' : '400',
                fontSize: '12px',
                border: esSemanaActual && !esHoy ? '1px solid #f5c2c9' : '1px solid transparent',
                opacity: esDomingo ? 0.4 : 1,
              }}>
                {dia.getDate()}
                {tieneT && (
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: esHoy ? 'white' : '#8B1E2D', margin: '1px auto 0' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bloqueos de la semana */}
      {verBloqueos && (
        <div style={{ background: '#fdf2f4', border: '1px solid #f5c2c9', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#8B1E2D', marginBottom: bloqueos.length > 0 ? '10px' : '0' }}>🔒 Bloqueos esta semana</div>
          {bloqueos.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>No hay bloqueos para esta semana</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {bloqueos.map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', flexWrap: 'wrap', gap: '6px' }}>
                  <div>
                    <span style={{ fontWeight: '600', color: '#374151' }}>{b.todas_las_agendas ? 'Todas las agendas' : b.profesionales?.nombre}</span>
                    <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                      {b.fecha_inicio === b.fecha_fin
                        ? new Date(b.fecha_inicio + 'T12:00:00').toLocaleDateString('es-AR')
                        : `${new Date(b.fecha_inicio + 'T12:00:00').toLocaleDateString('es-AR')} al ${new Date(b.fecha_fin + 'T12:00:00').toLocaleDateString('es-AR')}`
                      }
                      {!b.todo_el_dia && b.hora_inicio && ` · ${b.hora_inicio.slice(0, 5)} a ${b.hora_fin.slice(0, 5)}`}
                      {b.motivo && ` · ${b.motivo}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => abrirEditarBloqueo(b)} style={{ ...btnSecundario, fontSize: '11px', padding: '3px 8px' }}>✏️</button>
                    <button onClick={() => eliminarBloqueo(b.id)} style={{ ...btnSecundario, fontSize: '11px', padding: '3px 8px', color: '#dc2626', borderColor: '#fecaca' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navegación semanal */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate() - 7); setSemanaBase(d) }} style={btnSecundario}>← Anterior</button>
        <button onClick={() => { setSemanaBase(getLunesDeISemana(hoy)); setMesCalendario({ year: hoy.getFullYear(), month: hoy.getMonth() }) }} style={btnSecundario}>Hoy</button>
        <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate() + 7); setSemanaBase(d) }} style={btnSecundario}>Siguiente →</button>
      </div>

      {/* Filtros por agenda */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Agenda:</span>
        <button onClick={() => setAgendaFiltro('todas')} style={{
          padding: '7px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer',
          background: agendaFiltro === 'todas' ? '#1a1a1a' : 'white', color: agendaFiltro === 'todas' ? 'white' : '#374151',
          fontSize: '13px', fontWeight: '600', fontFamily: "'Outfit', sans-serif",
        }}>Todas</button>
        {agendas.map((a, i) => (
          <button key={a.id} onClick={() => setAgendaFiltro(String(a.id))} style={{
            padding: '7px 16px', borderRadius: '8px', border: `1px solid ${COLORES_AGENDA[i % COLORES_AGENDA.length]}`, cursor: 'pointer',
            background: agendaFiltro === String(a.id) ? COLORES_AGENDA[i % COLORES_AGENDA.length] : 'white',
            color: agendaFiltro === String(a.id) ? 'white' : COLORES_AGENDA[i % COLORES_AGENDA.length],
            fontSize: '13px', fontWeight: '600', fontFamily: "'Outfit', sans-serif",
          }}>
            {a.nombre}{a.tipo === 'agenda_os' && <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.8 }}>OS</span>}
          </button>
        ))}
        <button onClick={() => setVerCancelados(!verCancelados)} style={{
          padding: '7px 16px', borderRadius: '8px', cursor: 'pointer',
          border: `1px solid ${verCancelados ? '#6b7280' : '#e5e7eb'}`,
          background: verCancelados ? '#6b7280' : 'white', color: verCancelados ? 'white' : '#9ca3af',
          fontSize: '13px', fontWeight: '600', fontFamily: "'Outfit', sans-serif",
        }}>{verCancelados ? '✕ Ocultar cancelados' : '👁 Ver cancelados'}</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.entries(coloresEstado).map(([estado, c]) => (
            <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: c.bg, border: `1px solid ${c.border}` }} />
              {estado.replace('_', ' ')}
            </div>
          ))}
        </div>
      </div>

      {/* Grilla semanal */}
      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${80 + dias.length * 140}px`, background: 'white' }}>
          <thead>
            <tr>
              <th style={{ ...thBase, width: '64px', borderRight: '1px solid #e5e7eb' }}>HORA</th>
              {dias.map((dia, di) => {
                const esSabado = dia.getDay() === 6
                const esHoy = formatFecha(dia) === hoyStr
                const bloqueosDia = getBloqueosDia(formatFecha(dia))
                return (
                  <th key={di} style={{ ...thBase, background: esHoy ? '#fdf2f4' : '#f9fafb', color: esHoy ? '#8B1E2D' : '#374151', borderLeft: '1px solid #e5e7eb', fontWeight: esHoy ? '700' : '600', fontSize: '12px' }}>
                    {formatFechaMostrar(dia).toUpperCase()}
                    {esSabado && <div style={{ fontSize: '9px', color: '#9ca3af', fontWeight: '400' }}>hasta 13hs</div>}
                    {esHoy && <div style={{ fontSize: '9px', color: '#8B1E2D', fontWeight: '700' }}>HOY</div>}
                    {bloqueosDia.length > 0 && (
                      <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: '600', background: '#fef2f2', borderRadius: '3px', padding: '1px 4px', marginTop: '2px' }}>
                        🔒 {bloqueosDia[0]?.motivo || 'Bloqueado'}
                      </div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {horarios.map(hora => (
              <tr key={hora} style={{ borderBottom: hora.endsWith(':00') ? '1px solid #e5e7eb' : '1px solid #f9fafb' }}>
                <td style={{ padding: '4px 8px', fontSize: '11px', textAlign: 'right', whiteSpace: 'nowrap', color: hora.endsWith(':00') ? '#374151' : '#9ca3af', fontWeight: hora.endsWith(':00') ? '600' : '400', background: '#fafafa', borderRight: '1px solid #e5e7eb', verticalAlign: 'top', paddingTop: '6px' }}>
                  {hora}
                </td>
                {dias.map((dia, di) => {
                  const fechaStr = formatFecha(dia)
                  const esSabado = dia.getDay() === 6
                  const fueraHorario = esSabado && hora >= '13:00'
                  const esHoy = fechaStr === hoyStr
                  const bloqueado = esBloqueado(fechaStr, hora)

                  if (fueraHorario) return <td key={di} style={{ background: '#f3f4f6', borderLeft: '1px solid #e5e7eb' }} />

                  if (bloqueado) return (
                    <td key={di} style={{ background: '#fef2f2', borderLeft: '1px solid #fecaca', cursor: 'not-allowed' }}>
                      <div style={{ height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#fca5a5' }}>🔒</span>
                      </div>
                    </td>
                  )

                  const turnosSlot = getTurnosSlot(fechaStr, hora)
                  const turnosFiltrados = agendaFiltro === 'todas' ? turnosSlot : turnosSlot.filter(t => String(t.profesionales?.id) === agendaFiltro)

                  return (
                    <td key={di} style={{ padding: '2px 4px', borderLeft: '1px solid #e5e7eb', verticalAlign: 'top', background: esHoy ? '#fffbfb' : 'white', cursor: 'pointer', minWidth: '130px' }}
                      onClick={() => {
                        if (turnosFiltrados.length === 0) {
                          setModalNuevo({ fecha: fechaStr, hora, agenda_id: agendaFiltro !== 'todas' ? agendaFiltro : '' })
                          setFormTurno(f => ({ ...f, agenda_id: agendaFiltro !== 'todas' ? agendaFiltro : '' }))
                        }
                      }}>
                      {turnosFiltrados.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {turnosFiltrados.map(t => {
                            const color = getColorAgenda(t.profesionales?.id)
                            const cEstado = coloresEstado[t.estado] || coloresEstado.pendiente
                            return (
                              <div key={t.id} onClick={(e) => { e.stopPropagation(); setModalVer(t) }} style={{ padding: '3px 6px', borderRadius: '4px', fontSize: '11px', background: cEstado.bg, border: `1px solid ${cEstado.border}`, borderLeftWidth: '3px', borderLeftColor: color, cursor: 'pointer', lineHeight: 1.3 }}>
                                <div style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px', color: cEstado.text }}>
                                  {t.pacientes ? `${t.pacientes.apellido_paciente} ${t.pacientes.nombres_paciente}` : t.nombre_libre || '-'}
                                </div>
                                <div style={{ fontSize: '10px', color: color, fontWeight: '600' }}>
                                  {t.profesionales?.nombre}{t.visita_motivos?.motivo && ` · ${t.visita_motivos.motivo}`}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div style={{ height: '32px', borderRadius: '4px', border: '1px dashed transparent', transition: '0.1s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#f9fafb' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
                        />
                      )}
                    </td>
                  )
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
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '4px' }}>➕ Nuevo turno</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              {new Date(modalNuevo.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {modalNuevo.hora} hs
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Agenda *</label>
                <select value={formTurno.agenda_id} onChange={(e) => setFormTurno({ ...formTurno, agenda_id: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar agenda</option>
                  {agendas.map(a => <option key={a.id} value={a.id}>{a.nombre}{a.tipo === 'agenda_os' ? ' (OS)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Paciente</label>
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
              {!pacienteSeleccionado && !altaRapida && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><label style={labelStyle}>Nombre (sin paciente cargado)</label><input placeholder="APELLIDO NOMBRE" value={formTurno.nombre_libre} onChange={(e) => setFormTurno({ ...formTurno, nombre_libre: e.target.value })} style={{ ...inputStyle, textTransform: 'uppercase' }} /></div>
                  <div><label style={labelStyle}>Teléfono</label><input placeholder="11 1234-5678" value={formTurno.telefono} onChange={(e) => setFormTurno({ ...formTurno, telefono: e.target.value })} style={inputStyle} /></div>
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
                <textarea placeholder="Observaciones del turno..." value={formTurno.observaciones} onChange={(e) => setFormTurno({ ...formTurno, observaciones: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a' }}>📋 Turno #{modalVer.id}</div>
              <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: coloresEstado[modalVer.estado]?.bg, color: coloresEstado[modalVer.estado]?.text, border: `1px solid ${coloresEstado[modalVer.estado]?.border}` }}>
                {modalVer.estado.replace('_', ' ')}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              {new Date(modalVer.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {modalVer.hora.slice(0, 5)} hs
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <Row label="Agenda">{modalVer.profesionales?.nombre}</Row>
              <Row label="Paciente">{modalVer.pacientes ? `${modalVer.pacientes.apellido_paciente} ${modalVer.pacientes.nombres_paciente} (DNI: ${modalVer.pacientes.dni})` : modalVer.nombre_libre || '-'}</Row>
              {(modalVer.telefono || modalVer.pacientes?.telefono) && <Row label="Teléfono">{modalVer.telefono || modalVer.pacientes?.telefono}</Row>}
              {modalVer.visita_motivos && <Row label="Motivo">{modalVer.visita_motivos.motivo}</Row>}
              {modalVer.obras_sociales && <Row label="Obra social">{modalVer.obras_sociales.obra_social}</Row>}
              {modalVer.observaciones && <Row label="Observaciones">{modalVer.observaciones}</Row>}
            </div>
            {modalVer.estado === 'pendiente' && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '14px', borderTop: '1px solid #f3f4f6', marginBottom: '10px' }}>
                <button onClick={() => marcarAsistencia(modalVer.id, true)} style={{ ...btnPrimario, background: '#16a34a', fontSize: '13px', padding: '8px 14px' }}>✅ Asistió</button>
                <button onClick={() => marcarAsistencia(modalVer.id, false)} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px', color: '#dc2626', borderColor: '#fecaca' }}>❌ No asistió</button>
                <button onClick={() => cancelarTurno(modalVer.id)} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px' }}>🗑️ Cancelar</button>
              </div>
            )}
            <button onClick={() => setModalVer(null)} style={{ ...btnSecundario, fontSize: '13px' }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL BLOQUEO */}
      {modalBloqueo && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '20px' }}>
              🔒 {bloqueoEditando ? 'Editar bloqueo' : 'Nuevo bloqueo'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={labelStyle}>Fecha inicio *</label><input type="date" value={formBloqueo.fecha_inicio} onChange={(e) => setFormBloqueo({ ...formBloqueo, fecha_inicio: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Fecha fin *</label><input type="date" value={formBloqueo.fecha_fin} onChange={(e) => setFormBloqueo({ ...formBloqueo, fecha_fin: e.target.value })} style={inputStyle} /></div>
              </div>
              <div>
                <label style={labelStyle}>Agenda</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input type="checkbox" checked={formBloqueo.todas_las_agendas} onChange={(e) => setFormBloqueo({ ...formBloqueo, todas_las_agendas: e.target.checked, profesional_id: '' })} />
                  Todas las agendas
                </label>
                {!formBloqueo.todas_las_agendas && (
                  <select value={formBloqueo.profesional_id} onChange={(e) => setFormBloqueo({ ...formBloqueo, profesional_id: e.target.value })} style={inputStyle}>
                    <option value="">Seleccionar agenda</option>
                    {agendas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label style={labelStyle}>Horario</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input type="checkbox" checked={formBloqueo.todo_el_dia} onChange={(e) => setFormBloqueo({ ...formBloqueo, todo_el_dia: e.target.checked })} />
                  Todo el día
                </label>
                {!formBloqueo.todo_el_dia && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><label style={labelStyle}>Desde</label><input type="time" value={formBloqueo.hora_inicio} onChange={(e) => setFormBloqueo({ ...formBloqueo, hora_inicio: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Hasta</label><input type="time" value={formBloqueo.hora_fin} onChange={(e) => setFormBloqueo({ ...formBloqueo, hora_fin: e.target.value })} style={inputStyle} /></div>
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Motivo</label>
                <input placeholder="Ej: Feriado, Tarde libre, Congreso..." value={formBloqueo.motivo} onChange={(e) => setFormBloqueo({ ...formBloqueo, motivo: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={guardarBloqueo} style={btnPrimario}>💾 Guardar</button>
              <button onClick={() => { setModalBloqueo(false); setBloqueoEditando(null) }} style={btnSecundario}>Cancelar</button>
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
      <span style={{ fontWeight: '600', color: '#6b7280', minWidth: '100px', flexShrink: 0 }}>{label}:</span>
      <span style={{ color: '#1a1a1a' }}>{children}</span>
    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', fontFamily: "'Outfit', sans-serif", background: 'white', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', display: 'block' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnFantasma = { padding: '8px 16px', background: 'transparent', color: '#8B1E2D', border: '1px dashed #8B1E2D', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnIcono = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#374151', padding: '2px 8px', borderRadius: '4px' }
const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modalBox = { background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }
const thBase = { padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }
