'use client'

export const dynamic = 'force-dynamic'

import { getUsuarioId } from '../../lib/getUsuario'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function DerivadoresReporte() {
  const [derivadores, setDerivadores] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [comisiones, setComisiones] = useState([])
  const [cargando, setCargando] = useState(false)

  // Filtros reporte
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [verReporte, setVerReporte] = useState(false)

  // Modal editar comisión
  const [modalEditar, setModalEditar] = useState(null)
  const [formEditar, setFormEditar] = useState({ tipo_comision: '', valor_comision: '', monto_calculado: '' })

  // Modal pagar
  const [modalPagar, setModalPagar] = useState(null)
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => { cargarResumen() }, [])

  async function cargarResumen() {
    setCargando(true)
    const { data: derivs } = await supabase.from('derivadores').select('*').eq('activo', true).order('derivador')
    const conTotales = await Promise.all((derivs || []).map(async d => {
      const { data: comis } = await supabase.from('venta_derivadores').select('id, monto_calculado, pagado, venta_id').eq('derivador_id', d.id)
      const pendiente = (comis || []).filter(c => !c.pagado).reduce((acc, c) => acc + (Number(c.monto_calculado) || 0), 0)
      const pagado = (comis || []).filter(c => c.pagado).reduce((acc, c) => acc + (Number(c.monto_calculado) || 0), 0)
      return { ...d, pendiente, pagado, total: (comis || []).length }
    }))
    setDerivadores(conTotales)
    setCargando(false)
  }

  async function getCotizacion(fecha) {
    // Buscar cotización del día o el día anterior más cercano
    const fechaStr = fecha.split('T')[0]
    const { data } = await supabase.from('valor_dolar_bna')
      .select('fecha, dolar_vendedor')
      .lte('fecha', fechaStr)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data?.dolar_vendedor || null
  }

  async function cargarComisiones(derivadorId) {
    const { data } = await supabase.from('venta_derivadores')
      .select(`
        id, tipo_comision, valor_comision, monto_calculado, pagado, fecha_pago, created_at,
        ventas (
          id, fecha, total_pesos, total_dolares,
          pacientes (apellido_paciente, nombres_paciente, dni),
          venta_detalle (
            id, precio_venta_pesos, precio_venta_usd,
            numeros_serie (productos (producto)),
            productos (producto)
          )
        )
      `)
      .eq('derivador_id', derivadorId)
      .order('created_at', { ascending: false })
    setComisiones(data || [])
  }

  async function recalcularConDolar(comision) {
    if (comision.tipo_comision !== 'porcentaje') return
    const venta = comision.ventas
    if (!venta?.total_dolares || venta.total_dolares <= 0) return

    const cotizacion = await getCotizacion(venta.fecha)
    if (!cotizacion) {
      alert('No hay cotización del dólar para esa fecha. Podés ingresar el monto manualmente.')
      return
    }

    const baseEnPesos = (Number(venta.total_pesos) || 0) + (Number(venta.total_dolares) * cotizacion)
    const monto = Math.round(baseEnPesos * Number(comision.valor_comision) / 100)

    await supabase.from('venta_derivadores').update({ monto_calculado: monto }).eq('id', comision.id)
    cargarComisiones(seleccionado.id)
    alert(`✅ Recalculado con cotización ${fmt(cotizacion)}/U$S → comisión: ${fmt(monto)}`)
  }

  function abrirDerivador(d) {
    setSeleccionado(d)
    setVerReporte(false)
    cargarComisiones(d.id)
  }

  function volverAlListado() {
    setSeleccionado(null)
    setComisiones([])
    setVerReporte(false)
    cargarResumen()
  }

  function abrirEditar(c) {
    setModalEditar(c)
    setFormEditar({ tipo_comision: c.tipo_comision, valor_comision: String(c.valor_comision || ''), monto_calculado: String(c.monto_calculado || '') })
  }

  async function guardarEdicion() {
    const { error } = await supabase.from('venta_derivadores').update({
      tipo_comision: formEditar.tipo_comision,
      valor_comision: Number(formEditar.valor_comision),
      monto_calculado: formEditar.monto_calculado ? Number(formEditar.monto_calculado) : null,
    }).eq('id', modalEditar.id)
    if (error) { alert('Error: ' + error.message); return }
    setModalEditar(null)
    cargarComisiones(seleccionado.id)
    cargarResumen()
  }

  async function registrarPago(comision) {
    const { error } = await supabase.from('venta_derivadores').update({ pagado: true, fecha_pago: fechaPago }).eq('id', comision.id)
    if (error) { alert('Error: ' + error.message); return }
    setModalPagar(null)
    cargarComisiones(seleccionado.id)
    cargarResumen()
    alert('✅ Pago registrado')
  }

  async function desmarcarPago(comision) {
    if (!confirm('¿Desmarcar este pago como pendiente?')) return
    await supabase.from('venta_derivadores').update({ pagado: false, fecha_pago: null }).eq('id', comision.id)
    cargarComisiones(seleccionado.id)
    cargarResumen()
  }

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
  const fmtUSD = (n) => `U$S ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  const fmtFechaCorta = (f) => f ? new Date(f + 'T12:00:00').toLocaleDateString('es-AR') : '-'
  const fmtFechaISO = (f) => f ? new Date(f).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '-'

  function getProductosVenta(venta) {
    if (!venta?.venta_detalle) return '-'
    return venta.venta_detalle.map(d => d.numeros_serie?.productos?.producto || d.productos?.producto || '-').filter(Boolean).join(', ')
  }

  function getMontoVenta(venta) {
    if (!venta) return ''
    const partes = []
    if (venta.total_pesos > 0) partes.push(fmt(venta.total_pesos))
    if (venta.total_dolares > 0) partes.push(fmtUSD(venta.total_dolares))
    return partes.join(' + ')
  }

  // Filtrar comisiones para reporte
  const comisionesFiltradas = comisiones.filter(c => {
    if (filtroEstado === 'pagas' && !c.pagado) return false
    if (filtroEstado === 'impagas' && c.pagado) return false
    const fecha = c.ventas?.fecha?.split('T')[0]
    if (filtroDesde && fecha < filtroDesde) return false
    if (filtroHasta && fecha > filtroHasta) return false
    return true
  })

  const pendienteTotal = comisiones.filter(c => !c.pagado).reduce((acc, c) => acc + (Number(c.monto_calculado) || 0), 0)
  const pagadoTotal = comisiones.filter(c => c.pagado).reduce((acc, c) => acc + (Number(c.monto_calculado) || 0), 0)
  const totalReporte = comisionesFiltradas.reduce((acc, c) => acc + (Number(c.monto_calculado) || 0), 0)

  return (
    <div style={{ maxWidth: '900px' }}>

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

      {/* Header impresión */}
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
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>
              Comisiones — {seleccionado?.derivador}
              {filtroEstado !== 'todas' && ` · ${filtroEstado === 'pagas' ? 'Pagadas' : 'Impagas'}`}
              {filtroDesde && ` · desde ${fmtFechaCorta(filtroDesde)}`}
              {filtroHasta && ` al ${fmtFechaCorta(filtroHasta)}`}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              Impreso: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Header pantalla */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }} className="no-print">
        <div>
          {seleccionado ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={volverAlListado} style={{ ...btnSecundario, fontSize: '13px', padding: '6px 12px' }}>← Volver</button>
                <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>{seleccionado.derivador}</h1>
              </div>
              <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                {seleccionado.especialidad && `${seleccionado.especialidad} · `}Comisiones y pagos
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Derivadores</h1>
              <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Comisiones pendientes y pagadas</p>
            </>
          )}
        </div>
        {seleccionado && (
          <button onClick={() => setVerReporte(!verReporte)} style={{ ...btnSecundario, fontSize: '13px', color: verReporte ? '#8B1E2D' : '#374151', borderColor: verReporte ? '#f5c2c9' : '#e5e7eb' }}>
            {verReporte ? '← Ver comisiones' : '🖨️ Reporte imprimible'}
          </button>
        )}
      </div>

      {/* LISTADO DE DERIVADORES */}
      {!seleccionado && (
        <>
          {cargando ? (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Cargando...</div>
          ) : derivadores.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
              No hay derivadores activos. <a href="/derivadores" style={{ color: '#8B1E2D' }}>Ir a configuración →</a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {derivadores.map(d => (
                <div key={d.id} onClick={() => abrirDerivador(d)} style={{ ...card, cursor: 'pointer', marginBottom: '0', transition: '0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#8B1E2D'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,30,45,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a' }}>{d.derivador}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                        {d.especialidad && `${d.especialidad} · `}{d.total} venta{d.total !== 1 ? 's' : ''} derivada{d.total !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      {d.pendiente > 0 && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600', textTransform: 'uppercase' }}>Pendiente</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>{fmt(d.pendiente)}</div>
                        </div>
                      )}
                      {d.pagado > 0 && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', textTransform: 'uppercase' }}>Pagado</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a' }}>{fmt(d.pagado)}</div>
                        </div>
                      )}
                      {d.total === 0 && <div style={{ fontSize: '13px', color: '#9ca3af' }}>Sin comisiones</div>}
                      <span style={{ color: '#9ca3af', fontSize: '18px' }}>→</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* DETALLE DE DERIVADOR */}
      {seleccionado && !verReporte && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <div style={statCard}><div style={statLabel}>Total ventas</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>{comisiones.length}</div></div>
            <div style={{ ...statCard, borderLeft: '4px solid #dc2626' }}><div style={statLabel}>Pendiente de pago</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>{fmt(pendienteTotal)}</div></div>
            <div style={{ ...statCard, borderLeft: '4px solid #16a34a' }}><div style={statLabel}>Total pagado</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a' }}>{fmt(pagadoTotal)}</div></div>
          </div>

          <div style={card}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>Comisiones por venta</div>
            {comisiones.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay comisiones registradas</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {comisiones.map(c => (
                  <div key={c.id} style={{ padding: '14px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb', borderLeft: `4px solid ${c.pagado ? '#16a34a' : '#dc2626'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a1a' }}>
                          Venta #{c.ventas?.id} — {fmtFechaCorta(c.ventas?.fecha)}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                          {c.ventas?.pacientes?.apellido_paciente} {c.ventas?.pacientes?.nombres_paciente}
                          {c.ventas?.pacientes?.dni && ` · DNI: ${c.ventas.pacientes.dni}`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                          {getProductosVenta(c.ventas)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
                          {c.tipo_comision === 'porcentaje' ? `${c.valor_comision}%` : 'Monto fijo'}
                          {` · Venta: ${getMontoVenta(c.ventas)}`}
                          {c.pagado && c.fecha_pago && ` · Pagado: ${fmtFechaCorta(c.fecha_pago)}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: c.pagado ? '#16a34a' : '#dc2626' }}>{fmt(c.monto_calculado)}</div>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: c.pagado ? '#dcfce7' : '#fef2f2', color: c.pagado ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                            {c.pagado ? '✅ Pagado' : '⏳ Pendiente'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button onClick={() => abrirEditar(c)} style={{ ...btnSecundario, fontSize: '12px', padding: '5px 10px', color: '#8B1E2D', borderColor: '#f5c2c9' }}>✏️ Editar</button>
                          {c.tipo_comision === 'porcentaje' && c.ventas?.total_dolares > 0 && (
                            <button onClick={() => recalcularConDolar(c)} style={{ ...btnSecundario, fontSize: '12px', padding: '5px 10px', color: '#1d4ed8', borderColor: '#bfdbfe' }}>💱 Recalc. U$S</button>
                          )}
                          {!c.pagado ? (
                            <button onClick={() => { setModalPagar(c); setFechaPago(new Date().toISOString().split('T')[0]) }} style={{ ...btnSecundario, fontSize: '12px', padding: '5px 10px', color: '#16a34a', borderColor: '#bbf7d0' }}>💰 Pagar</button>
                          ) : (
                            <button onClick={() => desmarcarPago(c)} style={{ ...btnSecundario, fontSize: '12px', padding: '5px 10px', color: '#6b7280' }}>↩ Desmarcar</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* REPORTE IMPRIMIBLE */}
      {seleccionado && verReporte && (
        <>
          {/* Filtros — solo pantalla */}
          <div style={{ ...card, marginBottom: '16px' }} className="no-print">
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={labelStyle}>Estado</label>
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ ...inputStyle, width: '160px' }}>
                  <option value="todas">Todas</option>
                  <option value="pagas">Solo pagadas</option>
                  <option value="impagas">Solo impagas</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Desde</label>
                <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} style={{ ...inputStyle, width: '160px' }} />
              </div>
              <div>
                <label style={labelStyle}>Hasta</label>
                <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} style={{ ...inputStyle, width: '160px' }} />
              </div>
              <button onClick={() => window.print()} style={btnImprimir}>🖨️ Imprimir</button>
            </div>
          </div>

          {/* Resumen imprimible */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {comisionesFiltradas.length} comisiones · Total: <strong>{fmt(totalReporte)}</strong>
            </div>
          </div>

          {/* Tabla */}
          <div style={card}>
            {comisionesFiltradas.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay comisiones para los filtros seleccionados</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Fecha</th>
                    <th style={thStyle}>Paciente</th>
                    <th style={thStyle}>Producto</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Venta</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Comisión</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Monto</th>
                    <th style={thStyle}>Estado</th>
                    <th style={thStyle}>F. Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {comisionesFiltradas.map((c, i) => (
                    <tr key={c.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={tdStyle}>{fmtFechaCorta(c.ventas?.fecha)}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>
                        {c.ventas?.pacientes?.apellido_paciente} {c.ventas?.pacientes?.nombres_paciente}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '12px', color: '#6b7280' }}>{getProductosVenta(c.ventas)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontSize: '12px' }}>{getMontoVenta(c.ventas)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontSize: '12px' }}>
                        {c.tipo_comision === 'porcentaje' ? `${c.valor_comision}%` : 'Fijo'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: c.pagado ? '#16a34a' : '#dc2626' }}>{fmt(c.monto_calculado)}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: c.pagado ? '#dcfce7' : '#fef2f2', color: c.pagado ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                          {c.pagado ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: '12px', color: '#9ca3af' }}>{c.fecha_pago ? fmtFechaCorta(c.fecha_pago) : '-'}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#1a1a1a' }}>
                    <td colSpan={5} style={{ ...tdStyle, color: 'white', fontWeight: '700' }}>TOTAL ({comisionesFiltradas.length} comisiones)</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#86efac', fontWeight: '700' }}>{fmt(totalReporte)}</td>
                    <td colSpan={2} style={tdStyle}></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* MODAL EDITAR COMISIÓN */}
      {modalEditar && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '4px' }}>✏️ Editar comisión</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              Venta #{modalEditar.ventas?.id} · {modalEditar.ventas?.pacientes?.apellido_paciente} {modalEditar.ventas?.pacientes?.nombres_paciente}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Tipo de comisión</label>
                <select value={formEditar.tipo_comision} onChange={(e) => setFormEditar({ ...formEditar, tipo_comision: e.target.value })} style={inputStyle}>
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="monto_fijo">Monto fijo ($)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>{formEditar.tipo_comision === 'porcentaje' ? 'Porcentaje (%)' : 'Valor ($)'}</label>
                <input type="number" value={formEditar.valor_comision} onChange={(e) => setFormEditar({ ...formEditar, valor_comision: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Monto a pagar ($) <span style={{ fontWeight: '400', color: '#9ca3af' }}>— editable</span></label>
                <input type="number" value={formEditar.monto_calculado} onChange={(e) => setFormEditar({ ...formEditar, monto_calculado: e.target.value })} style={{ ...inputStyle, background: '#fdf2f4', color: '#8B1E2D', fontWeight: '600' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={guardarEdicion} style={btnPrimario}>💾 Guardar</button>
              <button onClick={() => setModalEditar(null)} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGAR */}
      {modalPagar && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '4px' }}>💰 Registrar pago</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              Venta #{modalPagar.ventas?.id} · {modalPagar.ventas?.pacientes?.apellido_paciente} {modalPagar.ventas?.pacientes?.nombres_paciente}
            </div>
            <div style={{ padding: '14px 16px', background: '#fdf2f4', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Monto a pagar</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#8B1E2D' }}>{fmt(modalPagar.monto_calculado)}</div>
            </div>
            <div>
              <label style={labelStyle}>Fecha de pago</label>
              <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => registrarPago(modalPagar)} style={{ ...btnPrimario, background: '#16a34a' }}>✅ Confirmar pago</button>
              <button onClick={() => setModalPagar(null)} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '15px', fontFamily: "'Outfit', sans-serif", background: 'white', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', display: 'block' }
const card = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const statCard = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const statLabel = { fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnImprimir = { padding: '8px 16px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modalBox = { background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '460px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }
const thStyle = { padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', whiteSpace: 'nowrap' }
const tdStyle = { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#1a1a1a', verticalAlign: 'top', whiteSpace: 'nowrap' }
