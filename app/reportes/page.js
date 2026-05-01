'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { fetchConToken } from '../../lib/fetchConToken'
import { usePermiso } from '../../lib/usePermisos'

const ESTADOS_REPARACION = [
  { key: 'ingresada', label: 'Ingresada' },
  { key: 'en_evaluacion', label: 'En evaluación' },
  { key: 'esperando_respuesta', label: 'Esperando respuesta' },
  { key: 'aprobada', label: 'Aprobada' },
  { key: 'en_reparacion', label: 'En reparación' },
  { key: 'lista_entregar', label: 'Lista para entregar' },
  { key: 'entregada', label: 'Entregada' },
  { key: 'no_aprobada', label: 'No aprobada' },
  { key: 'no_aprobada_devuelta', label: 'No aprobada - Devuelta' },
]

export default function Reportes() {
  const hoy = new Date().toISOString().split('T')[0]
  const [desde, setDesde] = useState(hoy)
  const [hasta, setHasta] = useState(hoy)
  const [operadorId, setOperadorId] = useState('')
  const [usuarios, setUsuarios] = useState([])
  const [obrasSociales, setObrasSociales] = useState([])
  const [obraSocialId, setObraSocialId] = useState('')
  const [motivoId, setMotivoId] = useState('')
  const [motivos, setMotivos] = useState([])
  const [agendaId, setAgendaId] = useState('')
  const [formaPagoId, setFormaPagoId] = useState('')
  const [formasPago, setFormasPago] = useState([])
  const [agendas, setAgendas] = useState([])
  const [estadoReparacion, setEstadoReparacion] = useState('')
  const [tab, setTab] = useState('ventas')
  const [cargando, setCargando] = useState(false)

  const [estadoMolde, setEstadoMolde] = useState('')
const [moldes, setMoldes] = useState([])

const ESTADOS_MOLDES = [
  { key: 'ingresado', label: 'Ingresado' },
  { key: 'en_proceso', label: 'En proceso' },
  { key: 'listo_entregar', label: 'Listo para entregar' },
  { key: 'entregado', label: 'Entregado' },
  { key: 'cancelado', label: 'Cancelado' },
]

  const { verificando, permitido } = usePermiso('reportes')
  
  const [busquedaPaciente, setBusquedaPaciente] = useState('')
  const [resultadosPaciente, setResultadosPaciente] = useState([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null)

  const [ventas, setVentas] = useState([])
  const [pagos, setPagos] = useState([])
  const [movimientosCaja, setMovimientosCaja] = useState([])
  const [visitas, setVisitas] = useState([])
  const [turnos, setTurnos] = useState([])
  const [reparaciones, setReparaciones] = useState([])

  const [tipos, setTipos] = useState([])
const [productosReporte, setProductosReporte] = useState([])
const [modelosReporte, setModelosReporte] = useState([])
const [filtroTipoId, setFiltroTipoId] = useState('')
const [filtroProductoId, setFiltroProductoId] = useState('')
const [filtroModeloId, setFiltroModeloId] = useState('')
const [productosFiltradosReporte, setProductosFiltradosReporte] = useState([])
const [modelosFiltradosReporte, setModelosFiltradosReporte] = useState([])

  useEffect(() => { cargarDatosIniciales() }, [])

  async function cargarDatosIniciales() {
  const [resUsuarios, resOS, resMotivos, resAgendas, resFP, resTipos, resProductos, resModelos] = await Promise.all([
    fetchConToken('/api/usuarios'),
    fetchConToken('/api/configuracion/obras-sociales'),
    fetchConToken('/api/configuracion/motivos?activos=true'),
    fetchConToken('/api/configuracion/profesionales'),
    fetchConToken('/api/configuracion/formas-pago'),
    fetchConToken('/api/configuracion/tipos-producto'),
    fetchConToken('/api/productos'),
    fetchConToken('/api/configuracion/modelos'),
  ])
  const [dUsuarios, dOS, dMotivos, dAgendas, dFP, dTipos, dProductos, dModelos] = await Promise.all([
    resUsuarios.json(), resOS.json(), resMotivos.json(), resAgendas.json(), resFP.json(),
    resTipos.json(), resProductos.json(), resModelos.json()
  ])
  setUsuarios(dUsuarios.usuarios || [])
  setObrasSociales(dOS.obras_sociales || [])
  setMotivos(dMotivos.motivos || [])
  setAgendas(dAgendas.profesionales || [])
  setFormasPago(dFP.formas_pago || [])
  setTipos(dTipos.tipos || [])
  setProductosReporte(dProductos.productos || [])
  setModelosReporte(dModelos.modelos || [])
}

  async function buscarPacientes() {
    const termino = busquedaPaciente.trim()
    if (!termino) return
    const res = await fetchConToken(`/api/pacientes?q=${encodeURIComponent(termino)}`)
    const data = await res.json()
    setResultadosPaciente(data.pacientes || [])
  }

  async function buscar() {
  setCargando(true)
  await Promise.all([cargarVentas(filtroProductoId, filtroModeloId, filtroTipoId), cargarPagos(), cargarCaja(), cargarVisitas(), cargarTurnos(), cargarReparaciones(), cargarMoldes()])
  setCargando(false)
}

async function cargarVentas(productoId = '', modeloId = '', tipoId = '') {
  const params = new URLSearchParams({ desde, hasta })
  if (operadorId) params.set('creado_por', operadorId)
  if (obraSocialId) params.set('obra_social_id', obraSocialId)
  if (pacienteSeleccionado) params.set('paciente_id', pacienteSeleccionado.id)
  const res = await fetchConToken(`/api/ventas?${params}`)
  const data = await res.json()
  let resultado = data.ventas || []

  if (productoId || modeloId || tipoId) {
  const productosDelTipo = productoId ? [Number(productoId)] : 
    productosFiltradosReporte.map(p => p.id)

  resultado = resultado
    .map(v => {
      const detalleFiltrado = (v.venta_detalle || []).filter(d => {
        const productoRealId = d.producto_id || d.numeros_serie?.productos?.id
        const productoOk = tipoId && !productoId
          ? productosDelTipo.includes(productoRealId)
          : productoId
            ? productoRealId == productoId
            : true
        const modeloOk = modeloId
          ? d.numeros_serie?.modelo_id == modeloId
          : true
        return productoOk && modeloOk
      })
      return { ...v, venta_detalle: detalleFiltrado }
    })
    .filter(v => v.venta_detalle.length > 0)
}

  setVentas(resultado)
}

  async function cargarPagos() {
  const params = new URLSearchParams({ desde, hasta })
  if (formaPagoId) params.set('forma_pago_id', formaPagoId)
  const res = await fetchConToken(`/api/pagos?${params}`)
  const data = await res.json()
  let resultado = data.pagos || []
  if (obraSocialId) {
    resultado = resultado.filter(p => p.ventas?.obra_social_id == obraSocialId)
  }
  setPagos(resultado)
}

  async function cargarCaja() {
    const [resPagos, resManuales] = await Promise.all([
      fetchConToken(`/api/pagos?desde=${desde}&hasta=${hasta}`),
      fetchConToken(`/api/caja?desde=${desde}&hasta=${hasta}`),
    ])
    const [dPagos, dManuales] = await Promise.all([resPagos.json(), resManuales.json()])
    const pagosComoMovimientos = (dPagos.pagos || []).map(p => ({
      id: `pago-${p.id}`, tipo: 'ingreso', origen: 'pago',
      concepto: `Pago - ${p.ventas?.pacientes?.apellido_paciente || ''} ${p.ventas?.pacientes?.nombres_paciente || ''} (${p.formas_pago?.forma_pago || ''})`,
      monto_pesos: p.monto_pesos, monto_usd: p.monto_usd, created_at: p.fecha_pago,
    }))
    const manuales = dManuales.manuales || []
    setMovimientosCaja([...pagosComoMovimientos, ...manuales].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
  }

  async function cargarVisitas() {
    const params = new URLSearchParams({ desde, hasta, es_reparacion: 'false' })
    if (motivoId) params.set('motivo_id', motivoId)
    if (operadorId) params.set('creado_por', operadorId)
    if (pacienteSeleccionado) params.set('paciente_id', pacienteSeleccionado.id)
    const res = await fetchConToken(`/api/visitas?${params}`)
    const data = await res.json()
    setVisitas(data.visitas || [])
  }

  async function cargarTurnos() {
    const params = new URLSearchParams({ desde, hasta })
    if (agendaId) params.set('profesional_id', agendaId)
    if (pacienteSeleccionado) params.set('paciente_id', pacienteSeleccionado.id)
    if (motivoId) params.set('motivo_id', motivoId)
    const res = await fetchConToken(`/api/turnos?${params}`)
    const data = await res.json()
    setTurnos(data.turnos || [])
  }

  async function cargarReparaciones() {
    const params = new URLSearchParams({ desde, hasta })
    if (estadoReparacion) params.set('estado', estadoReparacion)
    if (pacienteSeleccionado) params.set('paciente_id', pacienteSeleccionado.id)
    const res = await fetchConToken(`/api/reparaciones?${params}`)
    const data = await res.json()
    setReparaciones(data.reparaciones || [])
  }

  async function cargarMoldes() {
  const params = new URLSearchParams({ desde, hasta })
  if (estadoMolde) params.set('estado', estadoMolde)
  if (pacienteSeleccionado) params.set('paciente_id', pacienteSeleccionado.id)
  const res = await fetchConToken(`/api/moldes?${params}`)
  const data = await res.json()
  setMoldes(data.moldes || [])
}
  const hayFiltroProducto = filtroProductoId || filtroModeloId || filtroTipoId

const totalVentasPesos = ventas.reduce((acc, v) => {
  if (hayFiltroProducto) {
    return acc + (v.venta_detalle || []).reduce((a, d) => a + ((Number(d.precio_venta_pesos) || 0) * (Number(d.cantidad) || 1)), 0)
  }
  return acc + (Number(v.total_pesos) || 0)
}, 0)

const totalVentasUSD = ventas.reduce((acc, v) => {
  if (hayFiltroProducto) {
    return acc + (v.venta_detalle || []).reduce((a, d) => a + ((Number(d.precio_venta_usd) || 0) * (Number(d.cantidad) || 1)), 0)
  }
  return acc + (Number(v.total_dolares) || 0)
}, 0)
  
  const totalPagadoPesos = pagos.reduce((acc, p) => acc + (Number(p.monto_pesos) || 0), 0)
  const totalPagadoUSD = pagos.reduce((acc, p) => acc + (Number(p.monto_usd) || 0), 0)
  const ingresosPesos = movimientosCaja.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + (Number(m.monto_pesos) || 0), 0)
  const egresosPesos = movimientosCaja.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + (Number(m.monto_pesos) || 0), 0)
  const ingresosUSD = movimientosCaja.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + (Number(m.monto_usd) || 0), 0)
  const egresosUSD = movimientosCaja.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + (Number(m.monto_usd) || 0), 0)
  const visitasPorMotivo = visitas.reduce((acc, v) => { const m = v.visita_motivos?.motivo || 'Sin motivo'; acc[m] = (acc[m] || 0) + 1; return acc }, {})
  const turnosPorEstado = turnos.reduce((acc, t) => { acc[t.estado] = (acc[t.estado] || 0) + 1; return acc }, {})
  const reparacionesPorEstado = reparaciones.reduce((acc, r) => { const e = r.respuesta_paciente || 'ingresada'; acc[e] = (acc[e] || 0) + 1; return acc }, {})
  const totalReparacionesPesos = reparaciones.reduce((acc, r) => acc + (Number(r.costo_pesos) || 0), 0)
  const totalReparacionesUSD = reparaciones.reduce((acc, r) => acc + (Number(r.costo_usd) || 0), 0)

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
  const fmtUSD = (n) => `U$S ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtFecha = (f) => new Date(f).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
  const fmtHora = (f) => new Date(f).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
  const tabLabels = { ventas: 'Ventas', pagos: 'Pagos', caja: 'Caja', visitas: 'Visitas', turnos: 'Turnos', reparaciones: 'Reparaciones' }
  const coloresEstado = {
    pendiente: { bg: '#fef3c7', color: '#92400e' },
    realizado: { bg: '#dcfce7', color: '#15803d' },
    no_asistio: { bg: '#fef2f2', color: '#dc2626' },
    cancelado: { bg: '#f3f4f6', color: '#6b7280' },
  }
  const coloresEstadoRep = {
    ingresada: { bg: '#f3f4f6', color: '#4b5563' },
    en_evaluacion: { bg: '#f5f3ff', color: '#6d28d9' },
    esperando_respuesta: { bg: '#fffbeb', color: '#92400e' },
    aprobada: { bg: '#ecfeff', color: '#0e7490' },
    en_reparacion: { bg: '#eff6ff', color: '#1d4ed8' },
    lista_entregar: { bg: '#f0fdf4', color: '#15803d' },
    entregada: { bg: '#f9fafb', color: '#374151' },
    no_aprobada: { bg: '#fef2f2', color: '#dc2626' },
    no_aprobada_devuelta: { bg: '#f3f4f6', color: '#9ca3af' },
  }

  function exportarExcel(nombreArchivo, filas) {
    const ws = XLSX.utils.aoa_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Datos')
    XLSX.writeFile(wb, `${nombreArchivo}_${desde}_${hasta}.xlsx`)
  }

  function exportarVentas() {
    exportarExcel('ventas', [
      ['#', 'Fecha', 'Paciente', 'DNI', 'Productos', 'Total $', 'Total U$S', 'Estado'],
      ...ventas.map(v => [v.id, fmtFecha(v.fecha), `${v.pacientes?.apellido_paciente || ''} ${v.pacientes?.nombres_paciente || ''}`, v.pacientes?.dni || '', v.venta_detalle?.map(d => d.numeros_serie?.productos?.producto || d.productos?.producto || '-').join(', ') || '', v.total_pesos || 0, v.total_dolares || 0, v.confirmada ? 'Confirmada' : 'Pendiente']),
      ['', '', '', '', 'TOTAL', totalVentasPesos, totalVentasUSD, ''],
    ])
  }

  function exportarPagos() {
    exportarExcel('pagos', [
      ['Fecha', 'Paciente', 'DNI', 'Venta #', 'Forma de pago', 'Monto $', 'Monto U$S'],
      ...pagos.map(p => [fmtFecha(p.fecha_pago), `${p.ventas?.pacientes?.apellido_paciente || ''} ${p.ventas?.pacientes?.nombres_paciente || ''}`, p.ventas?.pacientes?.dni || '', p.ventas?.id || '', p.formas_pago?.forma_pago || '', p.monto_pesos || 0, p.monto_usd || 0]),
      ['', '', '', '', 'TOTAL', totalPagadoPesos, totalPagadoUSD],
    ])
  }

  function exportarCaja() {
    exportarExcel('caja', [
      ['Fecha', 'Concepto', 'Origen', 'Tipo', 'Monto $', 'Monto U$S'],
      ...movimientosCaja.map(m => [fmtFecha(m.created_at), m.concepto, m.origen === 'pago' ? 'Pago' : 'Manual', m.tipo, m.tipo === 'egreso' ? -(m.monto_pesos || 0) : (m.monto_pesos || 0), m.tipo === 'egreso' ? -(m.monto_usd || 0) : (m.monto_usd || 0)]),
      ['', '', '', 'SALDO', ingresosPesos - egresosPesos, ingresosUSD - egresosUSD],
    ])
  }

  function exportarVisitas() {
    exportarExcel('visitas', [
      ['Fecha', 'Hora', 'Paciente', 'DNI', 'Motivo', 'Venta', 'Observaciones'],
      ...visitas.map(v => [fmtFecha(v.fecha), fmtHora(v.fecha), `${v.pacientes?.apellido_paciente || ''} ${v.pacientes?.nombres_paciente || ''}`, v.pacientes?.dni || '', v.visita_motivos?.motivo || '', v.ventas?.id ? `#${v.ventas.id}` : '', v.observaciones || '']),
    ])
  }

  function exportarTurnos() {
    exportarExcel('turnos', [
      ['Fecha', 'Hora', 'Paciente', 'DNI', 'Teléfono', 'Agenda', 'Motivo', 'Obra Social', 'Estado', 'Observaciones'],
      ...turnos.map(t => [new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-AR'), t.hora.slice(0, 5), t.pacientes ? `${t.pacientes.apellido_paciente} ${t.pacientes.nombres_paciente}` : t.nombre_libre || '', t.pacientes?.dni || '', t.pacientes?.telefono || '', t.profesionales?.nombre || '', t.visita_motivos?.motivo || '', t.obras_sociales?.obra_social || '', t.estado.replace('_', ' '), t.observaciones || '']),
    ])
  }

  function exportarReparaciones() {
    exportarExcel('reparaciones', [
      ['#', 'Fecha ingreso', 'Paciente', 'DNI', 'Teléfono', 'Marca', 'Estado', 'Costo $', 'Costo U$S', 'Fecha entrega', 'Observaciones'],
      ...reparaciones.map(r => [r.numero_orden, fmtFecha(r.fecha), `${r.pacientes?.apellido_paciente || ''} ${r.pacientes?.nombres_paciente || ''}`, r.pacientes?.dni || '', r.pacientes?.telefono || '', r.marca || '', ESTADOS_REPARACION.find(e => e.key === r.respuesta_paciente)?.label || r.respuesta_paciente || 'Ingresada', r.costo_pesos || 0, r.costo_usd || 0, r.fecha_entrega ? new Date(r.fecha_entrega + 'T12:00:00').toLocaleDateString('es-AR') : '', r.observaciones || '']),
      ['', '', '', '', '', '', 'TOTAL', totalReparacionesPesos, totalReparacionesUSD, '', ''],
    ])
  }

if (verificando || !permitido) return null
  
  return (
    <div style={{ maxWidth: '960px' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          aside { display: none !important; }
          main { margin-left: 0 !important; padding: 20px !important; }
          body { background: white; font-size: 11px; }
          tr { page-break-inside: avoid; }
          table { font-size: 9px; width: 100%; }
          td, th { padding: 5px 6px !important; }
          @page { margin: 1.5cm; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="print-only" style={{ marginBottom: '20px', paddingBottom: '14px', borderBottom: '2px solid #8B1E2D' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.jpeg" style={{ width: '48px', height: '48px', borderRadius: '50%' }} alt="logo" />
            <div>
              <div style={{ fontWeight: '700', fontSize: '18px', color: '#8B1E2D' }}>AudioProtesis</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Quilmes, Buenos Aires</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>Reporte de {tabLabels[tab]} — {fmtFecha(desde)} al {fmtFecha(hasta)}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Impreso: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '28px' }} className="no-print">
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Reportes</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Ventas, pagos, caja, visitas, turnos y reparaciones por período</p>
      </div>

      <div style={card} className="no-print">
  <div style={cardTitle}>🔍 Filtros</div>

  {/* Fila 1: fechas y paciente */}
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '14px', marginBottom: '14px' }}>
    <Field label="Desde"><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={inputStyle} /></Field>
    <Field label="Hasta"><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={inputStyle} /></Field>
    <Field label="Paciente">
      {pacienteSeleccionado ? (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ ...inputStyle, padding: '10px 14px', background: '#fdf2f4', color: '#8B1E2D', fontWeight: '600', fontSize: '13px' }}>
            {pacienteSeleccionado.apellido_paciente} {pacienteSeleccionado.nombres_paciente}
          </div>
          <button onClick={() => { setPacienteSeleccionado(null); setBusquedaPaciente(''); setResultadosPaciente([]) }} style={{ padding: '10px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '6px' }}>
          <input placeholder="DNI o apellido..." value={busquedaPaciente} onChange={(e) => setBusquedaPaciente(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscarPacientes()} style={{ ...inputStyle, flex: 1 }} />
          <button onClick={buscarPacientes} style={{ padding: '10px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>Buscar</button>
        </div>
      )}
      {resultadosPaciente.length > 0 && !pacienteSeleccionado && (
        <select value="" onChange={(e) => { const p = resultadosPaciente.find(x => x.id == e.target.value); if (!p) return; setPacienteSeleccionado(p); setResultadosPaciente([]); setBusquedaPaciente('') }} style={{ ...inputStyle, marginTop: '6px' }}>
          <option value="">Seleccionar ({resultadosPaciente.length} encontrados)</option>
          {resultadosPaciente.map(p => <option key={p.id} value={p.id}>{p.apellido_paciente} {p.nombres_paciente} — DNI: {p.dni}</option>)}
        </select>
      )}
    </Field>
  </div>

  {/* Grupo Ventas */}
  <div style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb', marginBottom: '12px' }}>
    <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>💰 Ventas y Pagos </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
      <Field label="Obra social">
        <select value={obraSocialId} onChange={(e) => setObraSocialId(e.target.value)} style={inputStyle}>
          <option value="">Todas</option>
          {obrasSociales.map(o => <option key={o.id} value={o.id}>{o.obra_social}</option>)}
        </select>
      </Field>
      <Field label="Forma de pago">
        <select value={formaPagoId} onChange={(e) => setFormaPagoId(e.target.value)} style={inputStyle}>
          <option value="">Todas</option>
          {formasPago.map(f => <option key={f.id} value={f.id}>{f.forma_pago}</option>)}
        </select>
      </Field>
      <Field label="Tipo producto">
        <select value={filtroTipoId} onChange={(e) => {
          const val = e.target.value
          setFiltroTipoId(val)
          setFiltroProductoId('')
          setFiltroModeloId('')
          setProductosFiltradosReporte(productosReporte.filter(p => p.tipo_id === Number(val)))
          setModelosFiltradosReporte([])
        }} style={inputStyle}>
          <option value="">Todos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.tipo}</option>)}
        </select>
      </Field>
      <Field label="Producto">
        <select value={filtroProductoId} onChange={(e) => {
          const val = e.target.value
          setFiltroProductoId(val)
          setFiltroModeloId('')
          setModelosFiltradosReporte(productosReporte.find(p => p.id === Number(val))?.requiere_modelo ? modelosReporte.filter(m => m.producto_id === Number(val) && m.activo) : [])
        }} style={inputStyle} disabled={!filtroTipoId}>
          <option value="">Todos</option>
          {(filtroTipoId ? productosFiltradosReporte : productosReporte).map(p => <option key={p.id} value={p.id}>{p.producto}</option>)}
        </select>
      </Field>
      <Field label="Modelo">
        <select value={filtroModeloId} onChange={(e) => setFiltroModeloId(e.target.value)} style={inputStyle} disabled={!filtroProductoId || modelosFiltradosReporte.length === 0}>
          <option value="">Todos</option>
          {modelosFiltradosReporte.map(m => <option key={m.id} value={m.id}>{m.modelo}</option>)}
        </select>
      </Field>
    </div>
  </div>

  {/* Grupo Visitas y Turnos */}
  <div style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb', marginBottom: '12px' }}>
    <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>📅 Visitas y Turnos</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      <Field label="Motivo">
        <select value={motivoId} onChange={(e) => setMotivoId(e.target.value)} style={inputStyle}>
          <option value="">Todos los motivos</option>
          {motivos.map(m => <option key={m.id} value={m.id}>{m.motivo}</option>)}
        </select>
      </Field>
      <Field label="Agenda">
        <select value={agendaId} onChange={(e) => setAgendaId(e.target.value)} style={inputStyle}>
          <option value="">Todas las agendas</option>
          {agendas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </Field>
    </div>
  </div>

  {/* Grupo Estados */}
  <div style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb', marginBottom: '14px' }}>
    <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>📋 Estados</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      <Field label="Estado reparación">
        <select value={estadoReparacion} onChange={(e) => setEstadoReparacion(e.target.value)} style={inputStyle}>
          <option value="">Todos</option>
          {ESTADOS_REPARACION.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
        </select>
      </Field>
      <Field label="Estado moldes y tapones">
        <select value={estadoMolde} onChange={(e) => setEstadoMolde(e.target.value)} style={inputStyle}>
          <option value="">Todos</option>
          {ESTADOS_MOLDES.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
        </select>
      </Field>
    </div>
  </div>

  <button onClick={buscar} disabled={cargando} style={{ ...btnPrimario, opacity: cargando ? 0.7 : 1 }}>
    {cargando ? 'Buscando...' : '🔍 Buscar'}
  </button>
</div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }} className="no-print">
        {[
          ['ventas', `📊 Ventas${ventas.length > 0 ? ` (${ventas.length})` : ''}`],
          ['pagos', `💳 Pagos${pagos.length > 0 ? ` (${pagos.length})` : ''}`],
          ['caja', '💰 Caja'],
          ['visitas', `🏥 Visitas${visitas.length > 0 ? ` (${visitas.length})` : ''}`],
          ['turnos', `📅 Turnos${turnos.length > 0 ? ` (${turnos.length})` : ''}`],
          ['reparaciones', `🔧 Reparaciones${reparaciones.length > 0 ? ` (${reparaciones.length})` : ''}`],
          ['moldes', `🧩 Moldes${moldes.length > 0 ? ` (${moldes.length})` : ''}`],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: tab === val ? '#8B1E2D' : 'white', color: tab === val ? 'white' : '#374151', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>{label}</button>
        ))}
      </div>

      {tab === 'ventas' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>{ventas.length} ventas · {fmt(totalVentasPesos)} · {fmtUSD(totalVentasUSD)}</div>
            <div style={{ display: 'flex', gap: '8px' }} className="no-print">
              <button onClick={exportarVentas} style={btnExcel}>📥 Excel</button>
              <button onClick={() => window.print()} style={btnImprimir}>🖨️ Imprimir</button>
            </div>
          </div>
          <div style={card}>
            {ventas.length === 0 ? <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay ventas para el período seleccionado</div> : (
              <table style={tableStyle}>
                <thead><tr><th style={thStyle}>#</th><th style={thStyle}>Fecha</th><th style={thStyle}>Paciente</th><th style={thStyle}>DNI</th><th style={thStyle}>Productos</th><th style={{ ...thStyle, textAlign: 'right' }}>Total $</th><th style={{ ...thStyle, textAlign: 'right' }}>Total U$S</th><th style={thStyle}>Estado</th></tr></thead>
                <tbody>
                  {ventas.map((v, i) => (
                    <tr key={v.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={tdStyle}>{v.id}</td><td style={tdStyle}>{fmtFecha(v.fecha)}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{v.pacientes?.apellido_paciente} {v.pacientes?.nombres_paciente}</td>
                      <td style={tdStyle}>{v.pacientes?.dni}</td>
                      <td style={tdStyle}>{v.venta_detalle?.map(d => <div key={d.id} style={{ fontSize: '12px', color: '#6b7280' }}>{d.numeros_serie?.productos?.producto || d.productos?.producto || '-'}{d.numeros_serie?.numero_serie ? ` (${d.numeros_serie.numero_serie})` : ''}</div>)}</td>
        <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>
  {hayFiltroProducto
    ? (() => { const t = (v.venta_detalle || []).reduce((a, d) => a + ((Number(d.precio_venta_pesos) || 0) * (Number(d.cantidad) || 1)), 0); return t > 0 ? fmt(t) : '-' })()
    : v.total_pesos > 0 ? fmt(v.total_pesos) : '-'
  }
</td>
<td style={{ ...tdStyle, textAlign: 'right', color: '#2563eb', fontWeight: '600' }}>
  {hayFiltroProducto
    ? (() => { const t = (v.venta_detalle || []).reduce((a, d) => a + ((Number(d.precio_venta_usd) || 0) * (Number(d.cantidad) || 1)), 0); return t > 0 ? fmtUSD(t) : '-' })()
    : v.total_dolares > 0 ? fmtUSD(v.total_dolares) : '-'
  }
</td>              
        <td style={tdStyle}><span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: v.confirmada ? '#dcfce7' : '#fef9c3', color: v.confirmada ? '#16a34a' : '#ca8a04' }}>{v.confirmada ? 'Confirmada' : 'Pendiente'}</span></td>
                    </tr>
                  ))}
                  <tr style={{ background: '#1a1a1a' }}>
                    <td colSpan={5} style={{ ...tdStyle, color: 'white', fontWeight: '700' }}>TOTAL ({ventas.length} ventas)</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#86efac', fontWeight: '700' }}>{fmt(totalVentasPesos)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#93c5fd', fontWeight: '700' }}>{fmtUSD(totalVentasUSD)}</td>
                    <td style={tdStyle}></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'pagos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>{pagos.length} pagos · {fmt(totalPagadoPesos)} · {fmtUSD(totalPagadoUSD)}</div>
            <div style={{ display: 'flex', gap: '8px' }} className="no-print">
              <button onClick={exportarPagos} style={btnExcel}>📥 Excel</button>
              <button onClick={() => window.print()} style={btnImprimir}>🖨️ Imprimir</button>
            </div>
          </div>
          <div style={card}>
            {pagos.length === 0 ? <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay pagos para el período seleccionado</div> : (
              <table style={tableStyle}>
                <thead><tr><th style={thStyle}>Fecha</th><th style={thStyle}>Paciente</th><th style={thStyle}>DNI</th><th style={thStyle}>Venta #</th><th style={thStyle}>Forma de pago</th><th style={{ ...thStyle, textAlign: 'right' }}>Monto $</th><th style={{ ...thStyle, textAlign: 'right' }}>Monto U$S</th></tr></thead>
                <tbody>
                  {pagos.map((p, i) => (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={tdStyle}>{fmtFecha(p.fecha_pago)}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{p.ventas?.pacientes?.apellido_paciente} {p.ventas?.pacientes?.nombres_paciente}</td>
                      <td style={tdStyle}>{p.ventas?.pacientes?.dni}</td>
                      <td style={tdStyle}>#{p.ventas?.id}</td>
                      <td style={tdStyle}>{p.formas_pago?.forma_pago}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>{p.monto_pesos ? fmt(p.monto_pesos) : '-'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#2563eb', fontWeight: '600' }}>{p.monto_usd ? fmtUSD(p.monto_usd) : '-'}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#1a1a1a' }}>
                    <td colSpan={5} style={{ ...tdStyle, color: 'white', fontWeight: '700' }}>TOTAL ({pagos.length} pagos)</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#86efac', fontWeight: '700' }}>{fmt(totalPagadoPesos)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#93c5fd', fontWeight: '700' }}>{fmtUSD(totalPagadoUSD)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'caja' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>{movimientosCaja.length} movimientos</div>
            <div style={{ display: 'flex', gap: '8px' }} className="no-print">
              <button onClick={exportarCaja} style={btnExcel}>📥 Excel</button>
              <button onClick={() => window.print()} style={btnImprimir}>🖨️ Imprimir</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {[{ label: 'Caja Pesos', ingresos: ingresosPesos, egresos: egresosPesos, fmt: fmt }, { label: 'Caja USD', ingresos: ingresosUSD, egresos: egresosUSD, fmt: fmtUSD }].map(({ label, ingresos, egresos, fmt: f }) => (
              <div key={label} style={card}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}><span style={{ color: '#6b7280' }}>Ingresos</span><span style={{ color: '#16a34a', fontWeight: '600' }}>{f(ingresos)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}><span style={{ color: '#6b7280' }}>Egresos</span><span style={{ color: '#dc2626', fontWeight: '600' }}>{f(egresos)}</span></div>
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '700' }}>Saldo</span>
                  <span style={{ fontWeight: '700', fontSize: '18px', color: (ingresos - egresos) >= 0 ? '#16a34a' : '#dc2626' }}>{f(ingresos - egresos)}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={card}>
            {movimientosCaja.length === 0 ? <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay movimientos para el período seleccionado</div> : (
              <table style={tableStyle}>
                <thead><tr><th style={thStyle}>Fecha</th><th style={thStyle}>Concepto</th><th style={thStyle}>Origen</th><th style={thStyle}>Tipo</th><th style={{ ...thStyle, textAlign: 'right' }}>Monto $</th><th style={{ ...thStyle, textAlign: 'right' }}>Monto U$S</th></tr></thead>
                <tbody>
                  {movimientosCaja.map((m, i) => (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={tdStyle}>{fmtFecha(m.created_at)}</td><td style={tdStyle}>{m.concepto}</td>
                      <td style={tdStyle}>{m.origen === 'pago' ? 'Pago' : 'Manual'}</td>
                      <td style={tdStyle}><span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: m.tipo === 'ingreso' ? '#dcfce7' : '#fef2f2', color: m.tipo === 'ingreso' ? '#16a34a' : '#dc2626' }}>{m.tipo}</span></td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: m.tipo === 'ingreso' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>{m.monto_pesos ? `${m.tipo === 'egreso' ? '-' : ''}${fmt(m.monto_pesos)}` : '-'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: m.tipo === 'ingreso' ? '#2563eb' : '#dc2626', fontWeight: '600' }}>{m.monto_usd ? `${m.tipo === 'egreso' ? '-' : ''}${fmtUSD(m.monto_usd)}` : '-'}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#1a1a1a' }}>
                    <td colSpan={4} style={{ ...tdStyle, color: 'white', fontWeight: '700' }}>SALDO</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: (ingresosPesos - egresosPesos) >= 0 ? '#86efac' : '#fca5a5', fontWeight: '700' }}>{fmt(ingresosPesos - egresosPesos)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: (ingresosUSD - egresosUSD) >= 0 ? '#93c5fd' : '#fca5a5', fontWeight: '700' }}>{fmtUSD(ingresosUSD - egresosUSD)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'visitas' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span><strong>{visitas.length}</strong> visitas</span>
              {Object.entries(visitasPorMotivo).map(([motivo, cant]) => <span key={motivo}>{motivo}: <strong>{cant}</strong></span>)}
            </div>
            <div style={{ display: 'flex', gap: '8px' }} className="no-print">
              <button onClick={exportarVisitas} style={btnExcel}>📥 Excel</button>
              <button onClick={() => window.print()} style={btnImprimir}>🖨️ Imprimir</button>
            </div>
          </div>
          <div style={card}>
            {visitas.length === 0 ? <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay visitas para el período seleccionado</div> : (
              <table style={tableStyle}>
                <thead><tr><th style={thStyle}>Fecha</th><th style={thStyle}>Hora</th><th style={thStyle}>Paciente</th><th style={thStyle}>DNI</th><th style={thStyle}>Motivo</th><th style={thStyle}>Venta</th><th style={thStyle}>Observaciones</th></tr></thead>
                <tbody>
                  {visitas.map((v, i) => (
                    <tr key={v.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={tdStyle}>{fmtFecha(v.fecha)}</td><td style={tdStyle}>{fmtHora(v.fecha)}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{v.pacientes?.apellido_paciente} {v.pacientes?.nombres_paciente}</td>
                      <td style={tdStyle}>{v.pacientes?.dni}</td>
                      <td style={tdStyle}><span style={{ color: '#8B1E2D', fontWeight: '600' }}>{v.visita_motivos?.motivo || '-'}</span></td>
                      <td style={tdStyle}>{v.ventas?.id ? `#${v.ventas.id}` : '-'}</td>
                      <td style={{ ...tdStyle, fontSize: '12px', color: '#6b7280' }}>{v.observaciones || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'turnos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span><strong>{turnos.length}</strong> turnos</span>
              {Object.entries(turnosPorEstado).map(([estado, cant]) => (
                <span key={estado} style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '12px', background: coloresEstado[estado]?.bg, color: coloresEstado[estado]?.color }}>
                  {estado.replace('_', ' ')}: <strong>{cant}</strong>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }} className="no-print">
              <button onClick={exportarTurnos} style={btnExcel}>📥 Excel</button>
              <button onClick={() => window.print()} style={btnImprimir}>🖨️ Imprimir</button>
            </div>
          </div>
          <div style={card}>
            {turnos.length === 0 ? <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay turnos para el período seleccionado</div> : (
              <table style={tableStyle}>
                <thead><tr><th style={thStyle}>Fecha</th><th style={thStyle}>Hora</th><th style={thStyle}>Paciente</th><th style={thStyle}>DNI</th><th style={thStyle}>Teléfono</th><th style={thStyle}>Agenda</th><th style={thStyle}>Motivo</th><th style={thStyle}>Obra Social</th><th style={thStyle}>Estado</th><th style={thStyle}>Observaciones</th></tr></thead>
                <tbody>
                  {turnos.map((t, i) => (
                    <tr key={t.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={tdStyle}>{new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-AR')}</td>
                      <td style={tdStyle}>{t.hora.slice(0, 5)}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{t.pacientes ? `${t.pacientes.apellido_paciente} ${t.pacientes.nombres_paciente}` : t.nombre_libre || '-'}</td>
                      <td style={tdStyle}>{t.pacientes?.dni || '-'}</td>
                      <td style={tdStyle}>{t.pacientes?.telefono || '-'}</td>
                      <td style={tdStyle}>{t.profesionales?.nombre || '-'}</td>
                      <td style={tdStyle}>{t.visita_motivos?.motivo || '-'}</td>
                      <td style={tdStyle}>{t.obras_sociales?.obra_social || '-'}</td>
                      <td style={tdStyle}><span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: coloresEstado[t.estado]?.bg, color: coloresEstado[t.estado]?.color }}>{t.estado.replace('_', ' ')}</span></td>
                      <td style={{ ...tdStyle, fontSize: '12px', color: '#6b7280' }}>{t.observaciones || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'reparaciones' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span><strong>{reparaciones.length}</strong> reparaciones</span>
              {Object.entries(reparacionesPorEstado).map(([estado, cant]) => {
                const c = coloresEstadoRep[estado] || { bg: '#f3f4f6', color: '#6b7280' }
                const label = ESTADOS_REPARACION.find(e => e.key === estado)?.label || estado
                return <span key={estado} style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: c.bg, color: c.color }}>{label}: <strong>{cant}</strong></span>
              })}
              {(totalReparacionesPesos > 0 || totalReparacionesUSD > 0) && (
                <span>{totalReparacionesPesos > 0 && `· ${fmt(totalReparacionesPesos)}`}{totalReparacionesUSD > 0 && ` · ${fmtUSD(totalReparacionesUSD)}`}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }} className="no-print">
              <button onClick={exportarReparaciones} style={btnExcel}>📥 Excel</button>
              <button onClick={() => window.print()} style={btnImprimir}>🖨️ Imprimir</button>
            </div>
          </div>
          <div style={card}>
            {reparaciones.length === 0 ? <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay reparaciones para el período seleccionado</div> : (
              <table style={tableStyle}>
                <thead><tr><th style={thStyle}>#</th><th style={thStyle}>Fecha ingreso</th><th style={thStyle}>Paciente</th><th style={thStyle}>DNI</th><th style={thStyle}>Teléfono</th><th style={thStyle}>Marca</th><th style={thStyle}>Estado</th><th style={{ ...thStyle, textAlign: 'right' }}>Costo $</th><th style={{ ...thStyle, textAlign: 'right' }}>Costo U$S</th><th style={thStyle}>Fecha entrega</th></tr></thead>
                <tbody>
                  {reparaciones.map((r, i) => {
                    const estado = r.respuesta_paciente || 'ingresada'
                    const c = coloresEstadoRep[estado] || { bg: '#f3f4f6', color: '#6b7280' }
                    const labelEstado = ESTADOS_REPARACION.find(e => e.key === estado)?.label || estado
                    return (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ ...tdStyle, fontWeight: '700', color: '#8B1E2D' }}>#{r.numero_orden}</td>
                        <td style={tdStyle}>{fmtFecha(r.fecha)}</td>
                        <td style={{ ...tdStyle, fontWeight: '600' }}>{r.pacientes?.apellido_paciente} {r.pacientes?.nombres_paciente}</td>
                        <td style={tdStyle}>{r.pacientes?.dni || '-'}</td>
                        <td style={tdStyle}>{r.pacientes?.telefono || '-'}</td>
                        <td style={tdStyle}>{r.marca || '-'}</td>
                        <td style={tdStyle}><span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: c.bg, color: c.color }}>{labelEstado}</span></td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>{r.costo_pesos ? fmt(r.costo_pesos) : '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#2563eb', fontWeight: '600' }}>{r.costo_usd ? fmtUSD(r.costo_usd) : '-'}</td>
                        <td style={tdStyle}>{r.fecha_entrega ? new Date(r.fecha_entrega + 'T12:00:00').toLocaleDateString('es-AR') : '-'}</td>
                      </tr>
                    )
                  })}
                  <tr style={{ background: '#1a1a1a' }}>
                    <td colSpan={7} style={{ ...tdStyle, color: 'white', fontWeight: '700' }}>TOTAL ({reparaciones.length} reparaciones)</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#86efac', fontWeight: '700' }}>{totalReparacionesPesos > 0 ? fmt(totalReparacionesPesos) : '-'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#93c5fd', fontWeight: '700' }}>{totalReparacionesUSD > 0 ? fmtUSD(totalReparacionesUSD) : '-'}</td>
                    <td style={tdStyle}></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </>
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
const cardTitle = { fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '16px' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnImprimir = { padding: '8px 16px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnExcel = { padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' }
const thStyle = { padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', whiteSpace: 'nowrap' }
const tdStyle = { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#1a1a1a', verticalAlign: 'top', whiteSpace: 'nowrap' }
