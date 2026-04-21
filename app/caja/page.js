'use client'

export const dynamic = 'force-dynamic'

import { getUsuarioId } from '../../lib/getUsuario'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Caja() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [movimientos, setMovimientos] = useState([])
  const [cotizacion, setCotizacion] = useState(null)
  const [cargandoDolar, setCargandoDolar] = useState(false)
  const [usuario, setUsuario] = useState(null)

  const [form, setForm] = useState({
    tipo: 'ingreso',
    concepto: '',
    monto_pesos: '',
    monto_usd: '',
  })

  useEffect(() => {
    const stored = localStorage.getItem('usuario')
    if (stored) setUsuario(JSON.parse(stored))
  }, [])

  useEffect(() => {
    if (fecha) {
      cargarMovimientos()
      cargarCotizacion()
    }
  }, [fecha])

  async function cargarMovimientos() {
    // Movimientos manuales de caja
    const { data: manuales } = await supabase
      .from('caja_movimientos')
      .select('*')
      .eq('fecha', fecha)
      .order('created_at')

    // Pagos del día
    const fechaInicio = `${fecha}T00:00:00`
    const fechaFin = `${fecha}T23:59:59`

    const { data: pagos } = await supabase
      .from('pagos')
      .select(`
        id, monto_pesos, monto_usd, fecha_pago, forma_pago_id,
        formas_pago (forma_pago),
        ventas (
          pacientes (apellido_paciente, nombres_paciente)
        )
      `)
      .gte('fecha_pago', fechaInicio)
      .lte('fecha_pago', fechaFin)
      .order('fecha_pago')

    // Convertir pagos a formato movimiento
    const pagosComoMovimientos = (pagos || []).map(p => ({
      id: `pago-${p.id}`,
      tipo: 'ingreso',
      origen: 'pago',
      concepto: `Pago - ${p.ventas?.pacientes?.apellido_paciente || ''} ${p.ventas?.pacientes?.nombres_paciente || ''} (${p.formas_pago?.forma_pago || ''})`,
      monto_pesos: p.monto_pesos,
      monto_usd: p.monto_usd,
      created_at: p.fecha_pago,
    }))

    // Combinar y ordenar
    const todos = [...pagosComoMovimientos, ...(manuales || [])]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    setMovimientos(todos)
  }

  async function cargarCotizacion() {
    const { data } = await supabase
      .from('valor_dolar_bna')
      .select('*')
      .eq('fecha', fecha)
      .maybeSingle()

    if (data) {
      setCotizacion(data.dolar_vendedor)
    } else {
      setCotizacion(null)
    }
  }

  async function buscarDolarAutomatico() {
    setCargandoDolar(true)
    try {
      const res = await fetch('https://dolarapi.com/v1/dolares/oficial')
      const data = await res.json()
      const valor = data.venta

      if (valor) {
        // Guardar en tabla
        const { data: existe } = await supabase
          .from('valor_dolar_bna')
          .select('id')
          .eq('fecha', fecha)
          .maybeSingle()

        if (existe) {
          await supabase.from('valor_dolar_bna').update({ dolar_vendedor: valor }).eq('fecha', fecha)
        } else {
          await supabase.from('valor_dolar_bna').insert([{
            fecha: fecha,
            dolar_vendedor: valor,
            creado_por: getUsuarioId(),
          }])
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
    if (!form.monto_pesos && !form.monto_usd) { alert('Ingresar monto en pesos o USD'); return }

    const { error } = await supabase.from('caja_movimientos').insert([{
      fecha: fecha,
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

  // Cálculos
  const ingresosPesos = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + (Number(m.monto_pesos) || 0), 0)
  const egresosPesos = movimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + (Number(m.monto_pesos) || 0), 0)
  const saldoPesos = ingresosPesos - egresosPesos

  const ingresosUSD = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + (Number(m.monto_usd) || 0), 0)
  const egresosUSD = movimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + (Number(m.monto_usd) || 0), 0)
  const saldoUSD = ingresosUSD - egresosUSD

  // Unificado en pesos
  const saldoUnificado = cotizacion
    ? saldoPesos + (saldoUSD * cotizacion)
    : null

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
  const fmtUSD = (n) => `U$S ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div style={{ maxWidth: '850px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Caja</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Movimientos diarios</p>
        </div>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={{ ...inputStyle, width: 'auto' }}
        />
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
      id="dolarManual"
      style={{ ...inputStyle, width: '150px' }}
    />
    <button onClick={async () => {
      const valor = Number(document.getElementById('dolarManual').value)
      if (!valor) { alert('Ingresar valor del dólar'); return }
      const { data: existe } = await supabase.from('valor_dolar_bna').select('id').eq('fecha', fecha).maybeSingle()
      if (existe) {
        await supabase.from('valor_dolar_bna').update({ dolar_vendedor: valor }).eq('fecha', fecha)
      } else {
        await supabase.from('valor_dolar_bna').insert([{ fecha, dolar_vendedor: valor, creado_por: getUsuarioId() }])
      }
      setCotizacion(valor)
      document.getElementById('dolarManual').value = ''
      alert(`✅ Cotización guardada: $${valor}`)
    }} style={btnSecundario}>
      💾 Guardar
    </button>
    <button onClick={buscarDolarAutomatico} disabled={cargandoDolar} style={{ ...btnSecundario, opacity: cargandoDolar ? 0.7 : 1 }}>
      {cargandoDolar ? 'Buscando...' : '🔄 Automático'}
    </button>
  </div>
</div>
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>

        {/* Caja pesos */}
        <div style={card}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Caja en Pesos
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>Ingresos</span>
              <span style={{ color: '#16a34a', fontWeight: '600' }}>{fmt(ingresosPesos)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>Egresos</span>
              <span style={{ color: '#dc2626', fontWeight: '600' }}>{fmt(egresosPesos)}</span>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: '700', fontSize: '15px' }}>Saldo</span>
            <span style={{ fontWeight: '700', fontSize: '18px', color: saldoPesos >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(saldoPesos)}</span>
          </div>
        </div>

        {/* Caja USD */}
        <div style={card}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Caja en USD
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>Ingresos</span>
              <span style={{ color: '#16a34a', fontWeight: '600' }}>{fmtUSD(ingresosUSD)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>Egresos</span>
              <span style={{ color: '#dc2626', fontWeight: '600' }}>{fmtUSD(egresosUSD)}</span>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: '700', fontSize: '15px' }}>Saldo</span>
            <span style={{ fontWeight: '700', fontSize: '18px', color: saldoUSD >= 0 ? '#16a34a' : '#dc2626' }}>{fmtUSD(saldoUSD)}</span>
          </div>
        </div>

      </div>

      {/* Total unificado */}
      {cotizacion && (
        <div style={{ ...card, background: '#1a1a1a', color: 'white', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Total unificado en pesos (cotización {fmt(cotizacion)})
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: saldoUnificado >= 0 ? '#4ade80' : '#f87171' }}>
            {fmt(saldoUnificado)}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '4px' }}>
            {fmt(saldoPesos)} + {fmtUSD(saldoUSD)} × {fmt(cotizacion)}
          </div>
        </div>
      )}

      {/* Agregar movimiento */}
      <div style={card}>
        <div style={cardTitle}>➕ Agregar movimiento</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

          <Field label="Tipo">
            <select name="tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
              <option value="ingreso">💰 Ingreso</option>
              <option value="egreso">💸 Egreso</option>
            </select>
          </Field>

          <Field label="Concepto">
            <input name="concepto" placeholder="Descripción del movimiento" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} style={inputStyle} />
          </Field>

          <Field label="Monto en pesos">
            <input name="monto_pesos" type="number" placeholder="$0" value={form.monto_pesos} onChange={(e) => setForm({ ...form, monto_pesos: e.target.value })} style={inputStyle} />
          </Field>

          <Field label="Monto en USD">
            <input name="monto_usd" type="number" placeholder="U$S 0" value={form.monto_usd} onChange={(e) => setForm({ ...form, monto_usd: e.target.value })} style={inputStyle} />
          </Field>

        </div>
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
          <button onClick={guardarMovimiento} style={btnPrimario}>💾 Guardar</button>
        </div>
      </div>

      {/* Lista de movimientos */}
      <div style={card}>
        <div style={cardTitle}>
          📋 Movimientos del día
          <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>
            ({movimientos.length} registros)
          </span>
        </div>

        {movimientos.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: '14px', padding: '16px 0', textAlign: 'center' }}>
            No hay movimientos para esta fecha
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {movimientos.map(m => (
              <div key={m.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: m.tipo === 'ingreso' ? '#f0fdf4' : '#fef2f2',
                borderRadius: '8px',
                border: `1px solid ${m.tipo === 'ingreso' ? '#bbf7d0' : '#fecaca'}`,
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>
                    {m.concepto}
                  </div>
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
                    <button onClick={() => eliminarMovimiento(m.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ef4444'
                    }}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  fontSize: '15px',
  fontFamily: "'Outfit', sans-serif",
  background: 'white',
  color: '#1a1a1a',
  outline: 'none',
  boxSizing: 'border-box',
}

const card = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '20px 24px',
  marginBottom: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const cardTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '16px',
}

const btnPrimario = {
  padding: '10px 20px',
  background: '#8B1E2D',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600',
  cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
}

const btnSecundario = {
  padding: '10px 20px',
  background: 'white',
  color: '#374151',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
}
