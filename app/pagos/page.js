'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { fetchConToken } from '../../lib/fetchConToken'
import { formatearPesos } from '../../lib/format'

export default function Pagos() {
  const searchParams = useSearchParams()
  const ventaIdParam = searchParams.get('venta_id')
  const dniParam = searchParams.get('dni')

  const [dni, setDni] = useState(dniParam || '')
  const [paciente, setPaciente] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [ventas, setVentas] = useState([])
  const [ventaSeleccionada, setVentaSeleccionada] = useState(ventaIdParam || '')
  const [formasPago, setFormasPago] = useState([])
  const [detalleVenta, setDetalleVenta] = useState([])
  const [pagosVenta, setPagosVenta] = useState([])
  const [totalPesos, setTotalPesos] = useState(0)
  const [totalUSD, setTotalUSD] = useState(0)

  const [cotizacion, setCotizacion] = useState(null)
  const [cotizacionManual, setCotizacionManual] = useState('')
  const [cotizacionFecha, setCotizacionFecha] = useState('')
  const [cotizacionEstado, setCotizacionEstado] = useState('')

  const [form, setForm] = useState({ forma_pago_id: '', monto_pesos: '', monto_usd: '' })

  const [altaRapida, setAltaRapida] = useState(false)
const [formAltaRapida, setFormAltaRapida] = useState({ apellido: '', nombre: '', dni: '', telefono: '' })
const [buscoPaciente, setBuscoPaciente] = useState(false)
  
  useEffect(() => {
    obtenerFormasPago()
    cargarCotizacion()
    if (dniParam) buscarPacienteAutomatico(dniParam)
  }, [])

  useEffect(() => {
    if (ventaIdParam) { setVentaSeleccionada(ventaIdParam); cargarDetalleVenta(ventaIdParam) }
  }, [ventaIdParam])

  async function cargarCotizacion() {
    const res = await fetchConToken('/api/cotizacion')
    const data = await res.json()
    if (data.error) { setCotizacionEstado('error'); return }
    setCotizacion(data.cotizacion)
    setCotizacionFecha(data.fecha)
    setCotizacionManual(String(data.cotizacion || ''))
    if (data.fuente === 'hoy') setCotizacionEstado('hoy')
    else if (data.fuente === 'anterior') setCotizacionEstado('anterior')
    else if (data.fuente === 'ninguna') setCotizacionEstado('error')
    else setCotizacionEstado('hoy')
  }

  async function obtenerFormasPago() {
    const res = await fetchConToken('/api/configuracion/formas-pago')
    const data = await res.json()
    setFormasPago(data.formas_pago || [])
  }

  async function buscarPacienteAutomatico(dniValor) {
    const res = await fetchConToken(`/api/pacientes?q=${encodeURIComponent(dniValor)}`)
    const data = await res.json()
    const lista = data.pacientes || []
    if (lista.length > 0) { setPaciente(lista[0]); await cargarVentasPaciente(lista[0].id) }
  }

  async function cargarVentasPaciente(pacienteId) {
    const res = await fetchConToken(`/api/ventas?paciente_id=${pacienteId}`)
    const data = await res.json()
    const ventasBase = data.ventas || []
    const ventasConSaldo = await Promise.all(ventasBase.map(async v => {
      const resPagos = await fetchConToken(`/api/pagos?venta_id=${v.id}`)
      const dataPagos = await resPagos.json()
      const pagos = dataPagos.pagos || []
      const pagadoP = pagos.reduce((acc, p) => acc + (Number(p.monto_equivalente_pesos) || Number(p.monto_pesos) || 0), 0)
      const pagadoU = pagos.reduce((acc, p) => acc + (Number(p.monto_equivalente_usd) || Number(p.monto_usd) || 0), 0)
      return { ...v, pagadoPesos: pagadoP, pagadoUSD: pagadoU }
    }))
    setVentas(ventasConSaldo)
  }

  async function buscarPaciente() {
  const valor = busqueda.trim()
  if (!valor) { alert('Ingresar DNI o apellido'); return }
  const res = await fetchConToken(`/api/pacientes?q=${encodeURIComponent(valor)}`)
  const data = await res.json()
  if (!data.pacientes || data.pacientes.length === 0) {
    setResultados([]); setBuscoPaciente(true); return
  }
  setBuscoPaciente(false)
  setResultados(data.pacientes)
}

  async function cargarDetalleVenta(ventaId) {
    const res = await fetchConToken(`/api/ventas/${ventaId}`)
    const data = await res.json()
    const detalle = data.venta?.venta_detalle || []
    setDetalleVenta(detalle)
  
    const totalPesosCalc = detalle.reduce((acc, d) => acc + ((Number(d.precio_venta_pesos) || 0) * (Number(d.cantidad) || 1)), 0)
const totalUSDCalc = detalle.reduce((acc, d) => acc + ((Number(d.precio_venta_usd) || 0) * (Number(d.cantidad) || 1)), 0)
    setTotalPesos(totalPesosCalc)
    setTotalUSD(totalUSDCalc)
    await cargarPagosVenta(ventaId)
  }

  async function cargarPagosVenta(ventaId) {
    const res = await fetchConToken(`/api/pagos?venta_id=${ventaId}`)
    const data = await res.json()
    setPagosVenta(data.pagos || [])
  }

  function calcularPagado() {
    const pagadoP = pagosVenta.reduce((acc, p) => acc + (Number(p.monto_equivalente_pesos) || Number(p.monto_pesos) || 0), 0)
    const pagadoU = pagosVenta.reduce((acc, p) => acc + (Number(p.monto_equivalente_usd) || Number(p.monto_usd) || 0), 0)
    return { pagadoP, pagadoU }
  }

  async function eliminarPago(id) {
    if (!confirm('¿Eliminar este pago?')) return
    await fetchConToken(`/api/pagos/${id}`, { method: 'DELETE' })
    await cargarPagosVenta(ventaSeleccionada)
    if (paciente) await cargarVentasPaciente(paciente.id)
  }

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }) }

async function guardarAltaRapida() {
  if (!formAltaRapida.apellido || !formAltaRapida.nombre || !formAltaRapida.dni || !formAltaRapida.telefono) {
    alert('Apellido, nombre, DNI y teléfono son obligatorios'); return
  }
  const res = await fetchConToken('/api/pacientes', {
    method: 'POST',
    body: JSON.stringify({
      apellido_paciente: formAltaRapida.apellido,
      nombres_paciente: formAltaRapida.nombre,
      dni: formAltaRapida.dni,
      telefono: formAltaRapida.telefono || null,
    })
  })
  const data = await res.json()
  if (!res.ok) { alert('Error: ' + data.error); return }
  const nuevo = data.paciente
  setPaciente(nuevo); setDni(nuevo.dni)
  setAltaRapida(false); setFormAltaRapida({ apellido: '', nombre: '', dni: '', telefono: '' })
  setBusqueda(''); setResultados([]); setBuscoPaciente(false)
  await cargarVentasPaciente(nuevo.id)
}
  
  async function guardarPago() {
    if (!ventaSeleccionada) { alert('Seleccionar venta'); return }
    if (!form.forma_pago_id) { alert('Seleccionar forma de pago'); return }

    const montoPesos = Number(form.monto_pesos) || 0
    const montoUsd = Number(form.monto_usd) || 0
    if (!montoPesos && !montoUsd) { alert('Ingresar monto en pesos o USD'); return }
    if (montoPesos && montoUsd) { alert('Ingresar el pago en una sola moneda'); return }

    const cotizUsada = Number(cotizacionManual) || cotizacion
    const { pagadoP, pagadoU } = calcularPagado()
    const saldoP = totalPesos - pagadoP
    const saldoU = totalUSD - pagadoU

    let montoEquivPesos = null
    let montoEquivUSD = null

    if (totalPesos > 0 && totalUSD === 0 && montoUsd > 0) {
      if (!cotizUsada) { alert('No hay cotización disponible. Ingresala manualmente.'); return }
      montoEquivPesos = Math.round(montoUsd * cotizUsada)
      if (montoEquivPesos > saldoP + 1) { alert(`El pago en USD equivale a ${fmt(montoEquivPesos)} y supera el saldo de ${fmt(saldoP)}`); return }
    }

    if (totalUSD > 0 && totalPesos === 0 && montoPesos > 0) {
      if (!cotizUsada) { alert('No hay cotización disponible. Ingresala manualmente.'); return }
      montoEquivUSD = montoPesos / cotizUsada
      if (montoEquivUSD > saldoU + 0.01) { alert(`El pago en pesos equivale a U$S ${montoEquivUSD.toFixed(2)} y supera el saldo de U$S ${saldoU}`); return }
    }

    if (totalPesos > 0 && montoPesos > 0 && montoPesos > saldoP + 1) { alert('El pago supera el saldo en pesos'); return }
    if (totalUSD > 0 && montoUsd > 0 && montoUsd > saldoU + 0.01) { alert('El pago supera el saldo en USD'); return }

    const res = await fetchConToken('/api/pagos', {
      method: 'POST',
      body: JSON.stringify({
        venta_id: Number(ventaSeleccionada),
        fecha_pago: new Date().toISOString(),
        forma_pago_id: Number(form.forma_pago_id),
        monto_pesos: montoPesos || null,
        monto_usd: montoUsd || null,
        cotizacion_usada: (montoEquivPesos || montoEquivUSD) ? cotizUsada : null,
        monto_equivalente_pesos: montoEquivPesos || null,
        monto_equivalente_usd: montoEquivUSD ? Number(montoEquivUSD.toFixed(2)) : null,
      })
    })
    const data = await res.json()
    if (!res.ok) { alert('Error: ' + data.error); return }

    // Guardar cotización si fue modificada manualmente
    if (cotizacionEstado === 'manual' && cotizacionManual) {
      await fetchConToken('/api/cotizacion', {
        method: 'POST',
        body: JSON.stringify({ valor: Number(cotizacionManual) })
      })
    }

    alert('✅ Pago registrado')
    setForm({ forma_pago_id: '', monto_pesos: '', monto_usd: '' })
    await cargarPagosVenta(ventaSeleccionada)
    if (paciente) await cargarVentasPaciente(paciente.id)
  }

  const { pagadoP, pagadoU } = calcularPagado()
  const saldoPesos = totalPesos - pagadoP
  const saldoUSD = totalUSD - pagadoU
  const ventaSaldada = saldoPesos <= 0.01 && saldoUSD <= 0.01
  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
  const fmtUSD = (n) => `U$S ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const ventaEsUSD = totalUSD > 0 && totalPesos === 0
  const ventaEsPesos = totalPesos > 0 && totalUSD === 0
  const pagoEnMonedaDistinta = (ventaEsUSD && Number(form.monto_pesos) > 0) || (ventaEsPesos && Number(form.monto_usd) > 0)

  return (
    <div style={{ maxWidth: '750px' }}>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Pagos</h1>
        <p style={{ color: '#6b7280', marginTop: '6px', fontSize: '14px' }}>Registrar y gestionar pagos de ventas</p>
      </div>

      {/* Buscador */}
      <div style={card}>
        <div style={cardTitle}>🔍 Buscar paciente</div>
<div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
  <input placeholder="DNI o Apellido" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setBuscoPaciente(false); setAltaRapida(false) }} onKeyDown={(e) => e.key === 'Enter' && buscarPaciente()} style={{ ...inputStyle, flex: 1, minWidth: '180px' }} />
  <button onClick={buscarPaciente} style={btnPrimario}>Buscar</button>
</div>
{resultados.length > 0 && (
  <select value="" onChange={async (e) => {
    const p = resultados.find(x => x.id == e.target.value)
    if (!p) return
    setPaciente(p); setDni(p.dni); setResultados([])
    await cargarVentasPaciente(p.id)
  }} style={{ ...inputStyle, marginTop: '10px' }}>
    <option value="">Seleccionar paciente ({resultados.length} encontrados)</option>
    {resultados.map(p => <option key={p.id} value={p.id}>{p.apellido_paciente} {p.nombres_paciente} — DNI: {p.dni}</option>)}
  </select>
)}
{buscoPaciente && resultados.length === 0 && !altaRapida && !paciente && (
  <button onClick={() => setAltaRapida(true)} style={{ ...btnFantasma, marginTop: '10px', width: '100%', textAlign: 'center' }}>
    + No encontrado — Dar de alta como nuevo paciente
  </button>
)}
{altaRapida && (
  <div style={{ marginTop: '12px', padding: '14px', background: '#fdf2f4', borderRadius: '8px', border: '1px solid #f5c2c9' }}>
    <div style={{ fontSize: '13px', fontWeight: '600', color: '#8B1E2D', marginBottom: '10px' }}>Alta rápida de paciente</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      <div><label style={labelStyle}>Apellido *</label><input placeholder="APELLIDO" value={formAltaRapida.apellido} onChange={(e) => setFormAltaRapida(f => ({ ...f, apellido: e.target.value.toUpperCase() }))} style={inputStyle} /></div>
      <div><label style={labelStyle}>Nombre *</label><input placeholder="NOMBRE" value={formAltaRapida.nombre} onChange={(e) => setFormAltaRapida(f => ({ ...f, nombre: e.target.value.toUpperCase() }))} style={inputStyle} /></div>
      <div><label style={labelStyle}>DNI *</label><input placeholder="DNI" value={formAltaRapida.dni} onChange={(e) => setFormAltaRapida(f => ({ ...f, dni: e.target.value }))} style={inputStyle} /></div>
      <div><label style={labelStyle}>Teléfono *</label><input placeholder="11 1234-5678" value={formAltaRapida.telefono} onChange={(e) => setFormAltaRapida(f => ({ ...f, telefono: e.target.value }))} style={inputStyle} /></div>
    </div>
    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
      <button onClick={guardarAltaRapida} style={{ ...btnPrimario, fontSize: '13px', padding: '8px 14px' }}>💾 Guardar y continuar</button>
      <button onClick={() => setAltaRapida(false)} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px' }}>Cancelar</button>
    </div>
  </div>
)}
{paciente && (
  <div style={{ marginTop: '14px', padding: '14px 16px', background: '#fdf2f4', borderRadius: '8px', border: '1px solid #f5c2c9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
    <div>
      <div style={{ fontWeight: '700', fontSize: '16px', color: '#8B1E2D' }}>{paciente.apellido_paciente} {paciente.nombres_paciente}</div>
      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>DNI: {paciente.dni} {paciente.telefono ? `· Tel: ${paciente.telefono}` : ''}</div>
    </div>
    <button onClick={() => window.location.href = `/pacientes?dni=${paciente.dni}`} style={btnSecundario}>✏️ Editar</button>
  </div>
)}
      </div>

      {/* Cotización del dólar */}
      <div style={{ ...card, padding: '14px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
            💱 Cotización U$S Blue
            {cotizacionFecha && (
              <span style={{ fontWeight: '400', color: '#9ca3af', marginLeft: '6px' }}>
                {cotizacionFecha ? `(${new Date(cotizacionFecha.includes('T') ? cotizacionFecha : cotizacionFecha + 'T12:00:00').toLocaleDateString('es-AR')})` : ''}
              </span>
            )}
          </div>
          <input
            type="number"
            placeholder="Ingresar cotización..."
            value={cotizacionManual}
            onChange={(e) => { setCotizacionManual(e.target.value); setCotizacionEstado('manual') }}
            style={{ ...inputStyle, width: '160px', fontSize: '14px' }}
          />
          {cotizacionEstado === 'hoy' && <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>✅ Actualizada hoy</span>}
          {cotizacionEstado === 'anterior' && <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600' }}>⚠️ Última disponible — verificar</span>}
          {cotizacionEstado === 'manual' && <span style={{ fontSize: '12px', color: '#6b7280' }}>✏️ Modificada manualmente</span>}
          {cotizacionEstado === 'error' && <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>❌ Sin cotización — ingresala manualmente</span>}
        </div>
      </div>

      {/* Historial de ventas */}
      {ventas.length > 0 && (
        <div style={card}>
          <div style={cardTitle}>🧾 Ventas del paciente</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ventas.map(v => {
              const totalV = v.total_pesos || 0
              const totalVusd = v.total_dolares || 0
              const saldoV = totalV - v.pagadoPesos
              const saldoVusd = totalVusd - v.pagadoUSD
              const pagada = saldoV <= 0.01 && saldoVusd <= 0.01
              const seleccionada = ventaSeleccionada == v.id
              return (
                <div key={v.id} onClick={() => { setVentaSeleccionada(String(v.id)); cargarDetalleVenta(v.id) }} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: '8px',
                  border: `2px solid ${seleccionada ? '#8B1E2D' : '#e5e7eb'}`,
                  background: seleccionada ? '#fdf2f4' : '#f9fafb',
                  cursor: 'pointer', flexWrap: 'wrap', gap: '8px', transition: '0.15s',
                }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>Venta #{v.id} — {new Date(v.fecha).toLocaleDateString('es-AR')}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                      {totalV > 0 && `Total: ${fmt(totalV)}`}
                      {totalVusd > 0 && ` · ${fmtUSD(totalVusd)}`}
                    </div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: pagada ? '#dcfce7' : '#fef2f2', color: pagada ? '#16a34a' : '#dc2626' }}>
                    {pagada ? '✅ Pagada' : saldoVusd > 0.01 ? `Saldo: ${fmtUSD(saldoVusd)}` : `Saldo: ${fmt(saldoV)}`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Detalle de venta seleccionada */}
      {detalleVenta.length > 0 && (
        <div style={card}>
          <div style={cardTitle}>📋 Detalle de venta #{ventaSeleccionada}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {detalleVenta.map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <span style={{ fontWeight: '500', color: '#1a1a1a' }}>
                  {d.numeros_serie?.productos?.producto || d.productos?.producto || '-'}
                  {d.numeros_serie?.numero_serie ? ` (${d.numeros_serie.numero_serie})` : ''}
                </span>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>
                  {d.precio_venta_pesos ? formatearPesos(d.precio_venta_pesos) : ''}
                  {d.precio_venta_usd ? fmtUSD(d.precio_venta_usd) : ''}
                </span>
              </div>
            ))}
          </div>

          {/* Saldos */}
          <div style={{ display: 'grid', gridTemplateColumns: totalPesos > 0 && totalUSD > 0 ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '16px' }}>
            {totalPesos > 0 && (
              <div style={{ padding: '14px', borderRadius: '10px', background: saldoPesos > 0.01 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${saldoPesos > 0.01 ? '#fecaca' : '#bbf7d0'}` }}>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px' }}>Pesos</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Total: {fmt(totalPesos)}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Pagado: {fmt(pagadoP)}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '4px', color: saldoPesos > 0.01 ? '#dc2626' : '#16a34a' }}>Saldo: {fmt(saldoPesos)}</div>
              </div>
            )}
            {totalUSD > 0 && (
              <div style={{ padding: '14px', borderRadius: '10px', background: saldoUSD > 0.01 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${saldoUSD > 0.01 ? '#fecaca' : '#bbf7d0'}` }}>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px' }}>USD</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Total: {fmtUSD(totalUSD)}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Pagado: {fmtUSD(pagadoU)}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '4px', color: saldoUSD > 0.01 ? '#dc2626' : '#16a34a' }}>Saldo: {fmtUSD(saldoUSD)}</div>
              </div>
            )}
          </div>

          {/* Pagos registrados */}
          {pagosVenta.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Pagos registrados ({pagosVenta.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {pagosVenta.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{p.formas_pago?.forma_pago}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {new Date(p.fecha_pago).toLocaleDateString('es-AR')}
                        {p.cotizacion_usada && p.monto_pesos && p.monto_equivalente_usd && (
                          <span style={{ marginLeft: '8px', color: '#9ca3af' }}>
                            {fmt(p.monto_pesos)} → {fmtUSD(p.monto_equivalente_usd)} (cotiz. {fmt(p.cotizacion_usada)})
                          </span>
                        )}
                        {p.cotizacion_usada && p.monto_usd && p.monto_equivalente_pesos && (
                          <span style={{ marginLeft: '8px', color: '#9ca3af' }}>
                            {fmtUSD(p.monto_usd)} → {fmt(p.monto_equivalente_pesos)} (cotiz. {fmt(p.cotizacion_usada)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: '700', color: '#16a34a' }}>
                        {p.monto_pesos ? fmt(p.monto_pesos) : fmtUSD(p.monto_usd)}
                      </span>
                      <button onClick={() => eliminarPago(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ef4444' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulario nuevo pago */}
          {!ventaSaldada && (
            <div style={{ paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>💳 Registrar nuevo pago</div>

              {pagoEnMonedaDistinta && (
                <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '13px', color: '#92400e', marginBottom: '12px' }}>
                  💱 Pago en moneda distinta a la venta.
                  {ventaEsUSD && Number(form.monto_pesos) > 0 && cotizacionManual && (
                    <span style={{ fontWeight: '600', marginLeft: '6px' }}>
                      {fmt(Number(form.monto_pesos))} = {fmtUSD(Number(form.monto_pesos) / Number(cotizacionManual))} (cotiz. {fmt(Number(cotizacionManual))})
                    </span>
                  )}
                  {ventaEsPesos && Number(form.monto_usd) > 0 && cotizacionManual && (
                    <span style={{ fontWeight: '600', marginLeft: '6px' }}>
                      {fmtUSD(Number(form.monto_usd))} = {fmt(Number(form.monto_usd) * Number(cotizacionManual))} (cotiz. {fmt(Number(cotizacionManual))})
                    </span>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Forma de pago</label>
                  <select name="forma_pago_id" value={form.forma_pago_id} onChange={handleChange} style={inputStyle}>
                    <option value="">Seleccionar</option>
                    {formasPago.map(f => <option key={f.id} value={f.id}>{f.forma_pago}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Monto en pesos</label>
                  <input name="monto_pesos" placeholder="$0" value={form.monto_pesos} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Monto en USD</label>
                  <input name="monto_usd" placeholder="USD 0" value={form.monto_usd} onChange={handleChange} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <button onClick={guardarPago} style={btnPrimario}>💾 Guardar pago</button>
              </div>
            </div>
          )}

          {ventaSaldada && (
            <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center', color: '#16a34a', fontWeight: '600' }}>
              ✅ Venta completamente pagada
            </div>
          )}
        </div>
      )}

    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '15px', fontFamily: "'Outfit', sans-serif", background: 'white', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', display: 'block' }
const card = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const cardTitle = { fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '14px' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnFantasma = { padding: '8px 16px', background: 'transparent', color: '#8B1E2D', border: '1px dashed #8B1E2D', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
