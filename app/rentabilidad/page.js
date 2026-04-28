'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { fetchConToken } from '../../lib/fetchConToken'
import { usePermiso } from '../../lib/usePermisos'

export default function Rentabilidad() {
  const { verificando, permitido } = usePermiso('rentabilidad')
  const hoy = new Date().toISOString().split('T')[0]
  const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [desde, setDesde] = useState(primerDiaMes)
  const [hasta, setHasta] = useState(hoy)
  const [cargando, setCargando] = useState(false)
  const [ventas, setVentas] = useState([])
  const [tab, setTab] = useState('ventas')

  useEffect(() => { buscar() }, [])

  if (verificando || !permitido) return null

  async function buscar() {
    setCargando(true)
    const res = await fetchConToken(`/api/rentabilidad?desde=${desde}&hasta=${hasta}`)
    const data = await res.json()
    setVentas(data.ventas || [])
    setCargando(false)
  }

  const ventasConAudifonos = ventas.filter(v => v.tieneAudifonos)
  const totalPrecioUSD = ventasConAudifonos.reduce((acc, v) => acc + v.precioVentaUSD, 0)
  const totalCostoUSD = ventasConAudifonos.reduce((acc, v) => acc + v.costoUSD, 0)
  const totalComisionUSD = ventasConAudifonos.reduce((acc, v) => acc + v.comisionUSD, 0)
  const totalGananciaBruta = ventasConAudifonos.reduce((acc, v) => acc + v.gananciaBrutaUSD, 0)
  const totalGananciaNeta = ventasConAudifonos.reduce((acc, v) => acc + v.gananciaNeta, 0)
  const margenPromedio = totalPrecioUSD > 0 ? ((totalGananciaNeta / totalPrecioUSD) * 100).toFixed(1) : 0

  const porProducto = {}
  ventasConAudifonos.forEach(v => {
    v.itemsConSerie.forEach(d => {
      const nombre = d.numeros_serie?.productos?.producto || 'Sin nombre'
      if (!porProducto[nombre]) porProducto[nombre] = { ventas: 0, precioUSD: 0, costoUSD: 0, gananciaNeta: 0 }
      const ganItem = ((Number(d.precio_venta_usd) || 0) - (Number(d.numeros_serie?.costo_usd) || 0)) * v.factorPago
      porProducto[nombre].ventas++
      porProducto[nombre].precioUSD += Number(d.precio_venta_usd) || 0
      porProducto[nombre].costoUSD += Number(d.numeros_serie?.costo_usd) || 0
      porProducto[nombre].gananciaNeta += ganItem
    })
  })
  const rankingProductos = Object.entries(porProducto)
    .map(([nombre, data]) => ({ nombre, ...data, margen: data.precioUSD > 0 ? ((data.gananciaNeta / data.precioUSD) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.gananciaNeta - a.gananciaNeta)

  const fmtUSD = (n) => `U$S ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtPct = (n) => `${n}%`

  return (
    <div style={{ maxWidth: '960px' }}>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Rentabilidad</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Ganancia por venta, producto y período — solo audífonos</p>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><label style={labelStyle}>Desde</label><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ ...inputStyle, width: '160px' }} /></div>
          <div><label style={labelStyle}>Hasta</label><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ ...inputStyle, width: '160px' }} /></div>
          <button onClick={buscar} disabled={cargando} style={{ ...btnPrimario, opacity: cargando ? 0.7 : 1 }}>{cargando ? 'Calculando...' : '📊 Calcular'}</button>
        </div>
      </div>

      {ventasConAudifonos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          <div style={statCard}><div style={statLabel}>Ventas</div><div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a' }}>{ventasConAudifonos.length}</div></div>
          <div style={statCard}><div style={statLabel}>Precio total</div><div style={{ fontSize: '20px', fontWeight: '700', color: '#1d4ed8' }}>{fmtUSD(totalPrecioUSD)}</div><div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Costo: {fmtUSD(totalCostoUSD)}</div></div>
          <div style={{ ...statCard, borderLeft: '4px solid #16a34a' }}><div style={statLabel}>Ganancia neta</div><div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>{fmtUSD(totalGananciaNeta)}</div><div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Bruta: {fmtUSD(totalGananciaBruta)}{totalComisionUSD > 0 && ` · Comis: ${fmtUSD(totalComisionUSD)}`}</div></div>
          <div style={{ ...statCard, borderLeft: '4px solid #7c3aed' }}><div style={statLabel}>Margen promedio</div><div style={{ fontSize: '28px', fontWeight: '700', color: '#7c3aed' }}>{fmtPct(margenPromedio)}</div></div>
        </div>
      )}

      {ventasConAudifonos.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[['ventas', `📋 Por venta (${ventasConAudifonos.length})`], ['productos', `📦 Por producto (${rankingProductos.length})`]].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: tab === val ? '#8B1E2D' : 'white', color: tab === val ? 'white' : '#374151', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>{label}</button>
          ))}
        </div>
      )}

      {tab === 'ventas' && (
        <div style={card}>
          {cargando ? <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Calculando...</div> : ventasConAudifonos.length === 0 ? (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>No hay ventas con audífonos para el período seleccionado</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Fecha</th>
                  <th style={{ ...thStyle, maxWidth: '110px' }}>Paciente</th>
                  <th style={{ ...thStyle, maxWidth: '130px' }}>Producto</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Precio</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Costo</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Comisión</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>G. Bruta</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Cobro</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>G. Neta</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Margen</th>
                </tr>
              </thead>
              <tbody>
                {ventasConAudifonos.map((v, i) => (
                  <tr key={v.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={tdStyle}>{v.id}</td>
                    <td style={tdStyle}>{new Date(v.fecha).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</td>
                    <td style={{ ...tdStyle, maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }}>{v.pacientes?.apellido_paciente} {v.pacientes?.nombres_paciente}</td>
                    <td style={{ ...tdStyle, maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: '#6b7280' }}>{v.itemsConSerie.map(d => d.numeros_serie?.productos?.producto).filter(Boolean).join(', ')}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtUSD(v.precioVentaUSD)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#dc2626' }}>{fmtUSD(v.costoUSD)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: v.comisionUSD > 0 ? '#f59e0b' : '#9ca3af', fontSize: '12px' }}>{v.comisionUSD > 0 ? fmtUSD(v.comisionUSD) : '-'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#374151' }}>{fmtUSD(v.gananciaBrutaUSD)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '600', background: v.todosEfectivo ? '#dcfce7' : '#eff6ff', color: v.todosEfectivo ? '#16a34a' : '#1d4ed8' }}>
                        {v.todosEfectivo ? '💵 100%' : '💳 70%'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: v.gananciaNeta >= 0 ? '#16a34a' : '#dc2626' }}>{fmtUSD(v.gananciaNeta)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: Number(v.margenPct) >= 30 ? '#16a34a' : Number(v.margenPct) >= 15 ? '#f59e0b' : '#dc2626' }}>
                        {v.margenPct ? fmtPct(v.margenPct) : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#1a1a1a' }}>
                  <td colSpan={4} style={{ ...tdStyle, color: 'white', fontWeight: '700' }}>TOTAL ({ventasConAudifonos.length} ventas)</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#93c5fd', fontWeight: '700' }}>{fmtUSD(totalPrecioUSD)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#fca5a5', fontWeight: '700' }}>{fmtUSD(totalCostoUSD)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#fcd34d', fontWeight: '700' }}>{totalComisionUSD > 0 ? fmtUSD(totalComisionUSD) : '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#e5e7eb', fontWeight: '700' }}>{fmtUSD(totalGananciaBruta)}</td>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#86efac', fontWeight: '700' }}>{fmtUSD(totalGananciaNeta)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#c4b5fd', fontWeight: '700' }}>{fmtPct(margenPromedio)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'productos' && (
        <div style={card}>
          {rankingProductos.length === 0 ? <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>No hay datos para el período seleccionado</div> : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Producto</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Ventas</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Precio total</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Costo total</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Ganancia neta</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Margen</th>
                </tr>
              </thead>
              <tbody>
                {rankingProductos.map((p, i) => (
                  <tr key={p.nombre} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ ...tdStyle, fontWeight: '600' }}>{p.nombre}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{p.ventas}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtUSD(p.precioUSD)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#dc2626' }}>{fmtUSD(p.costoUSD)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: p.gananciaNeta >= 0 ? '#16a34a' : '#dc2626' }}>{fmtUSD(p.gananciaNeta)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: Number(p.margen) >= 30 ? '#16a34a' : Number(p.margen) >= 15 ? '#f59e0b' : '#dc2626' }}>{fmtPct(p.margen)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {ventasConAudifonos.length > 0 && (
        <div style={{ fontSize: '12px', color: '#9ca3af', padding: '0 4px' }}>
          * Fórmula: Ganancia bruta = Precio − Costo − Comisión derivador (en U$S). Ganancia neta = Ganancia bruta × factor de cobro (💵 efectivo = 100%, 💳 otro medio = 70%).
        </div>
      )}

    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', fontFamily: "'Outfit', sans-serif", background: 'white', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', display: 'block' }
const card = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const statCard = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const statLabel = { fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' }
const thStyle = { padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', whiteSpace: 'nowrap' }
const tdStyle = { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#1a1a1a', verticalAlign: 'top', whiteSpace: 'nowrap' }
