'use client'

export const dynamic = 'force-dynamic'

import { getUsuarioId } from '../../lib/getUsuario'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
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
      await cargarVentasPaciente(data.id)
    }
  }

  async function cargarVentasPaciente(pacienteId) {
    const { data: ventasData } = await supabase
      .from('ventas')
      .select(`*, venta_detalle (precio_venta_pesos, precio_venta_usd)`)
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false })

    // Para cada venta calcular saldo
    const ventasConSaldo = await Promise.all((ventasData || []).map(async v => {
      const { data: pagos } = await supabase.from('pagos').select('monto_pesos, monto_usd').eq('venta_id', v.id)
      const pagadoP = (pagos || []).reduce((acc, p) => acc + (Number(p.monto_pesos) || 0), 0)
      const pagadoU = (pagos || []).reduce((acc, p) => acc + (Number(p.monto_usd) || 0), 0)
      return { ...v, pagadoPesos: pagadoP, pagadoUSD: pagadoU }
    }))

    setVentas(ventasConSaldo)
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

    await cargarPagosVenta(ventaId)
  }

  async function cargarPagosVenta(ventaId) {
    const { data: pagos } = await supabase
      .from('pagos')
      .select(`*, formas_pago (forma_pago)`)
      .eq('venta_id', ventaId)
      .order('fecha_pago')

    setPagosVenta(pagos || [])
    setPagadoPesos((pagos || []).reduce((acc, p) => acc + (Number(p.monto_pesos) || 0), 0))
    setPagadoUSD((pagos || []).reduce((acc, p) => acc + (Number(p.monto_usd) || 0), 0))
  }

  async function eliminarPago(id) {
    if (!confirm('¿Eliminar este pago?')) return
    await supabase.from('pagos').delete().eq('id', id)
    await cargarPagosVenta(ventaSeleccionada)
    if (paciente) await cargarVentasPaciente(paciente.id)
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

    const usaPesos = pagosVenta.some(p => p.monto_pesos)
    const usaUsd = pagosVenta.some(p => p.monto_usd)

    if (usaPesos && montoUsd) { alert('Esta venta ya tiene pagos en PESOS'); return }
    if (usaUsd && montoPesos) { alert('Esta venta ya tiene pagos en USD'); return }

    const saldoPesos = totalPesos - pagadoPesos
    const saldoUSD = totalUSD - pagadoUSD

    if (montoPesos > saldoPesos) { alert('El pago en pesos supera el saldo'); return }
    if (montoUsd > saldoUSD) { alert('El pago en USD supera el saldo'); return }

    const { error } = await supabase.from('pagos').insert([{
      venta_id: Number(ventaSeleccionada),
      fecha_pago: new Date().toISOString(),
      forma_pago_id: Number(form.forma_pago_id),
      monto_pesos: montoPesos || null,
      monto_usd: montoUsd || null,
      creado_por: getUsuarioId(),
    }])

    if (error) { alert('Error: ' + error.message); return }

    alert('✅ Pago registrado')
    setForm({ forma_pago_id: '', monto_pesos: '', monto_usd: '' })
    await cargarPagosVenta(ventaSeleccionada)
    if (paciente) await cargarVentasPaciente(paciente.id)
  }

  const saldoPesos = totalPesos - pagadoPesos
  const saldoUSD = totalUSD - pagadoUSD
  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

  return (
    <div style={{ maxWidth: '750px' }}>

      {/* Título */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Pagos</h1>
        <p style={{ color: '#6b7280', marginTop: '6px', fontSize: '14px' }}>Registrar y gestionar pagos de ventas</p>
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
            <button onClick={() => window.location.href = `/pacientes?dni=${paciente.dni}`} style={btnSecundario}>
              ✏️ Editar
            </button>
          </div>
        )}
      </div>

      {/* Historial de ventas del paciente */}
      {ventas.length > 0 && (
        <div style={card}>
          <div style={cardTitle}>🧾 Ventas del paciente</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ventas.map(v => {
              const totalV = v.total_pesos || 0
              const totalVusd = v.total_dolares || 0
              const saldoV = totalV - v.pagadoPesos
              const saldoVusd = totalVusd - v.pagadoUSD
              const pagada = saldoV <= 0 && saldoVusd <= 0
              const seleccionada = ventaSeleccionada == v.id

              return (
                <div
                  key={v.id}
                  onClick={() => { setVentaSeleccionada(String(v.id)); cargarDetalleVenta(v.id) }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: '8px',
                    border: `2px solid ${seleccionada ? '#8B1E2D' : '#e5e7eb'}`,
                    background: seleccionada ? '#fdf2f4' : '#f9fafb',
                    cursor: 'pointer', flexWrap: 'wrap', gap: '8px',
                    transition: '0.15s',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>
                      Venta #{v.id} — {new Date(v.fecha).toLocaleDateString('es-AR')}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                      {totalV > 0 && `Total: ${fmt(totalV)}`}
                      {totalVusd > 0 && ` · U$S ${totalVusd}`}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                    background: pagada ? '#dcfce7' : '#fef2f2',
                    color: pagada ? '#16a34a' : '#dc2626',
                  }}>
                    {pagada ? '✅ Pagada' : `Saldo: ${saldoV > 0 ? fmt(saldoV) : `U$S ${saldoVusd}`}`}
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
              <div key={d.id} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 14px', background: '#f9fafb',
                borderRadius: '8px', border: '1px solid #e5e7eb',
              }}>
                <span style={{ fontWeight: '500', color: '#1a1a1a' }}>
                  {d.numeros_serie?.productos?.producto || d.productos?.producto || '-'}
                  {d.numeros_serie?.numero_serie ? ` (${d.numeros_serie.numero_serie})` : ''}
                </span>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>
                  {d.precio_venta_pesos ? formatearPesos(d.precio_venta_pesos) : ''}
                  {d.precio_venta_usd ? `U$S ${d.precio_venta_usd}` : ''}
                </span>
              </div>
            ))}
          </div>

          {/* Saldos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {totalPesos > 0 && (
              <div style={{ padding: '14px', borderRadius: '10px', background: saldoPesos > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${saldoPesos > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px' }}>Pesos</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Total: {formatearPesos(totalPesos)}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Pagado: {formatearPesos(pagadoPesos)}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '4px', color: saldoPesos > 0 ? '#dc2626' : '#16a34a' }}>
                  Saldo: {formatearPesos(saldoPesos)}
                </div>
              </div>
            )}
            {totalUSD > 0 && (
              <div style={{ padding: '14px', borderRadius: '10px', background: saldoUSD > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${saldoUSD > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px' }}>USD</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Total: U$S {totalUSD}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Pagado: U$S {pagadoUSD}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '4px', color: saldoUSD > 0 ? '#dc2626' : '#16a34a' }}>
                  Saldo: U$S {saldoUSD}
                </div>
              </div>
            )}
          </div>

          {/* Pagos ya cargados */}
          {pagosVenta.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Pagos registrados ({pagosVenta.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {pagosVenta.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: '#f0fdf4',
                    borderRadius: '8px', border: '1px solid #bbf7d0',
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>
                        {p.formas_pago?.forma_pago}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {new Date(p.fecha_pago).toLocaleDateString('es-AR')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: '700', color: '#16a34a' }}>
                        {p.monto_pesos ? formatearPesos(p.monto_pesos) : `U$S ${p.monto_usd}`}
                      </span>
                      <button onClick={() => eliminarPago(p.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ef4444'
                      }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulario nuevo pago — solo si hay saldo */}
          {(saldoPesos > 0 || saldoUSD > 0) && (
            <div style={{ paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                💳 Registrar nuevo pago
              </div>
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

          {/* Venta saldada */}
          {saldoPesos <= 0 && saldoUSD <= 0 && (
            <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center', color: '#16a34a', fontWeight: '600' }}>
              ✅ Venta completamente pagada
            </div>
          )}

        </div>
      )}

    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
  fontSize: '15px', fontFamily: "'Outfit', sans-serif", background: 'white',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', display: 'block',
}

const card = {
  background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px',
  padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const cardTitle = {
  fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '14px',
}

const btnPrimario = {
  padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
}

const btnSecundario = {
  padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb',
  borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
}
