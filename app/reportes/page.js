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
  const [motivos, setMotivos] = useState([])
  const [tab, setTab] = useState('ventas')
  const [cargando, setCargando] = useState(false)

  const [busquedaPaciente, setBusquedaPaciente] = useState('')
  const [resultadosPaciente, setResultadosPaciente] = useState([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null)

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

  async function buscarPacientes() {
    const termino = busquedaPaciente.trim()
    if (!termino) return
    let query = supabase.from('pacientes').select('id, apellido_paciente, nombres_paciente, dni')
    if (/^\d+$/.test(termino)) {
      query = query.eq('dni', termino)
    } else {
      query = query.ilike('apellido_paciente', `%${termino}%`)
    }
    const { data } = await query.order('apellido_paciente').limit(10)
    setResultadosPaciente(data || [])
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
    if (pacienteSeleccionado) query = query.eq('paciente_id', pacienteSeleccionado.id)

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
      .select(`id, monto_pesos, monto_usd, fecha_pago, formas_pago (forma_pago), ventas (pacientes (apellido_paciente, nombres_paciente))`)
      .gte('fecha_pago', `${desde}T00:00:00`)
      .lte('fecha_pago', `${hasta}T23:59:59`)

    const { data: manuales } = await supabase
      .from('caja_movimientos').select('*')
      .gte('fecha', desde).lte('fecha', hasta)

    const pagosComoMovimientos = (pagosData || []).map(p => ({
      id: `pago-${p.id}`, tipo: 'ingreso', origen: 'pago',
      concepto: `Pago - ${p.ventas?.pacientes?.apellido_paciente || ''} ${p.ventas?.pacientes?.nombres_paciente || ''} (${p.formas_pago?.forma_pago || ''})`,
      monto_pesos: p.monto_pesos, monto_usd: p.monto_usd, created_at: p.fecha_pago,
    }))

    setMovimientosCaja([...pagosComoMovimientos, ...(manuales || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
  }

  async function cargarVisitas() {
    let query = supabase
      .from('visitas')
      .select(`id, fecha, observaciones, visita_motivos (motivo), pacientes (apellido_paciente, nombres_paciente, dni), ventas (id)`)
      .gte('fecha', `${desde}T00:00:00`)
      .lte('fecha', `${hasta}T23:59:59`)
      .order('fecha', { ascending: false })

    if (motivoId) query = query.eq('motivo_id', motivoId)
    if (operadorId) query = query.eq('creado_por', operadorId)
    if (pacienteSeleccionado) query = query.eq('paciente_id', pacienteSeleccionado.id)

    const { data } = await query
    setVisitas(data || [])
  }

  const totalVentasPesos = ventas.reduce((acc, v) => acc + (Number(v.total_pesos) || 0), 0)
  const totalVentasUSD = ventas.reduce((acc, v) => acc + (Number(v.total_dolares) || 0), 0)
  const totalPagadoPesos = pagos.reduce((acc, p) => acc + (Number(p.monto_pesos) || 0), 0)
  const totalPagadoUSD = pagos.reduce((acc, p) => acc + (Number(p.monto_usd) || 0), 0)
  const ingresosPesos = movimientosCaja.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + (Number(m.monto_pesos) || 0), 0)
  const egresosPesos = movimientosCaja.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + (Number(m.monto_pesos) || 0), 0)
  const ingresosUSD = movimientosCaja.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + (Number(m.monto_usd) || 0), 0)
  const egresosUSD = movimientosCaja.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + (Number(m.monto_usd) || 0), 0)
  const visitasPorMotivo = visitas.reduce((acc, v) => { const m = v.visita_motivos?.motivo || 'Sin motivo'; acc[m] = (acc[m] || 0) + 1; return acc }, {})

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
  const fmtUSD = (n) => `U$S ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtFecha = (f) => new Date(f).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
  const fmtHora = (f) => new Date(f).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })

  const tabLabels = { ventas: 'Ventas', pagos: 'Pagos', caja: 'Caja', visitas: 'Visitas' }

  return (
    <div style={{ maxWidth: '960px' }}>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          aside { display: none !important; }
          main { margin-left: 0 !important; padding: 20px !important; }
          body { background: white; }
          tr { page-break-inside: avoid; }
          table { font-size: 11px; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Header de impresión — visible solo al imprimir */}
      <div className="print-only" style={{
        marginBottom: '20px', paddingBottom: '14px',
        borderBottom: '2px solid #8B1E2D',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.jpeg" style={{ width: '48px', height: '48px', borderRadius: '50%' }} alt="logo" />
            <div>
              <div style={{ fontWeight: '700', fontSize: '18px', color: '#8B1E2D' }}>AudioProtesis</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Quilmes, Buenos Aires</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>
              Reporte de {tabLabels[tab]} — {fmtFecha(desde)} al {fmtFecha(hasta)}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              Impreso: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Header pantalla */}
      <div style={{ marginBottom: '28px' }} className="no-print">
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Reportes</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Ventas, pagos, caja y visitas por período</p>
      </div>

      {/* Filtros */}
      <div style={card} className="no-print">
        <div style={cardTitle}>🔍 Filtros</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
          <Field label="Obra social">
            <select value={obraSocialId} onChange={(e) => setObraSocialId(e.target.value)} style={inputStyle}>
              <option value="">Todas</option>
              {obrasSociales.map(o => <option key={o.id} value={o.id}>{o.obra_social}</option>)}
            </select>
          </Field>
          <Field label="Motivo de visita">
            <select value={motivoId} onChange={(e) => setMotivoId(e.target.value)} style={inputStyle}>
              <option value="">Todos</option>
              {motivos.map(m => <option key={m.id} value={m.id}>{m.motivo}</option>)}
            </select>
          </Field>
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
                <input
                  placeholder="DNI o apellido..."
                  value={busquedaPaciente}
                  onChange={(e) => setBusquedaPaciente(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarPacientes()}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={buscarPacientes} style={{ padding: '10px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>Buscar</button>
              </div>
            )}
            {resultadosPaciente.length > 0 && !pacienteSeleccionado && (
              <select value="" onChange={(e) => {
                const p = resultadosPaciente.find(x => x.id == e.target.value)
                if (!p) return
                setPacienteSeleccionado(p)
                setResultadosPaciente([])
                setBusquedaPaciente('')
              }} style={{ ...inputStyle, marginTop: '6px' }}>
                <option value="">Seleccionar ({resultadosPaciente.length} encontrados)</option>
                {resultadosPaciente.map(p => (
                  <option key={p.id} value={p.id}>{p.apellido_paciente} {p.nombres_paciente} — DNI: {p.dni}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <button onClick={buscar} disabled={cargando} style={{ ...btnPrimario, opacity: cargando ? 0.7 : 1 }}>
          {cargando ? 'Buscando...' : '🔍 Buscar'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }} className="no-print">
        {[
          ['ventas', `📊 Ventas${ventas.length > 0 ? ` (${ventas.length})` : ''}`],
          ['pagos', `💳 Pagos${pagos.length > 0 ? ` (${pagos.length})` : ''}`],
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {ventas.length} ventas · {fmt(totalVentasPesos)} · {fmtUSD(totalVentasUSD)}
            </div>
            <button onClick={() => window.print()} className="no-print" style={btnImprimir}>🖨️ Imprimir</button>
          </div>
          <div style={card}>
            {ventas.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay ventas para el período seleccionado</div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Fecha</th>
                    <th style={thStyle}>Paciente</th>
                    <th style={thStyle}>DNI</th>
                    <th style={thStyle}>Productos</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total $</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total U$S</th>
                    <th style={thStyle}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((v, i) => (
                    <tr key={v.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={tdStyle}>{v.id}</td>
                      <td style={tdStyle}>{fmtFecha(v.fecha)}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{v.pacientes?.apellido_paciente} {v.pacientes?.nombres_paciente}</td>
                      <td style={tdStyle}>{v.pacientes?.dni}</td>
                      <td style={tdStyle}>
                        {v.venta_detalle?.map(d => (
                          <div key={d.id} style={{ fontSize: '12px', color: '#6b7280' }}>
                            {d.numeros_serie?.productos?.producto || d.productos?.producto || '-'}
                            {d.numeros_serie?.numero_serie ? ` (${d.numeros_serie.numero_serie})` : ''}
                          </div>
                        ))}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>
                        {v.total_pesos > 0 ? fmt(v.total_pesos) : '-'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#2563eb', fontWeight: '600' }}>
                        {v.total_dolares > 0 ? fmtUSD(v.total_dolares) : '-'}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: v.confirmada ? '#dcfce7' : '#fef9c3', color: v.confirmada ? '#16a34a' : '#ca8a04' }}>
                          {v.confirmada ? 'Confirmada' : 'Pendiente'}
                        </span>
                      </td>
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

      {/* REPORTE PAGOS */}
      {tab === 'pagos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {pagos.length} pagos · {fmt(totalPagadoPesos)} · {fmtUSD(totalPagadoUSD)}
            </div>
            <button onClick={() => window.print()} className="no-print" style={btnImprimir}>🖨️ Imprimir</button>
          </div>
          <div style={card}>
            {pagos.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay pagos para el período seleccionado</div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Fecha</th>
                    <th style={thStyle}>Paciente</th>
                    <th style={thStyle}>DNI</th>
                    <th style={thStyle}>Venta #</th>
                    <th style={thStyle}>Forma de pago</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Monto $</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Monto U$S</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p, i) => (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={tdStyle}>{fmtFecha(p.fecha_pago)}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{p.ventas?.pacientes?.apellido_paciente} {p.ventas?.pacientes?.nombres_paciente}</td>
                      <td style={tdStyle}>{p.ventas?.pacientes?.dni}</td>
                      <td style={tdStyle}>#{p.ventas?.id}</td>
                      <td style={tdStyle}>{p.formas_pago?.forma_pago}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>
                        {p.monto_pesos ? fmt(p.monto_pesos) : '-'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#2563eb', fontWeight: '600' }}>
                        {p.monto_usd ? fmtUSD(p.monto_usd) : '-'}
                      </td>
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

      {/* REPORTE CAJA */}
      {tab === 'caja' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>{movimientosCaja.length} movimientos</div>
            <button onClick={() => window.print()} className="no-print" style={btnImprimir}>🖨️ Imprimir</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'Caja Pesos', ingresos: ingresosPesos, egresos: egresosPesos, fmt: fmt },
              { label: 'Caja USD', ingresos: ingresosUSD, egresos: egresosUSD, fmt: fmtUSD },
            ].map(({ label, ingresos, egresos, fmt: f }) => (
              <div key={label} style={card}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                  <span style={{ color: '#6b7280' }}>Ingresos</span>
                  <span style={{ color: '#16a34a', fontWeight: '600' }}>{f(ingresos)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Egresos</span>
                  <span style={{ color: '#dc2626', fontWeight: '600' }}>{f(egresos)}</span>
                </div>
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '700' }}>Saldo</span>
                  <span style={{ fontWeight: '700', fontSize: '18px', color: (ingresos - egresos) >= 0 ? '#16a34a' : '#dc2626' }}>{f(ingresos - egresos)}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={card}>
            {movimientosCaja.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay movimientos para el período seleccionado</div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Fecha</th>
                    <th style={thStyle}>Concepto</th>
                    <th style={thStyle}>Origen</th>
                    <th style={thStyle}>Tipo</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Monto $</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Monto U$S</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosCaja.map((m, i) => (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={tdStyle}>{fmtFecha(m.created_at)}</td>
                      <td style={tdStyle}>{m.concepto}</td>
                      <td style={tdStyle}>{m.origen === 'pago' ? 'Pago' : 'Manual'}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: m.tipo === 'ingreso' ? '#dcfce7' : '#fef2f2', color: m.tipo === 'ingreso' ? '#16a34a' : '#dc2626' }}>
                          {m.tipo}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: m.tipo === 'ingreso' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                        {m.monto_pesos ? `${m.tipo === 'egreso' ? '-' : ''}${fmt(m.monto_pesos)}` : '-'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: m.tipo === 'ingreso' ? '#2563eb' : '#dc2626', fontWeight: '600' }}>
                        {m.monto_usd ? `${m.tipo === 'egreso' ? '-' : ''}${fmtUSD(m.monto_usd)}` : '-'}
                      </td>
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

      {/* REPORTE VISITAS */}
      {tab === 'visitas' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span><strong>{visitas.length}</strong> visitas</span>
              {Object.entries(visitasPorMotivo).map(([motivo, cant]) => (
                <span key={motivo}>{motivo}: <strong>{cant}</strong></span>
              ))}
            </div>
            <button onClick={() => window.print()} className="no-print" style={btnImprimir}>🖨️ Imprimir</button>
          </div>
          <div style={card}>
            {visitas.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay visitas para el período seleccionado</div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Fecha</th>
                    <th style={thStyle}>Hora</th>
                    <th style={thStyle}>Paciente</th>
                    <th style={thStyle}>DNI</th>
                    <th style={thStyle}>Motivo</th>
                    <th style={thStyle}>Venta</th>
                    <th style={thStyle}>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visitas.map((v, i) => (
                    <tr key={v.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={tdStyle}>{fmtFecha(v.fecha)}</td>
                      <td style={tdStyle}>{fmtHora(v.fecha)}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{v.pacientes?.apellido_paciente} {v.pacientes?.nombres_paciente}</td>
                      <td style={tdStyle}>{v.pacientes?.dni}</td>
                      <td style={tdStyle}>
                        <span style={{ color: '#8B1E2D', fontWeight: '600' }}>{v.visita_motivos?.motivo || '-'}</span>
                      </td>
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
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' }
const thStyle = { padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }
const tdStyle = { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#1a1a1a', verticalAlign: 'top' }
