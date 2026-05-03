'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { fetchConToken } from '../../lib/fetchConToken'
import { usePermiso } from '../../lib/usePermisos'

export default function SaldosImpagos() {
  const { verificando, permitido } = usePermiso('saldos_impagos')
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [busquedaPaciente, setBusquedaPaciente] = useState('')
  const [pacientesResultados, setPacientesResultados] = useState([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null)
  const [ordenar, setOrdenar] = useState('fecha')

  useEffect(() => { cargar() }, [])

  if (verificando || !permitido) return null

  async function cargar(pacienteId = null) {
    setCargando(true)
    const params = new URLSearchParams()
    if (pacienteId) params.set('paciente_id', pacienteId)
    const res = await fetchConToken(`/api/saldos-impagos?${params}`)
    const data = await res.json()
    setVentas(data.ventas || [])
    setCargando(false)
  }

  async function buscarPacientes() {
    if (!busquedaPaciente.trim()) return
    const res = await fetchConToken(`/api/pacientes?q=${encodeURIComponent(busquedaPaciente)}`)
    const data = await res.json()
    setPacientesResultados(data.pacientes || [])
  }

  function seleccionarPaciente(p) {
    setPacienteSeleccionado(p)
    setPacientesResultados([])
    setBusquedaPaciente('')
    cargar(p.id)
  }

  function limpiarFiltro() {
    setPacienteSeleccionado(null)
    setBusquedaPaciente('')
    setPacientesResultados([])
    cargar()
  }

  const ventasOrdenadas = [...ventas].sort((a, b) => {
    if (ordenar === 'paciente') return (a.pacientes?.apellido_paciente || '').localeCompare(b.pacientes?.apellido_paciente || '')
    if (ordenar === 'producto') {
      const pa = a.venta_detalle?.[0]?.numeros_serie?.productos?.producto || a.venta_detalle?.[0]?.productos?.producto || ''
      const pb = b.venta_detalle?.[0]?.numeros_serie?.productos?.producto || b.venta_detalle?.[0]?.productos?.producto || ''
      return pa.localeCompare(pb)
    }
    if (ordenar === 'venta') return a.id - b.id
    return new Date(b.fecha) - new Date(a.fecha)
  })

  const totalSaldoP = ventas.reduce((acc, v) => acc + v.saldoP, 0)
  const totalSaldoU = ventas.reduce((acc, v) => acc + v.saldoU, 0)

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
  const fmtUSD = (n) => `U$S ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtFecha = (f) => f ? new Date(f.includes('T') ? f : f + 'T12:00:00').toLocaleDateString('es-AR') : '-'

  return (
    <div style={{ maxWidth: '1000px' }}>
      <style>{`@media print { .no-print { display: none !important; } aside { display: none !important; } main { margin-left: 0 !important; padding: 20px !important; } body { background: white; font-size: 11px; } table { font-size: 10px; width: 100%; } td, th { padding: 5px 6px !important; } @page { margin: 1.5cm; } }`}</style>

      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }} className="no-print">
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Saldos Impagos</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Ventas con saldo pendiente de cobro</p>
        </div>
        <button onClick={() => window.print()} style={btnImprimir}>🖨️ Imprimir</button>
      </div>

      {/* Filtros */}
      <div style={card} className="no-print">
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={labelStyle}>Buscar paciente</label>
            {pacienteSeleccionado ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ ...inputStyle, background: '#fdf2f4', color: '#8B1E2D', fontWeight: '600', padding: '10px 14px' }}>
                  {pacienteSeleccionado.apellido_paciente} {pacienteSeleccionado.nombres_paciente}
                </div>
                <button onClick={limpiarFiltro} style={{ padding: '10px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input placeholder="DNI o apellido..." value={busquedaPaciente} onChange={e => { setBusquedaPaciente(e.target.value); setPacientesResultados([]) }} onKeyDown={e => e.key === 'Enter' && buscarPacientes()} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={buscarPacientes} style={btnSecundario}>Buscar</button>
              </div>
            )}
            {pacientesResultados.length > 0 && (
              <select value="" onChange={e => { const p = pacientesResultados.find(x => x.id == e.target.value); if (p) seleccionarPaciente(p) }} style={{ ...inputStyle, marginTop: '6px' }}>
                <option value="">Seleccionar ({pacientesResultados.length} encontrados)</option>
                {pacientesResultados.map(p => <option key={p.id} value={p.id}>{p.apellido_paciente} {p.nombres_paciente} — DNI: {p.dni}</option>)}
              </select>
            )}
          </div>
          <div>
            <label style={labelStyle}>Ordenar por</label>
            <select value={ordenar} onChange={e => setOrdenar(e.target.value)} style={{ ...inputStyle, width: '180px' }}>
              <option value="fecha">Fecha</option>
              <option value="venta">Nro de venta</option>
              <option value="paciente">Paciente</option>
              <option value="producto">Producto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Totales */}
      {ventas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
          <div style={statCard}><div style={statLabel}>Ventas con saldo</div><div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>{ventas.length}</div></div>
          {totalSaldoP > 0 && <div style={{ ...statCard, borderLeft: '4px solid #dc2626' }}><div style={statLabel}>Saldo en pesos</div><div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>{fmt(totalSaldoP)}</div></div>}
          {totalSaldoU > 0 && <div style={{ ...statCard, borderLeft: '4px solid #dc2626' }}><div style={statLabel}>Saldo en USD</div><div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>{fmtUSD(totalSaldoU)}</div></div>}
        </div>
      )}

      {/* Tabla */}
      <div style={card}>
        {cargando ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Cargando...</div>
        ) : ventas.length === 0 ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>No hay ventas con saldo pendiente</div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Paciente</th>
                <th style={thStyle}>DNI</th>
                <th style={thStyle}>Teléfono</th>
                <th style={thStyle}>Producto / Modelo</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Monto venta</th>
                <th style={{ ...thStyle, textAlign: 'right', color: '#dc2626' }}>Saldo impago</th>
              </tr>
            </thead>
            <tbody>
              {ventasOrdenadas.map((v, i) => {
                const detalle = v.venta_detalle || []
                const productos = detalle.map(d => {
                  const prod = d.numeros_serie?.productos?.producto || d.productos?.producto || '-'
                  const modelo = d.numeros_serie?.modelos?.modelo || ''
                  return modelo ? `${prod} (${modelo})` : prod
                }).join(', ')

                return (
                  <tr key={v.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ ...tdStyle, fontWeight: '700', color: '#8B1E2D' }}>#{v.id}</td>
                    <td style={tdStyle}>{fmtFecha(v.fecha)}</td>
                    <td style={{ ...tdStyle, fontWeight: '600' }}>{v.pacientes?.apellido_paciente} {v.pacientes?.nombres_paciente}</td>
                    <td style={tdStyle}>{v.pacientes?.dni || '-'}</td>
                    <td style={tdStyle}>{v.pacientes?.telefono || '-'}</td>
                    <td style={{ ...tdStyle, fontSize: '12px', color: '#6b7280' }}>{productos}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {v.total_pesos > 0 && <div>{fmt(v.total_pesos)}</div>}
                      {v.total_dolares > 0 && <div style={{ color: '#2563eb' }}>{fmtUSD(v.total_dolares)}</div>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                      {v.saldoP > 0.01 && <div>{fmt(v.saldoP)}</div>}
                      {v.saldoU > 0.01 && <div>{fmtUSD(v.saldoU)}</div>}
                    </td>
                  </tr>
                )
              })}
              <tr style={{ background: '#1a1a1a' }}>
                <td colSpan={6} style={{ ...tdStyle, color: 'white', fontWeight: '700' }}>TOTAL ({ventas.length} ventas)</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: '#e5e7eb', fontWeight: '700' }}></td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700' }}>
                  {totalSaldoP > 0 && <div style={{ color: '#fca5a5' }}>{fmt(totalSaldoP)}</div>}
                  {totalSaldoU > 0 && <div style={{ color: '#fca5a5' }}>{fmtUSD(totalSaldoU)}</div>}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', fontFamily: "'Outfit', sans-serif", background: 'white', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', display: 'block' }
const card = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const statCard = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const statLabel = { fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnImprimir = { padding: '8px 16px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' }
const thStyle = { padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', whiteSpace: 'nowrap' }
const tdStyle = { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#1a1a1a', verticalAlign: 'top', whiteSpace: 'nowrap' }
