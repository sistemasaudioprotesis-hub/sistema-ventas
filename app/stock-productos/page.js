'use client'

export const dynamic = 'force-dynamic'

import { getUsuarioId } from '../../lib/getUsuario'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { usePermiso } from '../../lib/usePermisos'

export default function StockProductos() {
  const [productos, setProductos] = useState([])
  const [stock, setStock] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const { verificando, permitido } = usePermiso('stock_productos')

  // Modal ajuste
  const [modalAjuste, setModalAjuste] = useState(null)
  const [formAjuste, setFormAjuste] = useState({ tipo: 'ingreso', cantidad: '', concepto: '' })

  // Modal toggle controla_stock
  const [guardandoToggle, setGuardandoToggle] = useState(null)

  useEffect(() => { cargarDatos() }, [])

  if (verificando || !permitido) return null

  async function cargarDatos() {
    setCargando(true)
    const [{ data: prods }, { data: stockData }] = await Promise.all([
      supabase.from('productos').select('id, producto, controla_stock, tipo_producto (requiere_serie)').eq('activo', true).order('producto'),
      supabase.from('stock_general').select('*, productos (producto)'),
    ])
    setProductos(prods || [])
    setStock(stockData || [])
    setCargando(false)
  }

  async function cargarMovimientos(productoId) {
    const { data: stockRow } = await supabase.from('stock_general').select('id').eq('producto_id', productoId).maybeSingle()
    if (!stockRow) { setMovimientos([]); return }
    const { data } = await supabase.from('stock_general_movimientos')
      .select('*').eq('stock_general_id', stockRow.id)
      .order('created_at', { ascending: false }).limit(50)
    setMovimientos(data || [])
  }

  function getStock(productoId) {
    return stock.find(s => s.producto_id === productoId)?.cantidad || 0
  }

  async function toggleControlaStock(prod) {
    setGuardandoToggle(prod.id)
    await supabase.from('productos').update({ controla_stock: !prod.controla_stock }).eq('id', prod.id)
    await cargarDatos()
    setGuardandoToggle(null)
  }

  function abrirAjuste(prod, tipo) {
    setModalAjuste(prod)
    setFormAjuste({ tipo, cantidad: '', concepto: tipo === 'ingreso' ? 'Carga de stock' : 'Ajuste de inventario' })
  }

  async function guardarAjuste() {
    if (!formAjuste.cantidad || Number(formAjuste.cantidad) <= 0) { alert('Ingresar cantidad válida'); return }
    const cantidad = Number(formAjuste.cantidad)
    const { data: stockRow } = await supabase.from('stock_general').select('id, cantidad').eq('producto_id', modalAjuste.id).maybeSingle()

    let stockId
    if (stockRow) {
      const nuevaCantidad = formAjuste.tipo === 'ingreso' ? stockRow.cantidad + cantidad : Math.max(0, stockRow.cantidad - cantidad)
      await supabase.from('stock_general').update({ cantidad: nuevaCantidad }).eq('id', stockRow.id)
      stockId = stockRow.id
    } else {
      if (formAjuste.tipo === 'egreso') { alert('No hay stock registrado para este producto'); return }
      const { data: newStock } = await supabase.from('stock_general').insert([{
        producto_id: modalAjuste.id, cantidad, creado_por: getUsuarioId(),
      }]).select().single()
      stockId = newStock.id
    }

    await supabase.from('stock_general_movimientos').insert([{
      stock_general_id: stockId,
      tipo: formAjuste.tipo,
      cantidad,
      concepto: formAjuste.concepto || null,
      creado_por: getUsuarioId(),
    }])

    setModalAjuste(null)
    setFormAjuste({ tipo: 'ingreso', cantidad: '', concepto: '' })
    await cargarDatos()
    if (productoSeleccionado?.id === modalAjuste.id) cargarMovimientos(modalAjuste.id)
    alert('✅ Stock actualizado')
  }

  // Productos sin serie (los que tienen stock general)
  const productosSinSerie = productos.filter(p => !p.tipo_producto?.requiere_serie)

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
  const fmtFecha = (f) => new Date(f).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
  const fmtHora = (f) => new Date(f).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })

  return (
    <div style={{ maxWidth: '860px' }}>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Stock de Productos</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Control de stock para productos sin número de serie</p>
      </div>

      {cargando ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Cargando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: productoSeleccionado ? '1fr 1fr' : '1fr', gap: '20px' }}>

          {/* Lista de productos */}
          <div>
            <div style={card}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
                Productos ({productosSinSerie.length})
              </div>
              {productosSinSerie.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay productos sin serie</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {productosSinSerie.map(p => {
                    const cantidad = getStock(p.id)
                    const seleccionado = productoSeleccionado?.id === p.id
                    return (
                      <div key={p.id} style={{
                        padding: '12px 14px', borderRadius: '10px',
                        border: `2px solid ${seleccionado ? '#8B1E2D' : '#e5e7eb'}`,
                        background: seleccionado ? '#fdf2f4' : '#f9fafb',
                        cursor: 'pointer',
                      }} onClick={() => {
                        setProductoSeleccionado(p)
                        cargarMovimientos(p.id)
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>{p.producto}</div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '600',
                                background: p.controla_stock ? '#dcfce7' : '#f3f4f6',
                                color: p.controla_stock ? '#16a34a' : '#6b7280',
                              }}>
                                {p.controla_stock ? '✓ Controla stock' : 'Sin control'}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleControlaStock(p) }}
                                disabled={guardandoToggle === p.id}
                                style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: p.controla_stock ? '#fef2f2' : '#f0fdf4', color: p.controla_stock ? '#dc2626' : '#16a34a' }}>
                                {guardandoToggle === p.id ? '...' : p.controla_stock ? 'Desactivar' : 'Activar'}
                              </button>
                            </div>
                          </div>
                          {p.controla_stock && (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '20px', fontWeight: '700', color: cantidad > 0 ? '#1a1a1a' : '#dc2626' }}>{cantidad}</div>
                              <div style={{ fontSize: '11px', color: '#9ca3af' }}>unidades</div>
                            </div>
                          )}
                        </div>
                        {p.controla_stock && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => abrirAjuste(p, 'ingreso')} style={{ ...btnSecundario, fontSize: '12px', padding: '5px 10px', color: '#16a34a', borderColor: '#bbf7d0' }}>+ Ingreso</button>
                            <button onClick={() => abrirAjuste(p, 'egreso')} style={{ ...btnSecundario, fontSize: '12px', padding: '5px 10px', color: '#dc2626', borderColor: '#fecaca' }}>- Egreso</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Historial de movimientos */}
          {productoSeleccionado && (
            <div>
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    📋 {productoSeleccionado.producto}
                  </div>
                  <button onClick={() => { setProductoSeleccionado(null); setMovimientos([]) }} style={{ ...btnSecundario, fontSize: '12px', padding: '4px 10px' }}>✕</button>
                </div>
                <div style={{ padding: '12px 16px', background: '#1a1a1a', borderRadius: '10px', color: 'white', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', opacity: 0.7 }}>Stock actual</span>
                  <span style={{ fontSize: '24px', fontWeight: '700', color: getStock(productoSeleccionado.id) > 0 ? '#4ade80' : '#f87171' }}>
                    {getStock(productoSeleccionado.id)} unidades
                  </span>
                </div>
                {movimientos.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>Sin movimientos registrados</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {movimientos.map(m => (
                      <div key={m.id} style={{
                        padding: '10px 12px', borderRadius: '8px',
                        background: m.tipo === 'ingreso' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${m.tipo === 'ingreso' ? '#bbf7d0' : '#fecaca'}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{m.concepto || (m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso')}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{fmtFecha(m.created_at)} {fmtHora(m.created_at)}</div>
                        </div>
                        <span style={{ fontWeight: '700', fontSize: '15px', color: m.tipo === 'ingreso' ? '#16a34a' : '#dc2626' }}>
                          {m.tipo === 'ingreso' ? '+' : '-'}{m.cantidad}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL AJUSTE */}
      {modalAjuste && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '4px' }}>
              {formAjuste.tipo === 'ingreso' ? '📦 Ingreso de stock' : '📤 Egreso de stock'}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>{modalAjuste.producto}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={formAjuste.tipo} onChange={(e) => setFormAjuste({ ...formAjuste, tipo: e.target.value })} style={inputStyle}>
                  <option value="ingreso">📦 Ingreso</option>
                  <option value="egreso">📤 Egreso / Ajuste</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Cantidad *</label>
                <input type="number" min="1" placeholder="Ej: 10" value={formAjuste.cantidad} onChange={(e) => setFormAjuste({ ...formAjuste, cantidad: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Concepto</label>
                <input placeholder="Ej: Compra de stock, Ajuste inventario..." value={formAjuste.concepto} onChange={(e) => setFormAjuste({ ...formAjuste, concepto: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={guardarAjuste} style={btnPrimario}>💾 Guardar</button>
              <button onClick={() => setModalAjuste(null)} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '15px', fontFamily: "'Outfit', sans-serif", background: 'white', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', display: 'block' }
const card = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginBottom: '0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modalBox = { background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }
