'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { fetchConToken } from '../../lib/fetchConToken'
import { usePermiso } from '../../lib/usePermisos'

const EFECTIVO_ID = 1

export default function Caja() {
  const hoy = new Date().toISOString().split('T')[0]
  const [desde, setDesde] = useState(hoy)
  const [hasta, setHasta] = useState(hoy)
  const [tab, setTab] = useState('efectivo')
  const [movimientos, setMovimientos] = useState([])
  const [pagosOtros, setPagosOtros] = useState([])
  const [cotizacion, setCotizacion] = useState(null)
  const [cargandoDolar, setCargandoDolar] = useState(false)
  const [dolarManual, setDolarManual] = useState('')
  const [formasPago, setFormasPago] = useState([])
  const [filtroFormaPago, setFiltroFormaPago] = useState('')
  const { verificando, permitido } = usePermiso('caja')

  const [form, setForm] = useState({ tipo: 'ingreso', concepto: '', monto_pesos: '', monto_usd: '' })
  const [formOtros, setFormOtros] = useState({ tipo: 'ingreso', concepto: '', monto_pesos: '', monto_usd: '', forma_pago_id: '' })

  const [editandoMovimiento, setEditandoMovimiento] = useState(null)
  const [formEditMovimiento, setFormEditMovimiento] = useState({ tipo: '', concepto: '', monto_pesos: '', monto_usd: '' })
  const [editandoPago, setEditandoPago] = useState(null)
  const [formEditPago, setFormEditPago] = useState({ monto_pesos: '', monto_usd: '', forma_pago_id: '' })

  useEffect(() => { cargarFormasPago() }, [])
  useEffect(() => { cargarMovimientos(); cargarPagosOtros(); cargarCotizacion() }, [desde, hasta])

  async function cargarFormasPago() {
    const res = await fetchConToken('/api/configuracion/formas-pago')
    const data = await res.json()
    setFormasPago(data.formas_pago || [])
  }

  async function cargarMovimientos() {
    const res = await fetchConToken(`/api/caja?desde=${desde}&hasta=${hasta}`)
    const data = await res.json()
    const manuales = (data.manuales || []).filter(m => !m.forma_pago_id || m.forma_pago_id === EFECTIVO_ID)
    const pagosEfectivo = (data.pagos || []).filter(p => p.forma_pago_id === EFECTIVO_ID)
    const pagosComoMovimientos = pagosEfectivo.map(p => ({
      id: `pago-${p.id}`, pago_id: p.id, tipo: 'ingreso', origen: 'pago',
      concepto: `Pago - ${p.ventas?.pacientes?.apellido_paciente || ''} ${p.ventas?.pacientes?.nombres_paciente || ''}`,
      monto_pesos: p.monto_pesos, monto_usd: p.monto_usd,
      created_at: p.fecha_pago, forma_pago_id: EFECTIVO_ID, ventas: p.ventas,
    }))
    const todos = [...pagosComoMovimientos, ...manuales].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    setMovimientos(todos)
  }

  async function cargarPagosOtros() {
    const res = await fetchConToken(`/api/caja?desde=${desde}&hasta=${hasta}`)
    const data = await res.json()
    const otrosPagos = (data.pagos || []).filter(p => p.forma_pago_id !== EFECTIVO_ID)
    const manualesOtros = (data.manuales || []).filter(m => m.forma_pago_id && m.forma_pago_id !== EFECTIVO_ID)
    setPagosOtros([...otrosPagos.map(p => ({ ...p, origen: 'pago' })), ...manualesOtros.map(m => ({ ...m, origen: 'manual' }))]
      .sort((a, b) => new Date(a.created_at || a.fecha_pago) - new Date(b.created_at || b.fecha_pago)))
  }

  async function cargarCotizacion() {
    const res = await fetchConToken(`/api/cotizacion`)
    const data = await res.json()
    setCotizacion(data.cotizacion || null)
  }

  async function guardarDolarManual() {
    const valor = Number(dolarManual)
    if (!valor) { alert('Ingresar valor del dólar'); return }
    await fetchConToken('/api/cotizacion', { method: 'POST', body: JSON.stringify({ valor, fecha: hasta }) })
    setCotizacion(valor); setDolarManual('')
    alert(`✅ Cotización guardada: $${valor}`)
  }

  async function buscarDolarAutomatico() {
    setCargandoDolar(true)
    try {
      const res = await fetchConToken('/api/cotizacion')
      const data = await res.json()
      if (data.cotizacion) { setCotizacion(data.cotizacion); alert(`✅ Cotización actualizada: $${data.cotizacion}`) }
    } catch (e) { alert('No se pudo obtener la cotización automáticamente') }
    setCargandoDolar(false)
  }

  async function guardarMovimiento() {
    if (!form.concepto) { alert('Ingresar concepto'); return }
    if (!form.monto_pesos && !form.monto_usd) { alert('Ingresar monto'); return }
    const res = await fetchConToken('/api/caja', {
      method: 'POST',
      body: JSON.stringify({ fecha: hasta, tipo: form.tipo, concepto: form.concepto, monto_pesos: form.monto_pesos ? Number(form.monto_pesos) : null, monto_usd: form.monto_usd ? Number(form.monto_usd) : null })
    })
    if (!res.ok) { const d = await res.json(); alert('Error: ' + d.error); return }
    setForm({ tipo: 'ingreso', concepto: '', monto_pesos: '', monto_usd: '' })
    cargarMovimientos()
  }

  async function guardarMovimientoOtros() {
    if (!formOtros.concepto) { alert('Ingresar concepto'); return }
    if (!formOtros.monto_pesos && !formOtros.monto_usd) { alert('Ingresar monto'); return }
    if (!formOtros.forma_pago_id) { alert('Seleccionar forma de pago'); return }
    const res = await fetchConToken('/api/caja', {
      method: 'POST',
      body: JSON.stringify({ fecha: hasta, tipo: formOtros.tipo, concepto: formOtros.concepto, monto_pesos: formOtros.monto_pesos ? Number(formOtros.monto_pesos) : null, monto_usd: formOtros.monto_usd ? Number(formOtros.monto_usd) : null, forma_pago_id: Number(formOtros.forma_pago_id) })
    })
    if (!res.ok) { const d = await res.json(); alert('Error: ' + d.error); return }
    setFormOtros({ tipo: 'ingreso', concepto: '', monto_pesos: '', monto_usd: '', forma_pago_id: '' })
    cargarPagosOtros()
  }

  async function eliminarMovimiento(id) {
    if (!confirm('¿Eliminar este movimiento?')) return
    await fetchConToken(`/api/caja/${id}`, { method: 'DELETE' })
    cargarMovimientos(); cargarPagosOtros()
  }

  function abrirEditarMovimiento(m) {
    setEditandoMovimiento(m)
    setFormEditMovimiento({ tipo: m.tipo, concepto: m.concepto, monto_pesos: m.monto_pesos || '', monto_usd: m.monto_usd || '' })
  }

  async function guardarEditMovimiento() {
    if (!formEditMovimiento.concepto) { alert('Ingresar concepto'); return }
    if (!formEditMovimiento.monto_pesos && !formEditMovimiento.monto_usd) { alert('Ingresar monto'); return }
    await fetchConToken(`/api/caja/${editandoMovimiento.id}`, {
      method: 'PUT',
      body: JSON.stringify({ tipo: formEditMovimiento.tipo, concepto: formEditMovimiento.concepto, monto_pesos: formEditMovimiento.monto_pesos ? Number(formEditMovimiento.monto_pesos) : null, monto_usd: formEditMovimiento.monto_usd ? Number(formEditMovimiento.monto_usd) : null })
    })
    setEditandoMovimiento(null); cargarMovimientos(); cargarPagosOtros()
  }

  function abrirEditarPago(p) {
    setEditandoPago(p)
    setFormEditPago({ monto_pesos: p.monto_pesos || '', monto_usd: p.monto_usd || '', forma_pago_id: String(p.forma_pago_id || EFECTIVO_ID) })
  }

  async function guardarEditPago() {
    if (!formEditPago.monto_pesos && !formEditPago.monto_usd) { alert('Ingresar monto'); return }
    const pagoId = editandoPago.pago_id || editandoPago.id
    await fetchConToken(`/api/pagos/${pagoId}`, {
      method: 'PUT',
      body: JSON.stringify({ monto_pesos: formEditPago.monto_pesos ? Number(formEditPago.monto_pesos) : null, monto_usd: formEditPago.monto_usd ? Number(formEditPago.monto_usd) : null, forma_pago_id: Number(formEditPago.forma_pago_id) })
    })
    setEditandoPago(null); cargarMovimientos(); cargarPagosOtros()
  }

  async function eliminarPago(p) {
    if (!confirm('¿Eliminar este pago?')) return
    const pagoId = p.pago_id || p.id
    await fetchConToken(`/api/pagos/${pagoId}`, { method: 'DELETE' })
    cargarMovimientos(); cargarPagosOtros()
  }

  const ingresosPesos = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + (Number(m.monto_pesos) || 0), 0)
  const egresosPesos = movimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + (Number(m.monto_pesos) || 0), 0)
  const saldoPesos = ingresosPesos - egresosPesos
  const ingresosUSD = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + (Number(m.monto_usd) || 0), 0)
  const egresosUSD = movimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + (Number(m.monto_usd) || 0), 0)
  const saldoUSD = ingresosUSD - egresosUSD
  const saldoUnificado = cotizacion ? saldoPesos + (saldoUSD * cotizacion) : null

  const pagosOtrosFiltrados = filtroFormaPago ? pagosOtros.filter(p => p.forma_pago_id == filtroFormaPago) : pagosOtros
  const formasPagoOtras = formasPago.filter(f => f.id !== EFECTIVO_ID)

  const otrosAgrupados = pagosOtrosFiltrados.reduce((acc, p) => {
    const nombre = p.formas_pago?.forma_pago || formasPago.find(f => f.id === p.forma_pago_id)?.forma_pago || 'Sin forma'
    if (!acc[nombre]) acc[nombre] = { ingresosPesos: 0, egresosPesos: 0, ingresosUSD: 0, egresosUSD: 0, items: [] }
    if (p.tipo === 'egreso') {
      acc[nombre].egresosPesos += Number(p.monto_pesos) || 0
      acc[nombre].egresosUSD += Number(p.monto_usd) || 0
    } else {
      acc[nombre].ingresosPesos += Number(p.monto_pesos) || 0
      acc[nombre].ingresosUSD += Number(p.monto_usd) || 0
    }
    acc[nombre].items.push(p)
    return acc
  }, {})

  const totalOtrosIngresosPesos = pagosOtrosFiltrados.filter(p => p.tipo !== 'egreso').reduce((acc, p) => acc + (Number(p.monto_pesos) || 0), 0)
  const totalOtrosEgresosPesos = pagosOtrosFiltrados.filter(p => p.tipo === 'egreso').reduce((acc, p) => acc + (Number(p.monto_pesos) || 0), 0)
  const totalOtrosIngresosUSD = pagosOtrosFiltrados.filter(p => p.tipo !== 'egreso').reduce((acc, p) => acc + (Number(p.monto_usd) || 0), 0)
  const totalOtrosEgresosUSD = pagosOtrosFiltrados.filter(p => p.tipo === 'egreso').reduce((acc, p) => acc + (Number(p.monto_usd) || 0), 0)

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
  const fmtUSD = (n) => `U$S ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (verificando || !permitido) return null

  return (
    <div style={{ maxWidth: '850px' }}>
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Caja</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Movimientos por período</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Desde</label><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ ...inputStyle, width: 'auto' }} /></div>
          <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Hasta</label><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ ...inputStyle, width: 'auto' }} /></div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={cardTitle}>💵 Cotización dólar Blue</div>
            {cotizacion ? <div style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a' }}>{fmt(cotizacion)} <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '400' }}>/ U$S 1</span></div> : <div style={{ fontSize: '14px', color: '#9ca3af' }}>Sin cotización</div>}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="number" placeholder="Cargar manual" value={dolarManual} onChange={(e) => setDolarManual(e.target.value)} style={{ ...inputStyle, width: '150px' }} />
            <button onClick={guardarDolarManual} style={btnSecundario}>💾 Guardar</button>
            <button onClick={buscarDolarAutomatico} disabled={cargandoDolar} style={{ ...btnSecundario, opacity: cargandoDolar ? 0.7 : 1 }}>{cargandoDolar ? 'Buscando...' : '🔄 Automático'}</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['efectivo', '💵 Efectivo'], ['otros', '💳 Otros Medios']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: tab === val ? '#8B1E2D' : 'white', color: tab === val ? 'white' : '#374151', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>{label}</button>
        ))}
      </div>

      {editandoMovimiento && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '16px' }}>✏️ Editar movimiento</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Field label="Tipo"><select value={formEditMovimiento.tipo} onChange={(e) => setFormEditMovimiento({ ...formEditMovimiento, tipo: e.target.value })} style={inputStyle}><option value="ingreso">💰 Ingreso</option><option value="egreso">💸 Egreso</option></select></Field>
              <Field label="Concepto"><input value={formEditMovimiento.concepto} onChange={(e) => setFormEditMovimiento({ ...formEditMovimiento, concepto: e.target.value })} style={inputStyle} /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="Monto pesos"><input type="number" value={formEditMovimiento.monto_pesos} onChange={(e) => setFormEditMovimiento({ ...formEditMovimiento, monto_pesos: e.target.value })} placeholder="$0" style={inputStyle} /></Field>
                <Field label="Monto USD"><input type="number" value={formEditMovimiento.monto_usd} onChange={(e) => setFormEditMovimiento({ ...formEditMovimiento, monto_usd: e.target.value })} placeholder="U$S 0" style={inputStyle} /></Field>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={guardarEditMovimiento} style={btnPrimario}>💾 Guardar</button>
              <button onClick={() => setEditandoMovimiento(null)} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {editandoPago && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '4px' }}>✏️ Editar pago</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>{editandoPago.concepto || `${editandoPago.ventas?.pacientes?.apellido_paciente || ''} ${editandoPago.ventas?.pacientes?.nombres_paciente || ''}`}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Field label="Forma de pago"><select value={formEditPago.forma_pago_id} onChange={(e) => setFormEditPago({ ...formEditPago, forma_pago_id: e.target.value })} style={inputStyle}>{formasPago.map(f => <option key={f.id} value={f.id}>{f.forma_pago}</option>)}</select></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="Monto pesos"><input type="number" value={formEditPago.monto_pesos} onChange={(e) => setFormEditPago({ ...formEditPago, monto_pesos: e.target.value })} placeholder="$0" style={inputStyle} /></Field>
                <Field label="Monto USD"><input type="number" value={formEditPago.monto_usd} onChange={(e) => setFormEditPago({ ...formEditPago, monto_usd: e.target.value })} placeholder="U$S 0" style={inputStyle} /></Field>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={guardarEditPago} style={btnPrimario}>💾 Guardar</button>
              <button onClick={() => setEditandoPago(null)} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'efectivo' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {[{ label: 'Caja en Pesos', ingresos: ingresosPesos, egresos: egresosPesos, saldo: saldoPesos, fmt: fmt }, { label: 'Caja en USD', ingresos: ingresosUSD, egresos: egresosUSD, saldo: saldoUSD, fmt: fmtUSD }].map(({ label, ingresos, egresos, saldo, fmt: f }) => (
              <div key={label} style={card}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>{label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}><span style={{ color: '#6b7280' }}>Ingresos</span><span style={{ color: '#16a34a', fontWeight: '600' }}>{f(ingresos)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '12px' }}><span style={{ color: '#6b7280' }}>Egresos</span><span style={{ color: '#dc2626', fontWeight: '600' }}>{f(egresos)}</span></div>
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: '700', fontSize: '15px' }}>Saldo</span><span style={{ fontWeight: '700', fontSize: '18px', color: saldo >= 0 ? '#16a34a' : '#dc2626' }}>{f(saldo)}</span></div>
              </div>
            ))}
          </div>
          {cotizacion && (
            <div style={{ ...card, background: '#1a1a1a', color: 'white', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total unificado en pesos (cotización {fmt(cotizacion)})</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: saldoUnificado >= 0 ? '#4ade80' : '#f87171' }}>{fmt(saldoUnificado)}</div>
              <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '4px' }}>{fmt(saldoPesos)} + {fmtUSD(saldoUSD)} × {fmt(cotizacion)}</div>
            </div>
          )}
          <div style={card}>
            <div style={cardTitle}>➕ Agregar movimiento</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Tipo"><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={inputStyle}><option value="ingreso">💰 Ingreso</option><option value="egreso">💸 Egreso</option></select></Field>
              <Field label="Concepto"><input placeholder="Descripción" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} style={inputStyle} /></Field>
              <Field label="Monto en pesos"><input type="number" placeholder="$0" value={form.monto_pesos} onChange={(e) => setForm({ ...form, monto_pesos: e.target.value })} style={inputStyle} /></Field>
              <Field label="Monto en USD"><input type="number" placeholder="U$S 0" value={form.monto_usd} onChange={(e) => setForm({ ...form, monto_usd: e.target.value })} style={inputStyle} /></Field>
            </div>
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
              <button onClick={guardarMovimiento} style={btnPrimario}>💾 Guardar</button>
            </div>
          </div>
          <div style={card}>
            <div style={cardTitle}>📋 Movimientos <span style={{ fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>({movimientos.length} registros)</span></div>
            {movimientos.length === 0 ? <div style={{ color: '#9ca3af', fontSize: '14px', padding: '16px 0', textAlign: 'center' }}>No hay movimientos para el período</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {movimientos.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: m.tipo === 'ingreso' ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', border: `1px solid ${m.tipo === 'ingreso' ? '#bbf7d0' : '#fecaca'}`, flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>{m.concepto}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{m.origen === 'pago' ? '🔗 Pago de venta' : '✏️ Manual'} · {new Date(m.created_at).toLocaleDateString('es-AR')} {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ textAlign: 'right' }}>
                        {m.monto_pesos && <div style={{ fontWeight: '700', fontSize: '15px', color: m.tipo === 'ingreso' ? '#16a34a' : '#dc2626' }}>{m.tipo === 'egreso' ? '-' : ''}{fmt(m.monto_pesos)}</div>}
                        {m.monto_usd && <div style={{ fontWeight: '700', fontSize: '15px', color: m.tipo === 'ingreso' ? '#16a34a' : '#dc2626' }}>{m.tipo === 'egreso' ? '-' : ''}{fmtUSD(m.monto_usd)}</div>}
                      </div>
                      {m.origen === 'pago' ? (
                        <><button onClick={() => abrirEditarPago(m)} style={btnIcono}>✏️</button><button onClick={() => eliminarPago(m)} style={{ ...btnIcono, color: '#ef4444' }}>✕</button></>
                      ) : (
                        <><button onClick={() => abrirEditarMovimiento(m)} style={btnIcono}>✏️</button><button onClick={() => eliminarMovimiento(m.id)} style={{ ...btnIcono, color: '#ef4444' }}>✕</button></>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'otros' && (
        <>
          <div style={{ ...card, padding: '14px 20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Filtrar por medio:</label>
              <select value={filtroFormaPago} onChange={(e) => setFiltroFormaPago(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: '200px' }}>
                <option value="">Todos los medios</option>
                {formasPagoOtras.map(f => <option key={f.id} value={f.id}>{f.forma_pago}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'Ingresos Pesos', valor: totalOtrosIngresosPesos, fmt: fmt, color: '#16a34a' },
              { label: 'Egresos Pesos', valor: totalOtrosEgresosPesos, fmt: fmt, color: '#dc2626' },
              { label: 'Ingresos USD', valor: totalOtrosIngresosUSD, fmt: fmtUSD, color: '#16a34a' },
              { label: 'Egresos USD', valor: totalOtrosEgresosUSD, fmt: fmtUSD, color: '#dc2626' },
            ].filter(item => item.valor > 0).map(({ label, valor, fmt: f, color }) => (
              <div key={label} style={{ ...statCard, borderLeft: `4px solid ${color}` }}>
                <div style={statLabel}>{label}</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color }}>{f(valor)}</div>
              </div>
            ))}
          </div>

          {Object.keys(otrosAgrupados).length > 0 && Object.entries(otrosAgrupados).map(([nombre, datos]) => (
            <div key={nombre} style={{ ...card, marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={cardTitle}>{nombre}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  {datos.ingresosPesos > 0 && <span style={{ color: '#16a34a', fontWeight: '600', marginRight: '10px' }}>↑ {fmt(datos.ingresosPesos)}</span>}
                  {datos.egresosPesos > 0 && <span style={{ color: '#dc2626', fontWeight: '600', marginRight: '10px' }}>↓ {fmt(datos.egresosPesos)}</span>}
                  {datos.ingresosUSD > 0 && <span style={{ color: '#16a34a', fontWeight: '600', marginRight: '10px' }}>↑ {fmtUSD(datos.ingresosUSD)}</span>}
                  {datos.egresosUSD > 0 && <span style={{ color: '#dc2626', fontWeight: '600' }}>↓ {fmtUSD(datos.egresosUSD)}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {datos.items.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: p.tipo === 'egreso' ? '#fef2f2' : '#f0fdf4', borderRadius: '8px', border: `1px solid ${p.tipo === 'egreso' ? '#fecaca' : '#bbf7d0'}`, flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>
                        {p.origen === 'manual' ? p.concepto : `${p.ventas?.pacientes?.apellido_paciente || ''} ${p.ventas?.pacientes?.nombres_paciente || ''}`}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {p.origen === 'pago' ? '🔗 Pago de venta' : `✏️ Manual · ${p.tipo === 'egreso' ? 'Egreso' : 'Ingreso'}`} · {new Date(p.fecha_pago || p.created_at).toLocaleDateString('es-AR')} {new Date(p.fecha_pago || p.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: p.tipo === 'egreso' ? '#dc2626' : '#16a34a' }}>
                        {p.tipo === 'egreso' ? '-' : ''}{p.monto_pesos ? fmt(p.monto_pesos) : fmtUSD(p.monto_usd)}
                      </div>
                      {p.origen === 'pago' ? (
                        <><button onClick={() => abrirEditarPago(p)} style={btnIcono}>✏️</button><button onClick={() => eliminarPago(p)} style={{ ...btnIcono, color: '#ef4444' }}>✕</button></>
                      ) : (
                        <><button onClick={() => abrirEditarMovimiento(p)} style={btnIcono}>✏️</button><button onClick={() => eliminarMovimiento(p.id)} style={{ ...btnIcono, color: '#ef4444' }}>✕</button></>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(otrosAgrupados).length === 0 && (
            <div style={card}><div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay movimientos para el período</div></div>
          )}

          <div style={card}>
            <div style={cardTitle}>➕ Agregar movimiento manual</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Tipo"><select value={formOtros.tipo} onChange={(e) => setFormOtros({ ...formOtros, tipo: e.target.value })} style={inputStyle}><option value="ingreso">💰 Ingreso</option><option value="egreso">💸 Egreso</option></select></Field>
              <Field label="Forma de pago *"><select value={formOtros.forma_pago_id} onChange={(e) => setFormOtros({ ...formOtros, forma_pago_id: e.target.value })} style={inputStyle}><option value="">Seleccionar medio</option>{formasPagoOtras.map(f => <option key={f.id} value={f.id}>{f.forma_pago}</option>)}</select></Field>
              <Field label="Concepto"><input placeholder="Descripción" value={formOtros.concepto} onChange={(e) => setFormOtros({ ...formOtros, concepto: e.target.value })} style={inputStyle} /></Field>
              <Field label="Monto en pesos"><input type="number" placeholder="$0" value={formOtros.monto_pesos} onChange={(e) => setFormOtros({ ...formOtros, monto_pesos: e.target.value })} style={inputStyle} /></Field>
              <Field label="Monto en USD"><input type="number" placeholder="U$S 0" value={formOtros.monto_usd} onChange={(e) => setFormOtros({ ...formOtros, monto_usd: e.target.value })} style={inputStyle} /></Field>
            </div>
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
              <button onClick={guardarMovimientoOtros} style={btnPrimario}>💾 Guardar</button>
            </div>
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
const statLabel = { fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnIcono = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', color: '#6b7280', padding: '4px' }
const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modalBox = { background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }
