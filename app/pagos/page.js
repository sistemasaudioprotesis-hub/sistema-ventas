'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { formatearPesos } from '../../lib/format'

export default function Pagos() {
  const searchParams = useSearchParams()
  const router = useRouter()

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
  const [totalPesos, setTotalPesos] = useState(0)
  const [totalUSD, setTotalUSD] = useState(0)
  const [pagadoPesos, setPagadoPesos] = useState(0)
  const [pagadoUSD, setPagadoUSD] = useState(0)

  const [form, setForm] = useState({
    forma_pago_id: '',
    monto_pesos: '',
    monto_usd: '',
  })

  useEffect(() => {
    obtenerFormasPago()
    if (dniParam) buscarPacienteAutomatico(dniParam)
  }, [])

  useEffect(() => {
    if (ventaIdParam) {
      setVentaSeleccionada(ventaIdParam)
      cargarDetalleVenta(ventaIdParam)
    }
  }, [ventaIdParam])

  async function obtenerFormasPago() {
    const { data } = await supabase.from('formas_pago').select('*').order('forma_pago')
    setFormasPago(data || [])
  }

  async function buscarPacienteAutomatico(dniValor) {
    const { data } = await supabase.from('pacientes').select('*').eq('dni', dniValor).maybeSingle()
    if (data) {
      setPaciente(data)
      const { data: ventasData } = await supabase.from('ventas').select('*').eq('paciente_id', data.id).order('fecha', { ascending: false })
      setVentas(ventasData || [])
    }
  }

  async function buscarPaciente() {
    const valor = busqueda.trim()
    if (!valor) { alert('Ingresar DNI o apellido'); return }

    let query = supabase.from('pacientes').select('*')
    if (/^\d+$/.test(valor)) {
      query = query.eq('dni', Number(valor))
    } else {
      query = query.ilike('apellido_paciente', `%${valor}%`)
    }

    const { data, error } = await query.order('apellido_paciente')
    if (error) { alert('Error buscando pacientes'); return }
    if (!data || data.length === 0) { alert('No se encontraron resultados'); setResultados([]); return }
    setResultados(data)
  }

  async function cargarDetalleVenta(ventaId) {
    const { data: detalle } = await supabase
      .from('venta_detalle')
      .select(`*, numeros_serie (numero_serie, productos (producto)), productos (producto)`)
      .eq('venta_id', ventaId)

    setDetalleVenta(detalle || [])

    const totalPesosCalc = (detalle || []).reduce((acc, d) => acc + (Number(d.precio_venta_pesos) || 0), 0)
    const totalUSDCalc = (detalle || []).reduce((acc, d) => acc + (Number(d.precio_venta_usd) || 0), 0)
    setTotalPesos(totalPesosCalc)
    setTotalUSD(totalUSDCalc)

    const { data: pagos } = await supabase.from('pagos').select('*').eq('venta_id', ventaId)
    setPagadoPesos((pagos || []).reduce((acc, p) => acc + (Number(p.monto_pesos) || 0), 0))
    setPagadoUSD((pagos || []).reduce((acc, p) => acc + (Number(p.monto_usd) || 0), 0))
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function guardarPago() {
    if (!ventaSeleccionada) { alert('Seleccionar venta'); return }

    const montoPesos = Number(form.monto_pesos) || 0
    const montoUsd = Number(form.monto_usd) || 0

    if (!montoPesos && !montoUsd) { alert('Debe ingresar monto en pesos o USD'); return }
    if (montoPesos && montoUsd) { alert('No se puede cargar pago en ambas monedas'); return }
    if (!form.forma_pago_id) { alert('Seleccionar forma de pago'); return }

    const { data: pagosExistentes } = await supabase.from('pagos').select('*').eq('venta_id', ventaSeleccionada)
    const usaPesos = (pagosExistentes || []).some(p => p.monto_pesos)
    const usaUsd = (pagosExistentes || []).some(p => p.monto_usd)

    if (usaPesos && montoUsd) { alert('Esta venta ya tiene pagos en PESOS'); return }
    if (usaUsd && montoPesos) { alert('Esta venta ya tiene pagos en USD'); return }
    if (montoPesos > totalPesos - pagadoPesos) { alert('El pago en pesos supera el saldo'); return }
    if (montoUsd > totalUSD - pagadoUSD) { alert('El pago en USD supera el saldo'); return }

    const { error } = await supabase.from('pagos').insert([{
      venta_id: Number(ventaSeleccionada),
      fecha_pago: new Date().toISOString(),
      forma_pago_id: Number(form.forma_pago_id),
      monto_pesos: montoPesos || null,
      monto_usd: montoUsd || null,
      creado_por: 1,
    }])

    if (error) { alert('Error: ' + error.message); return }
    alert('Pago registrado')
    router.replace(`/ventas?dni=${dni}`)
  }

  const saldoPesos = totalPesos - pagadoPesos
  const saldoUSD = totalUSD - pagadoUSD

  return (
    <div style={{ maxWidth: '750px' }}>

      {/* Título */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Pagos</h1>
        <p style={{ color: '#6b7280', marginTop: '6px', fontSize: '14px' }}>Registrar pagos de ventas</p>
      </div>

      {/* Buscador */}
      <div style={card}>
        <div style={cardTitle}>🔍 Buscar paciente</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            placeholder="DNI o Apellido"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarPaciente()}
            style={{ ...inputStyle, flex: 1, minWidth: '180px' }}
          />
          <button onClick={buscarPaciente} style={btnPrimario}>Buscar</button>
        </div>

        {resultados.length > 0 && (
          <select value="" onChange={(e) => {
            const p = resultados.find(x => x.id == e.target.value)
            if (!p) return
            setPaciente(p); setDni(p.dni); setResultados([])
            buscarPacienteAutomatico(p.dni)
          }} style={{ ...inputStyle, marginTop: '10px' }}>
            <option value="">Seleccionar paciente ({resultados.length} encontrados)</option>
            {resultados.map(p => (
              <option key={p.id} value={p.id}>{p.apellido_paciente} {p.nombres_paciente} — DNI: {p.dni}</option>
            ))}
          </select>
        )}

        {paciente && (
          <div style={{
            marginTop: '14px', padding: '14px 16px',
            background: '#fdf2f4', borderRadius: '8px',
            border: '1px solid #f5c2c9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px',
          }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#8B1E2D' }}>
                {paciente.apellido_paciente} {paciente.nombres_paciente}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                DNI: {paciente.dni} {paciente.telefono ? `· Tel: ${paciente.telefono}` : ''}
              </div>
            </div>
            <button onClick={() => window.location.href = `/pacientes?dni=${paciente.dni}&volver=pagos`} style={btnSecundario}>
              ✏️ Editar
            </button>
          </div>
        )}
      </div>

      {/* Seleccionar venta */}
      {ventas.length > 0 && (
        <div style={card}>
          <div style={cardTitle}>🧾 Seleccionar venta</div>
          <select
            value={ventaSeleccionada}
            onChange={(e) => {
              const id = e.target.value
              setVentaSeleccionada(id)
              if (id) cargarDetalleVenta(id)
            }}
            style={inputStyle}
          >
            <option value="">Seleccionar venta</option>
            {ventas.map(v => (
              <option key={v.id} value={v.id}>
                Venta #{v.id} — {new Date(v.fecha).toLocaleDateString('es-AR')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Detalle de venta */}
      {detalleVenta.length > 0 && (
        <div style={card}>
          <div style={cardTitle}>📋 Detalle de venta</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {detalleVenta.map(d => (
              <div key={d.id} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 14px', background: '#f9fafb',
                borderRadius: '8px', border: '1px solid #e5e7eb',
              }}>
                <span style={{ fontWeight: '500', color: '#1a1a1a' }}>
                  {d.numeros_serie?.productos?.producto || d.productos?.producto || '-'}
                </span>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>
                  {d.precio_venta_pesos ? formatearPesos(d.precio_venta_pesos) : ''}
                  {d.precio_venta_usd ? `U$S ${d.precio_venta_usd}` : ''}
                </span>
              </div>
            ))}
          </div>

          {/* Resumen de saldos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

            {totalPesos > 0 && (
              <div style={{ padding: '14px', borderRadius: '10px', background: saldoPesos > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${saldoPesos > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', marginBottom: '8px' }}>Pesos</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Total: {formatearPesos(totalPesos)}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Pagado: {formatearPesos(pagadoPesos)}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '4px', color: saldoPesos > 0 ? '#dc2626' : '#16a34a' }}>
                  Saldo: {formatearPesos(saldoPesos)}
                </div>
              </div>
            )}

            {totalUSD > 0 && (
              <div style={{ padding: '14px', borderRadius: '10px', background: saldoUSD > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${saldoUSD > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', marginBottom: '8px' }}>USD</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Total: U$S {totalUSD}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Pagado: U$S {pagadoUSD}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '4px', color: saldoUSD > 0 ? '#dc2626' : '#16a34a' }}>
                  Saldo: U$S {saldoUSD}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Formulario de pago */}
      {ventaSeleccionada && (
        <div style={card}>
          <div style={cardTitle}>💳 Registrar pago</div>
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
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
            <button onClick={guardarPago} style={btnPrimario}>💾 Guardar pago</button>
          </div>
        </div>
      )}

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

const labelStyle = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#6b7280',
  marginBottom: '4px',
  display: 'block',
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
  marginBottom: '14px',
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
  fontSize: '15px',
  fontWeight: '500',
  cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
}

