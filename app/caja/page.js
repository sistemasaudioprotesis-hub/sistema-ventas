'use client'

export const dynamic = 'force-dynamic'

import { getUsuarioId } from '../../lib/getUsuario'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const EFECTIVO_ID = 1 // id de la forma de pago EFECTIVO

export default function Caja() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [tab, setTab] = useState('efectivo')
  const [movimientos, setMovimientos] = useState([])
  const [pagosOtros, setPagosOtros] = useState([])
  const [cotizacion, setCotizacion] = useState(null)
  const [cargandoDolar, setCargandoDolar] = useState(false)
  const [dolarManual, setDolarManual] = useState('')

  const [form, setForm] = useState({
    tipo: 'ingreso',
    concepto: '',
    monto_pesos: '',
    monto_usd: '',
  })

  useEffect(() => {
    if (fecha) {
      cargarMovimientos()
      cargarPagosOtros()
      cargarCotizacion()
    }
  }, [fecha])

  async function cargarMovimientos() {
    const { data: manuales } = await supabase
      .from('caja_movimientos')
      .select('*')
      .eq('fecha', fecha)
      .order('created_at')

    const fechaInicio = `${fecha}T00:00:00`
    const fechaFin = `${fecha}T23:59:59`

    const { data: pagos } = await supabase
      .from('pagos')
      .select(`
        id, monto_pesos, monto_usd, fecha_pago,
        formas_pago (forma_pago),
        ventas (pacientes (apellido_paciente, nombres_paciente))
      `)
      .eq('forma_pago_id', EFECTIVO_ID)
      .gte('fecha_pago', fechaInicio)
      .lte('fecha_pago', fechaFin)
      .order('fecha_pago')

    const pagosComoMovimientos = (pagos || []).map(p => ({
      id: `pago-${p.id}`,
      tipo: 'ingreso',
      origen: 'pago',
      concepto: `Pago - ${p.ventas?.pacientes?.apellido_paciente || ''} ${p.ventas?.pacientes?.nombres_paciente || ''}`,
      monto_pesos: p.monto_pesos,
      monto_usd: p.monto_usd,
      created_at: p.fecha_pago,
    }))

    const todos = [...pagosComoMovimientos, ...(manuales || [])]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    setMovimientos(todos)
  }

  async function cargarPagosOtros() {
    const fechaInicio = `${fecha}T00:00:00`
    const fechaFin = `${fecha}T23:59:59`

    const { data } = await supabase
      .from('pagos')
      .select(`
        id, monto_pesos, monto_usd, fecha_pago, forma_pago_id,
        formas_pago (forma_pago),
        ventas (pacientes (apellido_paciente, nombres_paciente))
      `)
      .neq('forma_pago_id', EFECTIVO_ID)
      .gte('fecha_pago', fechaInicio)
      .lte('fecha_pago', fechaFin)
      .order('fecha_pago')

    setPagosOtros(data || [])
  }

  async function cargarCotizacion() {
    const { data } = await supabase
      .from('valor_dolar_bna')
      .select('*')
      .eq('fecha', fecha)
      .maybeSingle()
    setCotizacion(data?.dolar_vendedor || null)
  }

  async function guardarDolarManual() {
    const valor = Number(dolarManual)
    if (!valor) { alert('Ingresar valor del dólar'); return }
    const { data: existe } = await supabase.from('valor_dolar_bna').select('id').eq('fecha', fecha).maybeSingle()
    if (existe) {
      await supabase.from('valor_dolar_bna').update({ dolar_vendedor: valor }).eq('fecha', fecha)
    } else {
      await supabase.from('valor_dolar_bna').insert([{ fecha, dolar_vendedor: valor, creado_por: getUsuarioId() }])
    }
    setCotizacion(valor)
    setDolarManual('')
    alert(`✅ Cotización guardada: $${valor}`)
  }

  async function buscarDolarAutomatico() {
    setCargandoDolar(true)
    try {
      const res = await fetch('https://dolarapi.com/v1/dolares/oficial')
      const data = await res.json()
      const valor = data.venta
      if (valor) {
        const { data: existe } = await supabase.from('valor_dolar_bna').select('id').eq('fecha', fecha).maybeSingle()
        if (existe) {
          await supabase.from('valor_dolar_bna').update({ dolar_vendedor: valor }).eq('fecha', fecha)
        } else {
          await supabase.from('valor_dolar_bna').insert([{ fecha, dolar_vendedor: valor, creado_por: getUsuarioId() }])
        }
        setCotizacion(valor)
        alert(`✅ Cotización actualizada: $${valor}`)
      }
    } catch (e) {
      alert('No se pudo obtener la cotización automáticamente')
    }
    setCargandoDolar(false)
  }

  async function guardarMovimiento() {
    if (!form.concepto) { alert('Ingresar concepto'); return }
    if (!form.monto_pesos && !form.monto_usd) { alert('Ingresar monto'); return }
    const { error } = await supabase.from('caja_movimientos').insert([{
      fecha,
      tipo: form.tipo,
      origen: 'manual',
      concepto: form.concepto,
      monto_pesos: form.monto_pesos ? Number(form.monto_pesos) : null,
      monto_usd: form.monto_usd ? Number(form.monto_usd) : null,
      creado_por: getUsuarioId(),
    }])
    if (error) { alert('Error: ' + error.message); return }
    setForm({ tipo: 'ingreso', concepto: '', monto_pesos: '', monto_usd: '' })
    cargarMovimientos()
  }

  async function eliminarMovimiento(id) {
    if (!confirm('¿Eliminar este movimiento?')) return
    await supabase.from('caja_movimientos').delete().eq('id', id)
    cargarMovimientos()
  }

  // Cálculos efectivo
  const ingresosPesos = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + (Number(m.monto_pesos) || 0), 0)
  const egresosPesos = movimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + (Number(m.monto_pesos) || 0), 0)
  const saldoPesos = ingresosPesos - egresosPesos
  const ingresosUSD = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + (Number(m.monto_usd) || 0), 0)
  const egresosUSD = movimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + (Number(m.monto_usd) || 0), 0)
  const saldoUSD = ingresosUSD - egresosUSD
  const saldoUnificado = cotizacion ? saldoPesos + (saldoUSD * cotizacion) : null

  // Agrupar otros medios por forma de pago
  const otrosAgrupados = pagosOtros.reduce((acc, p) => {
    const nombre = p.formas_pago?.forma_pago || 'Sin forma'
    if (!acc[nombre]) acc[nombre] = { pesos: 0, usd: 0, pagos: [] }
    acc[nombre].pesos += Number(p.monto_pesos) || 0
    acc[nombre].usd += Number(p.monto_usd) || 0
    acc[nombre].pagos.push(p)
    return acc
  }, {})

  const totalOtrosPesos = pagosOtros.reduce((acc, p) => acc + (Number(p.monto_pesos) || 0), 0)
  const totalOtrosUSD = pagosOtros.reduce((acc, p) => acc + (Number(p.monto_usd) || 0), 0)

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
  const fmtUSD = (n) => `U$S ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div style={{ maxWidth: '850px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Caja</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Movimientos diarios</p>
        </div>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
      </div>

      {/* Cotización dólar */}
      <div style={{ ...card, marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={cardTitle}>💵 Cotización dólar BNA</div>
            {cotizacion ? (
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a' }}>
                {fmt(cotizacion)} <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '400' }}>/ U$S 1</span>
              </div>
            ) : (
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>Sin cotización para esta fecha</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="number"
              placeholder="Cargar manual"
              value={dolarManual}
              onChange={(e) => setDolarManual(e.target.value)}
              style={{ ...inputStyle, width: '150px' }}
            />
            <button onClick={guardarDolarManual} style={btnSecundario}>💾 Guardar</button>
            <button onClick={buscarDolarAutomatico} disabled={cargandoDolar} style={{ ...btnSecundario, opacity: cargandoDolar ? 0.7 : 1 }}>
              {cargandoDolar ? 'Buscando...' : '🔄 Automático'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['efectivo', '💵 Efectivo'], ['otros', '💳 Otros Medios']].map(([val, label]) => (
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

      {/* TAB EFECTIVO */}
      {tab === 'efectivo' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <div style={card}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Caja en Pesos</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                <span style={{ color: '#6b7280' }}>Ingresos</span>
                <span style={{ color: '#16a34a', fontWeight: '600' }}>{fmt(ingresosPesos)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '12px' }}>
                <span style={{ color: '#6b7280' }}>Egresos</span>
                <span style={{ color: '#dc2626', fontWeight: '600' }}>{fmt(egresosPesos)}</span>
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '700', fontSize: '15px' }}>Saldo</span>
                <span style={{ fontWeight: '700', fontSize: '18px', color: saldoPesos >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(saldoPesos)}</span>
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Caja en USD</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                <span style={{ color: '#6b7280' }}>Ingresos</span>
                <span style={{ color: '#16a34a', fontWeight: '600' }}>{fmtUSD(ingresosUSD)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '12px' }}>
                <span style={{ color: '#6b7280' }}>Egresos</span>
                <span style={{ color: '#dc2626', fontWeight: '600' }}>{fmtUSD(egresosUSD)}</span>
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '700', fontSize: '15px' }}>Saldo</span>
                <span style={{ fontWeight: '700', fontSize: '18px', color: saldoUSD >= 0 ? '#16a34a' : '#dc2626' }}>{fmtUSD(saldoUSD)}</span>
              </div>
            </div>
          </div>

          {cotizacion && (
            <div style={{ ...card, background: '#1a1a1a', color: 'white', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                Total unificado en pesos (cotización {fmt(cotizacion)})
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: saldoUnificado >= 0 ? '#4ade80' : '#f87171' }}>{fmt(saldoUnificado)}</div>
              <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '4px' }}>{fmt(saldoPesos)} + {fmtUSD(saldoUSD)} × {fmt(cotizacion)}</div>
            </div>
          )}

          <div style={card}>
            <div style={cardTitle}>➕ Agregar movimiento</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Tipo">
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                  <option value="ingreso">💰 Ingreso</option>
                  <option value="egreso">💸 Egreso</option>
                </select>
              </Field>
              <Field label="Concepto">
                <input placeholder="Descripción" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="Monto en pesos">
                <input type="number" placeholder="$0" value={form.monto_pesos} onChange={(e) => setForm({ ...form, monto_pesos: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="Monto en USD">
                <input type="number" placeholder="U$S 0" value={form.monto_usd} onChange={(e) => setForm({ ...form, monto_usd: e.target.value })} style={inputStyle} />
              </Field>
            </div>
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
              <button onClick={guardarMovimiento} style={btnPrimario}>💾 Guardar</button>
            </div>
          </div>

          <div style={card}>
            <div style={cardTitle}>
              📋 Movimientos del día
              <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>({movimientos.length} registros)</span>
            </div>
            {movimientos.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', padding: '16px 0', textAlign: 'center' }}>No hay movimientos para esta fecha</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {movimientos.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px',
                    background: m.tipo === 'ingreso' ? '#f0fdf4' : '#fef2f2',
                    borderRadius: '8px',
                    border: `1px solid ${m.tipo === 'ingreso' ? '#bbf7d0' : '#fecaca'}`,
                    flexWrap: 'wrap', gap: '8px',
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>{m.concepto}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {m.origen === 'pago' ? '🔗 Pago de venta' : '✏️ Manual'} · {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        {m.monto_pesos && <div style={{ fontWeight: '700', fontSize: '15px', color: m.tipo === 'ingreso' ? '#16a34a' : '#dc2626' }}>{m.tipo === 'egreso' ? '-' : ''}{fmt(m.monto_pesos)}</div>}
                        {m.monto_usd && <div style={{ fontWeight: '700', fontSize: '15px', color: m.tipo === 'ingreso' ? '#16a34a' : '#dc2626' }}>{m.tipo === 'egreso' ? '-' : ''}{fmtUSD(m.monto_usd)}</div>}
                      </div>
                      {m.origen === 'manual' && (
                        <button onClick={() => eliminarMovimiento(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ef4444' }}>✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB OTROS MEDIOS */}
      {tab === 'otros' && (
        <>
          {Object.keys(otrosAgrupados).length > 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                {Object.entries(otrosAgrupados).map(([nombre, datos]) => (
                  <div key={nombre} style={{ ...statCard, borderLeft: '4px solid #8B1E2D' }}>
                    <div style={statLabel}>{nombre}</div>
                    {datos.pesos > 0 && <div style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a' }}>{fmt(datos.pesos)}</div>}
                    {datos.usd > 0 && <div style={{ fontSize: '18px', fontWeight: '700', color: '#2563eb' }}>{fmtUSD(datos.usd)}</div>}
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{datos.pagos.length} pago{datos.pagos.length !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...card, background: '#1a1a1a', color: 'white', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total otros medios</div>
                {totalOtrosPesos > 0 && <div style={{ fontSize: '24px', fontWeight: '700', color: '#4ade80' }}>{fmt(totalOtrosPesos)}</div>}
                {totalOtrosUSD > 0 && <div style={{ fontSize: '24px', fontWeight: '700', color: '#60a5fa' }}>{fmtUSD(totalOtrosUSD)}</div>}
              </div>

              {Object.entries(otrosAgrupados).map(([nombre, datos]) => (
                <div key={nombre} style={card}>
                  <div style={cardTitle}>{nombre}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {datos.pagos.map(p => (
                      <div key={p.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', background: '#f0fdf4',
                        borderRadius: '8px', border: '1px solid #bbf7d0',
                        flexWrap: 'wrap', gap: '8px',
                      }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>
                            {p.ventas?.pacientes?.apellido_paciente} {p.ventas?.pacientes?.nombres_paciente}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                            {new Date(p.fecha_pago).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#16a34a' }}>
                          {p.monto_pesos ? fmt(p.monto_pesos) : fmtUSD(p.monto_usd)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={card}>
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                No hay pagos por otros medios para esta fecha
              </div>
            </div>
          )}
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

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
  fontSize: '15px', fontFamily: "'Outfit', sans-serif", background: 'white',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}

const card = {
  background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px',
  padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const cardTitle = {
  fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '16px',
}

const statCard = {
  background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px',
  padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const statLabel = {
  fontSize: '12px', fontWeight: '600', color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
}

const btnPrimario = {
  padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
}

const btnSecundario = {
  padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb',
  borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
}
