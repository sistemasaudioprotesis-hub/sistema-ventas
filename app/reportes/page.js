'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Reportes() {
  const hoy = new Date().toISOString().split('T')[0]
  const [desde, setDesde] = useState(hoy)
  const [hasta, setHasta] = useState(hoy)
  const [operadorId, setOperadorId] = useState('')
  const [usuarios, setUsuarios] = useState([])
  const [obrasSociales, setObrasSociales] = useState([])
  const [obraSocialId, setObraSocialId] = useState('')
  const [motivoId, setMotivoId] = useState('')
  const [busquedaPaciente, setBusquedaPaciente] = useState('')
  const [motivos, setMotivos] = useState([])
  const [tab, setTab] = useState('ventas')
  const [cargando, setCargando] = useState(false)

  const [ventas, setVentas] = useState([])
  const [pagos, setPagos] = useState([])
  const [movimientosCaja, setMovimientosCaja] = useState([])
  const [visitas, setVisitas] = useState([])

  useEffect(() => {
    cargarUsuarios()
  }, [])

  async function cargarUsuarios() {
    const { data } = await supabase.from('usuarios').select('id, nombre').eq('activo', true).order('nombre')
    setUsuarios(data || [])
    const { data: os } = await supabase.from('obras_sociales').select('*').order('obra_social')
    setObrasSociales(os || [])
    const { data: mv } = await supabase.from('visita_motivos').select('*').eq('activo', true).order('motivo')
    setMotivos(mv || [])
  }

  async function buscar() {
    setCargando(true)
    await Promise.all([cargarVentas(), cargarPagos(), cargarCaja(), cargarVisitas()])
    setCargando(false)
  }

  async function cargarVentas() {
    let query = supabase
      .from('ventas')
      .select(`
        id, fecha, confirmada, total_pesos, total_dolares,
        pacientes (apellido_paciente, nombres_paciente, dni),
        venta_detalle (
          id, precio_venta_pesos, precio_venta_usd,
          numeros_serie (numero_serie, productos (producto)),
          productos (producto)
        )
      `)
      .gte('fecha', `${desde}T00:00:00`)
      .lte('fecha', `${hasta}T23:59:59`)
      .order('fecha', { ascending: false })

    if (operadorId) query = query.eq('creado_por', operadorId)
    if (obraSocialId) query = query.eq('obra_social_id', obraSocialId)

    const { data } = await query
    setVentas(data || [])
  }

  async function cargarPagos() {
    let query = supabase
      .from('pagos')
      .select(`
        id, monto_pesos, monto_usd, fecha_pago,
        formas_pago (forma_pago),
        ventas (
          id, total_pesos, total_dolares,
          pacientes (apellido_paciente, nombres_paciente, dni)
        )
      `)
      .gte('fecha_pago', `${desde}T00:00:00`)
      .lte('fecha_pago', `${hasta}T23:59:59`)
      .order('fecha_pago', { ascending: false })

    if (operadorId) query = query.eq('creado_por', operadorId)

    const { data } = await query
    setPagos(data || [])
  }

  async function cargarCaja() {
    const { data: pagosData } = await supabase
      .from('pagos')
      .select(`
        id, monto_pesos, monto_usd, fecha_pago,
        formas_pago (forma_pago),
        ventas (pacientes (apellido_paciente, nombres_paciente))
      `)
      .gte('fecha_pago', `${desde}T00:00:00`)
      .lte('fecha_pago', `${hasta}T23:59:59`)

    const { data: manuales } = await supabase
      .from('caja_movimientos')
      .select('*')
      .gte('fecha', desde)
      .lte('fecha', hasta)

    const pagosComoMovimientos = (pagosData || []).map(p => ({
      id: `pago-${p.id}`,
      tipo: 'ingreso',
      origen: 'pago',
      concepto: `Pago - ${p.ventas?.pacientes?.apellido_paciente || ''} ${p.ventas?.pacientes?.nombres_paciente || ''} (${p.formas_pago?.forma_pago || ''})`,
      monto_pesos: p.monto_pesos,
      monto_usd: p.monto_usd,
      created_at: p.fecha_pago,
    }))

    const todos = [...pagosComoMovimientos, ...(manuales || [])]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    setMovimientosCaja(todos)
  }

  async function cargarVisitas() {
  let pacienteIds = null

  if (busquedaPaciente.trim()) {
    const termino = busquedaPaciente.trim()
    let queryPac = supabase.from('pacientes').select('id')
    if (/^\d+$/.test(termino)) {
      queryPac = queryPac.eq('dni', termino)
    } else {
      queryPac = queryPac.ilike('apellido_paciente', `%${termino}%`)
    }
    const { data: pacs } = await queryPac
    pacienteIds = (pacs || []).map(p => p.id)
    if (pacienteIds.length === 0) {
      setVisitas([])
      return
    }
  }

  let query = supabase
    .from('visitas')
    .select(`
      id, fecha, observaciones,
      visita_motivos (motivo),
      pacientes (apellido_paciente, nombres_paciente, dni),
      ventas (id)
    `)
    .gte('fecha', `${desde}T00:00:00`)
    .lte('fecha', `${hasta}T23:59:59`)
    .order('fecha', { ascending: false })

  if (motivoId) query = query.eq('motivo_id', motivoId)
  if (operadorId) query = query.eq('creado_por', operadorId)
  if (pacienteIds) query = query.in('paciente_id', pacienteIds)

  const { data } = await query
  setVisitas(data || [])
}

  const totalVentasPesos = ventas.reduce((acc, v) => acc + (Number(v.total_pesos) || 0), 0)
  const totalVentasUSD = ventas.reduce((acc, v) => acc + (Number(v.total_dolares) || 0), 0)
  const totalPagadoPesos = pagos.reduce((acc, p) => acc + (Number(p.monto_pesos) || 0), 0)
  const totalPagadoUSD = pagos.reduce((acc, p) => acc + (Number(p.monto_usd) || 0), 0)
  const saldoPendientePesos = totalVentasPesos - totalPagadoPesos
  const saldoPendienteUSD = totalVentasUSD - totalPagadoUSD
  const ingresosPesos = movimientosCaja.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + (Number(m.monto_pesos) || 0), 0)
  const egresosPesos = movimientosCaja.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + (Number(m.monto_pesos) || 0), 0)
  const ingresosUSD = movimientosCaja.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + (Number(m.monto_usd) || 0), 0)
  const egresosUSD = movimientosCaja.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + (Number(m.monto_usd) || 0), 0)

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
  const fmtUSD = (n) => `U$S ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtFecha = (f) => new Date(f).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
  const fmtHora = (f) => new Date(f).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })

  // Contar visitas por motivo para el resumen
  const visitasPorMotivo = visitas.reduce((acc, v) => {
    const motivo = v.visita_motivos?.motivo || 'Sin motivo'
    acc[motivo] = (acc[motivo] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Reportes</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Ventas, pagos, caja y visitas por período</p>
      </div>

      {/* Filtros */}
      <div style={card}>
        <div style={cardTitle}>🔍 Filtros</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
          <Field label="Desde">
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Hasta">
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Operador">
            <select value={operadorId} onChange={(e) => setOperadorId(e.target.value)} style={inputStyle}>
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', alignItems: 'end' }}>
          <Field label="Obra social">
            <select value={obraSocialId} onChange={(e) => setObraSocialId(e.target.value)} style={inputStyle}>
              <option value="">Todas</option>
              {obrasSociales.map(o => <option key={o.id} value={o.id}>{o.obra_social}</option>)}
            </select>
          </Field>
                <Field label="Paciente (DNI o apellido)">
  <input
    placeholder="DNI o apellido..."
    value={busquedaPaciente}
    onChange={(e) => setBusquedaPaciente(e.target.value)}
    style={inputStyle}
  />
</Field>
          <Field label="Motivo de visita">
            <select value={motivoId} onChange={(e) => setMotivoId(e.target.value)} style={inputStyle}>
              <option value="">Todos</option>
              {motivos.map(m => <option key={m.id} value={m.id}>{m.motivo}</option>)}
            </select>
          </Field>
          <button onClick={buscar} disabled={cargando} style={{ ...btnPrimario, height: '42px', opacity: cargando ? 0.7 : 1 }}>
            {cargando ? 'Buscando...' : '🔍 Buscar'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          ['ventas', '📊 Ventas'],
          ['pagos', '💳 Pagos'],
          ['caja', '💰 Caja'],
          ['visitas', `🏥 Visitas${visitas.length > 0 ? ` (${visitas.length})` : ''}`],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} style={{
            padding: '9px 20px', borderRadius: '8px', border: '1px solid #e5e7eb',
            background: tab === val ? '#8B1E2D' : 'white',
            color: tab === val ? 'white' : '#374151',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* REPORTE VENTAS */}
      {tab === 'ventas' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <div style={{ ...statCard, borderLeft: '4px solid #8B1E2D' }}>
              <div style={statLabel}>Ventas</div>
              <div style={statNum}>{ventas.length}</div>
            </div>
            <div style={{ ...statCard, borderLeft: '4px solid #16a34a' }}>
              <div style={statLabel}>Total pesos</div>
              <div style={{ ...statNum, fontSize: '20px' }}>{fmt(totalVentasPesos)}</div>
            </div>
            <div style={{ ...statCard, borderLeft: '4px solid #2563eb' }}>
              <div style={statLabel}>Total USD</div>
              <div style={{ ...statNum, fontSize: '20px' }}>{fmtUSD(totalVentasUSD)}</div>
            </div>
          </div>
          <div style={card}>
            <div style={cardTitle}>Detalle de ventas ({ventas.length})</div>
            {ventas.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay ventas para el período seleccionado</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ventas.map(v => (
                  <div key={v.id} style={{ padding: '14px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a1a' }}>
                          {v.pacientes?.apellido_paciente} {v.pacientes?.nombres_paciente}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                          DNI: {v.pacientes?.dni} · {fmtFecha(v.fecha)} · Venta #{v.id}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {v.total_pesos > 0 && <div style={{ fontWeight: '700', color: '#16a34a' }}>{fmt(v.total_pesos)}</div>}
                        {v.total_dolares > 0 && <div style={{ fontWeight: '700', color: '#2563eb' }}>{fmtUSD(v.total_dolares)}</div>}
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: v.confirmada ? '#dcfce7' : '#fef9c3', color: v.confirmada ? '#16a34a' : '#ca8a04' }}>
                          {v.confirmada ? 'Confirmada' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                    {v.venta_detalle?.length > 0 && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e5e7eb' }}>
                        {v.venta_detalle.map(d => (
                          <div key={d.id} style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>
                            · {d.numeros_serie?.productos?.producto || d.productos?.producto || '-'}
                            {d.numeros_serie?.numero_serie ? ` (${d.numeros_serie.numero_serie})` : ''}
                            {d.precio_venta_pesos ? ` — ${fmt(d.precio_venta_pesos)}` : ''}
                            {d.precio_venta_usd ? ` — ${fmtUSD(d.precio_venta_usd)}` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* REPORTE PAGOS */}
      {tab === 'pagos' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <div style={{ ...statCard, borderLeft: '4px solid #16a34a' }}>
              <div style={statLabel}>Cobrado pesos</div>
              <div style={{ ...statNum, fontSize: '18px', color: '#16a34a' }}>{fmt(totalPagadoPesos)}</div>
            </div>
            <div style={{ ...statCard, borderLeft: '4px solid #2563eb' }}>
              <div style={statLabel}>Cobrado USD</div>
              <div style={{ ...statNum, fontSize: '18px', color: '#2563eb' }}>{fmtUSD(totalPagadoUSD)}</div>
            </div>
            <div style={{ ...statCard, borderLeft: '4px solid #dc2626' }}>
              <div style={statLabel}>Saldo pendiente</div>
              <div style={{ ...statNum, fontSize: '16px', color: '#dc2626' }}>
                {fmt(saldoPendientePesos)}
                {saldoPendienteUSD > 0 && <div style={{ fontSize: '13px' }}>{fmtUSD(saldoPendienteUSD)}</div>}
              </div>
            </div>
          </div>
          <div style={card}>
            <div style={cardTitle}>Detalle de pagos ({pagos.length})</div>
            {pagos.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay pagos para el período seleccionado</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pagos.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>
                        {p.ventas?.pacientes?.apellido_paciente} {p.ventas?.pacientes?.nombres_paciente}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {fmtFecha(p.fecha_pago)} · {p.formas_pago?.forma_pago} · Venta #{p.ventas?.id}
                      </div>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#16a34a' }}>
                      {p.monto_pesos ? fmt(p.monto_pesos) : fmtUSD(p.monto_usd)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* REPORTE CAJA */}
      {tab === 'caja' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <div style={card}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Caja en Pesos</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                <span style={{ color: '#6b7280' }}>Ingresos</span>
                <span style={{ color: '#16a34a', fontWeight: '600' }}>{fmt(ingresosPesos)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '10px' }}>
                <span style={{ color: '#6b7280' }}>Egresos</span>
                <span style={{ color: '#dc2626', fontWeight: '600' }}>{fmt(egresosPesos)}</span>
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '700' }}>Saldo</span>
                <span style={{ fontWeight: '700', fontSize: '18px', color: (ingresosPesos - egresosPesos) >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(ingresosPesos - egresosPesos)}</span>
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Caja en USD</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                <span style={{ color: '#6b7280' }}>Ingresos</span>
                <span style={{ color: '#16a34a', fontWeight: '600' }}>{fmtUSD(ingresosUSD)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '10px' }}>
                <span style={{ color: '#6b7280' }}>Egresos</span>
                <span style={{ color: '#dc2626', fontWeight: '600' }}>{fmtUSD(egresosUSD)}</span>
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '700' }}>Saldo</span>
                <span style={{ fontWeight: '700', fontSize: '18px', color: (ingresosUSD - egresosUSD) >= 0 ? '#16a34a' : '#dc2626' }}>{fmtUSD(ingresosUSD - egresosUSD)}</span>
              </div>
            </div>
          </div>
          <div style={card}>
            <div style={cardTitle}>Movimientos ({movimientosCaja.length})</div>
            {movimientosCaja.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay movimientos para el período seleccionado</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {movimientosCaja.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: m.tipo === 'ingreso' ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', border: `1px solid ${m.tipo === 'ingreso' ? '#bbf7d0' : '#fecaca'}`, flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>{m.concepto}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {fmtFecha(m.created_at)} · {m.origen === 'pago' ? '🔗 Pago' : '✏️ Manual'}
                      </div>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: m.tipo === 'ingreso' ? '#16a34a' : '#dc2626' }}>
                      {m.tipo === 'egreso' ? '-' : ''}{m.monto_pesos ? fmt(m.monto_pesos) : fmtUSD(m.monto_usd)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* REPORTE VISITAS */}
      {tab === 'visitas' && (
        <>
          {/* Resumen por motivo */}
          {visitas.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div style={{ ...statCard, borderLeft: '4px solid #8B1E2D', minWidth: '120px' }}>
                <div style={statLabel}>Total</div>
                <div style={statNum}>{visitas.length}</div>
              </div>
              {Object.entries(visitasPorMotivo).map(([motivo, cant]) => (
                <div key={motivo} style={{ ...statCard, borderLeft: '4px solid #6b7280', minWidth: '120px' }}>
                  <div style={statLabel}>{motivo}</div>
                  <div style={statNum}>{cant}</div>
                </div>
              ))}
            </div>
          )}

          {/* Lista visitas */}
          <div style={card}>
            <div style={cardTitle}>Detalle de visitas ({visitas.length})</div>
            {visitas.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                No hay visitas para el período seleccionado
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {visitas.map(v => (
                  <div key={v.id} style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#8B1E2D' }}>
                          {v.visita_motivos?.motivo || '-'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#1a1a1a', marginTop: '2px', fontWeight: '500' }}>
                          {v.pacientes?.apellido_paciente} {v.pacientes?.nombres_paciente}
                          {v.pacientes?.dni ? ` · DNI: ${v.pacientes.dni}` : ''}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                          {fmtFecha(v.fecha)} {fmtHora(v.fecha)}
                          {v.ventas?.id ? ` · 🔗 Venta #${v.ventas.id}` : ''}
                        </div>
                        {v.observaciones && (
                          <div style={{ fontSize: '13px', color: '#374151', marginTop: '6px', padding: '6px 10px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                            {v.observaciones}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
const statCard = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const statLabel = { fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }
const statNum = { fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
