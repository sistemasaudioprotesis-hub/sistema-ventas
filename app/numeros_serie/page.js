'use client'

export const dynamic = 'force-dynamic'

import { getUsuarioId } from '../../lib/getUsuario'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { normalizarTexto } from '../../lib/formatText'

export default function NumerosSerie() {
  const [tab, setTab] = useState('series')
  const [series, setSeries] = useState([])
  const [tipos, setTipos] = useState([])
  const [productos, setProductos] = useState([])
  const [productosFiltrados, setProductosFiltrados] = useState([])
  const [depositos, setDepositos] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('stock')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [filtroDeposito, setFiltroDeposito] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  // Stock general
  const [stockGeneral, setStockGeneral] = useState([])
  const [mostrarFormStock, setMostrarFormStock] = useState(false)
  const [stockEditando, setStockEditando] = useState(null)
  const [formStock, setFormStock] = useState({ producto_id: '', cantidad: '', deposito_id: '' })
  const [mostrarMovimiento, setMostrarMovimiento] = useState(null)
  const [formMovimiento, setFormMovimiento] = useState({ tipo: 'entrada', cantidad: '', concepto: '' })

  // Modales de alta
  const [modal, setModal] = useState(null)
  const [formTipo, setFormTipo] = useState({ tipo: '', requiere_serie: true })
  const [formProducto, setFormProducto] = useState({ producto: '', tipo_id: '' })
  const [formDeposito, setFormDeposito] = useState({ deposito: '' })

  const [form, setForm] = useState({
    tipo_id: '', producto_id: '', numero_serie: '', costo_usd: '', deposito_id: '',
  })

  useEffect(() => {
    obtenerDatos()
  }, [])

  async function obtenerDatos() {
    const [{ data: seriesData }, { data: tiposData }, { data: productosData }, { data: depositosData }, { data: stockData }] = await Promise.all([
      supabase.from('numeros_serie').select(`
        id, numero_serie, costo_usd, en_stock, fecha_salida, created_at,
        productos (id, producto), depositos (id, deposito)
      `).order('created_at', { ascending: false }),
      supabase.from('tipo_producto').select('*').order('tipo'),
      supabase.from('productos').select('*').order('producto'),
      supabase.from('depositos').select('*').order('deposito'),
      supabase.from('stock_general').select(`
        id, cantidad,
        productos (id, producto),
        depositos (id, deposito)
      `).order('id'),
    ])

    setSeries(seriesData || [])
    setTipos(tiposData || [])
    setProductos(productosData || [])
    setDepositos(depositosData || [])
    setStockGeneral(stockData || [])
  }

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'tipo_id') {
      const filtrados = productos.filter(p => p.tipo_id === Number(value))
      setProductosFiltrados(filtrados)
      setForm({ ...form, tipo_id: value, producto_id: '' })
      return
    }
    const camposTexto = ['numero_serie']
    const nuevoValor = camposTexto.includes(name) ? normalizarTexto(value) : value
    setForm({ ...form, [name]: nuevoValor })
  }

  async function guardar() {
    if (!form.producto_id || !form.numero_serie || !form.deposito_id) {
      alert('Completar campos obligatorios'); return
    }
    const numeroNormalizado = normalizarTexto(form.numero_serie)
    const { data: existe } = await supabase.from('numeros_serie').select('id').ilike('numero_serie', numeroNormalizado).maybeSingle()
    if (existe) { alert('❌ Ese número de serie ya existe en el sistema'); return }
    const { error } = await supabase.from('numeros_serie').insert([{
      producto_id: Number(form.producto_id), numero_serie: numeroNormalizado,
      costo_usd: form.costo_usd ? Number(form.costo_usd) : null,
      deposito_id: Number(form.deposito_id), en_stock: true, creado_por: getUsuarioId(),
    }])
    if (error) { alert('❌ Ese número de serie ya existe en el sistema'); return }
    alert('✅ Número de serie guardado')
    setForm({ tipo_id: '', producto_id: '', numero_serie: '', costo_usd: '', deposito_id: '' })
    setProductosFiltrados([])
    setMostrarFormulario(false)
    obtenerDatos()
  }

  async function guardarTipo() {
    if (!formTipo.tipo) { alert('Ingresar nombre del tipo'); return }
    const nombre = normalizarTexto(formTipo.tipo)
    const { data: existe } = await supabase.from('tipo_producto').select('id').ilike('tipo', nombre).maybeSingle()
    if (existe) { alert('❌ Ese tipo ya existe'); return }
    const { error } = await supabase.from('tipo_producto').insert([{ tipo: nombre, requiere_serie: formTipo.requiere_serie, creado_por: getUsuarioId() }])
    if (error) { alert('Error: ' + error.message); return }
    alert('✅ Tipo creado')
    setFormTipo({ tipo: '', requiere_serie: true })
    setModal(null)
    obtenerDatos()
  }

  async function guardarProducto() {
    if (!formProducto.producto || !formProducto.tipo_id) { alert('Completar campos obligatorios'); return }
    const nombre = normalizarTexto(formProducto.producto)
    const { data: existe } = await supabase.from('productos').select('id').ilike('producto', nombre).maybeSingle()
    if (existe) { alert('❌ Ese producto ya existe'); return }
    const { error } = await supabase.from('productos').insert([{ producto: nombre, tipo_id: Number(formProducto.tipo_id), activo: true, creado_por: getUsuarioId() }])
    if (error) { alert('Error: ' + error.message); return }
    alert('✅ Producto creado')
    setFormProducto({ producto: '', tipo_id: '' })
    setModal(null)
    obtenerDatos()
  }

  async function guardarDeposito() {
    if (!formDeposito.deposito) { alert('Ingresar nombre del depósito'); return }
    const nombre = normalizarTexto(formDeposito.deposito)
    const { data: existe } = await supabase.from('depositos').select('id').ilike('deposito', nombre).maybeSingle()
    if (existe) { alert('❌ Ese depósito ya existe'); return }
    const { error } = await supabase.from('depositos').insert([{ deposito: nombre, creado_por: getUsuarioId() }])
    if (error) { alert('Error: ' + error.message); return }
    alert('✅ Depósito creado')
    setFormDeposito({ deposito: '' })
    setModal(null)
    obtenerDatos()
  }

  async function guardarStock() {
    if (!formStock.producto_id) { alert('Seleccionar producto'); return }
    if (!formStock.cantidad) { alert('Ingresar cantidad'); return }

    if (stockEditando) {
      await supabase.from('stock_general').update({
        producto_id: Number(formStock.producto_id),
        cantidad: Number(formStock.cantidad),
        deposito_id: formStock.deposito_id ? Number(formStock.deposito_id) : null,
      }).eq('id', stockEditando)
      alert('✅ Stock actualizado')
    } else {
      const { data: nuevoStock } = await supabase.from('stock_general').insert([{
        producto_id: Number(formStock.producto_id),
        cantidad: Number(formStock.cantidad),
        deposito_id: formStock.deposito_id ? Number(formStock.deposito_id) : null,
        creado_por: getUsuarioId(),
      }]).select().single()

      await supabase.from('stock_general_movimientos').insert([{
        stock_general_id: nuevoStock.id,
        tipo: 'entrada',
        cantidad: Number(formStock.cantidad),
        concepto: 'Stock inicial',
        creado_por: getUsuarioId(),
      }])
      alert('✅ Stock creado')
    }

    setFormStock({ producto_id: '', cantidad: '', deposito_id: '' })
    setMostrarFormStock(false)
    setStockEditando(null)
    obtenerDatos()
  }

  async function guardarMovimiento(stockId) {
    if (!formMovimiento.cantidad || Number(formMovimiento.cantidad) <= 0) {
      alert('Ingresar cantidad válida'); return
    }
    const item = stockGeneral.find(s => s.id === stockId)
    if (!item) return

    const nuevaCantidad = formMovimiento.tipo === 'entrada'
      ? item.cantidad + Number(formMovimiento.cantidad)
      : item.cantidad - Number(formMovimiento.cantidad)

    if (nuevaCantidad < 0) { alert('No hay suficiente stock'); return }

    await supabase.from('stock_general').update({ cantidad: nuevaCantidad }).eq('id', stockId)
    await supabase.from('stock_general_movimientos').insert([{
      stock_general_id: stockId,
      tipo: formMovimiento.tipo,
      cantidad: Number(formMovimiento.cantidad),
      concepto: formMovimiento.concepto || null,
      creado_por: getUsuarioId(),
    }])

    alert('✅ Movimiento registrado')
    setFormMovimiento({ tipo: 'entrada', cantidad: '', concepto: '' })
    setMostrarMovimiento(null)
    obtenerDatos()
  }

  const seriesFiltradas = series.filter(s => {
    const estadoOk = filtroEstado === 'todos' ? true : filtroEstado === 'stock' ? s.en_stock : !s.en_stock
    const productoOk = filtroProducto ? s.productos?.id == filtroProducto : true
    const depositoOk = filtroDeposito ? s.depositos?.id == filtroDeposito : true
    return estadoOk && productoOk && depositoOk
  })

  const totalStock = series.filter(s => s.en_stock).length
  const totalVendidos = series.filter(s => !s.en_stock).length

  return (
    <div style={{ maxWidth: '850px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Stock</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Control de inventario</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setModal('tipo')} style={btnFantasma}>+ Tipo</button>
          <button onClick={() => setModal('producto')} style={btnFantasma}>+ Producto</button>
          <button onClick={() => setModal('deposito')} style={btnFantasma}>+ Depósito</button>
          {tab === 'series' && (
            <button onClick={() => setMostrarFormulario(!mostrarFormulario)} style={btnPrimario}>
              {mostrarFormulario ? '✕ Cancelar' : '+ Agregar serie'}
            </button>
          )}
          {tab === 'general' && (
            <button onClick={() => { setMostrarFormStock(!mostrarFormStock); setStockEditando(null); setFormStock({ producto_id: '', cantidad: '', deposito_id: '' }) }} style={btnPrimario}>
              {mostrarFormStock ? '✕ Cancelar' : '+ Agregar producto'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['series', '🔢 Números de Serie'], ['general', '📦 Stock General']].map(([val, label]) => (
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

      {/* Modales */}
      {modal === 'tipo' && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={cardTitle}>🏷️ Nuevo tipo de producto</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Field label="Nombre del tipo *">
                <input placeholder="Ej: AUDIFONOS" value={formTipo.tipo} onChange={(e) => setFormTipo({ ...formTipo, tipo: e.target.value })} style={{ ...inputStyle, textTransform: 'uppercase' }} />
              </Field>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="requiere_serie" checked={formTipo.requiere_serie} onChange={(e) => setFormTipo({ ...formTipo, requiere_serie: e.target.checked })} />
                <label htmlFor="requiere_serie" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>Requiere número de serie</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={guardarTipo} style={btnPrimario}>💾 Guardar</button>
              <button onClick={() => setModal(null)} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'producto' && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={cardTitle}>📦 Nuevo producto</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Field label="Nombre del producto *">
                <input placeholder="Ej: INTRACANAL" value={formProducto.producto} onChange={(e) => setFormProducto({ ...formProducto, producto: e.target.value })} style={{ ...inputStyle, textTransform: 'uppercase' }} />
              </Field>
              <Field label="Tipo de producto *">
                <select value={formProducto.tipo_id} onChange={(e) => setFormProducto({ ...formProducto, tipo_id: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar tipo</option>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.tipo}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={guardarProducto} style={btnPrimario}>💾 Guardar</button>
              <button onClick={() => setModal(null)} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'deposito' && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={cardTitle}>🏪 Nuevo depósito</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Field label="Nombre del depósito *">
                <input placeholder="Ej: LOCAL QUILMES" value={formDeposito.deposito} onChange={(e) => setFormDeposito({ ...formDeposito, deposito: e.target.value })} style={{ ...inputStyle, textTransform: 'uppercase' }} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={guardarDeposito} style={btnPrimario}>💾 Guardar</button>
              <button onClick={() => setModal(null)} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* TAB SERIES */}
      {tab === 'series' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <div style={{ ...statCard, borderLeft: '4px solid #8B1E2D' }}>
              <div style={statLabel}>Total</div>
              <div style={statNum}>{series.length}</div>
            </div>
            <div style={{ ...statCard, borderLeft: '4px solid #16a34a' }}>
              <div style={statLabel}>En stock</div>
              <div style={{ ...statNum, color: '#16a34a' }}>{totalStock}</div>
            </div>
            <div style={{ ...statCard, borderLeft: '4px solid #6b7280' }}>
              <div style={statLabel}>Vendidos</div>
              <div style={statNum}>{totalVendidos}</div>
            </div>
          </div>

          {mostrarFormulario && (
            <div style={card}>
              <div style={cardTitle}>➕ Nueva serie</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="Tipo de producto *">
                  <select name="tipo_id" value={form.tipo_id} onChange={handleChange} style={inputStyle}>
                    <option value="">Seleccionar tipo</option>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.tipo}</option>)}
                  </select>
                </Field>
                <Field label="Producto *">
                  <select name="producto_id" value={form.producto_id} onChange={handleChange} style={inputStyle} disabled={!form.tipo_id}>
                    <option value="">Seleccionar producto</option>
                    {productosFiltrados.map(p => <option key={p.id} value={p.id}>{p.producto}</option>)}
                  </select>
                </Field>
                <Field label="Número de serie *">
                  <input name="numero_serie" placeholder="Ej: SN-12345" value={form.numero_serie} onChange={handleChange} style={{ ...inputStyle, textTransform: 'uppercase' }} />
                </Field>
                <Field label="Costo USD">
                  <input type="number" name="costo_usd" placeholder="0.00" value={form.costo_usd} onChange={handleChange} style={inputStyle} />
                </Field>
                <Field label="Depósito *">
                  <select name="deposito_id" value={form.deposito_id} onChange={handleChange} style={inputStyle}>
                    <option value="">Seleccionar depósito</option>
                    {depositos.map(d => <option key={d.id} value={d.id}>{d.deposito}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
                <button onClick={guardar} style={btnPrimario}>💾 Guardar</button>
              </div>
            </div>
          )}

          <div style={{ ...card, padding: '14px 20px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[['stock', '✅ En stock'], ['vendido', '📦 Vendidos'], ['todos', 'Todos']].map(([val, label]) => (
                  <button key={val} onClick={() => setFiltroEstado(val)} style={{
                    padding: '7px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
                    background: filtroEstado === val ? '#8B1E2D' : 'white',
                    color: filtroEstado === val ? 'white' : '#374151',
                    fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                  }}>{label}</button>
                ))}
              </div>
              <select value={filtroProducto} onChange={(e) => setFiltroProducto(e.target.value)} style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: '180px' }}>
                <option value="">Todos los productos</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.producto}</option>)}
              </select>
              <select value={filtroDeposito} onChange={(e) => setFiltroDeposito(e.target.value)} style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: '180px' }}>
                <option value="">Todos los depósitos</option>
                {depositos.map(d => <option key={d.id} value={d.id}>{d.deposito}</option>)}
              </select>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
              {seriesFiltradas.length} resultado{seriesFiltradas.length !== 1 ? 's' : ''}
            </div>
            {seriesFiltradas.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', padding: '20px 0', textAlign: 'center' }}>No hay series para mostrar</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {seriesFiltradas.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', background: '#f9fafb', borderRadius: '8px',
                    border: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '8px',
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a' }}>{s.numero_serie}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                        {s.productos?.producto || '-'}
                        {s.depositos?.deposito ? ` · ${s.depositos.deposito}` : ''}
                        {s.costo_usd ? ` · Costo: U$S ${s.costo_usd}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {s.fecha_salida && <span style={{ fontSize: '12px', color: '#9ca3af' }}>Salida: {new Date(s.fecha_salida).toLocaleDateString('es-AR')}</span>}
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                        background: s.en_stock ? '#dcfce7' : '#f3f4f6',
                        color: s.en_stock ? '#16a34a' : '#6b7280',
                      }}>
                        {s.en_stock ? 'En stock' : 'Vendido'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB STOCK GENERAL */}
      {tab === 'general' && (
        <>
          {mostrarFormStock && (
            <div style={card}>
              <div style={cardTitle}>{stockEditando ? '✏️ Editar stock' : '➕ Nuevo producto en stock'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <Field label="Producto *">
                  <select value={formStock.producto_id} onChange={(e) => setFormStock({ ...formStock, producto_id: e.target.value })} style={inputStyle}>
                    <option value="">Seleccionar</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.producto}</option>)}
                  </select>
                </Field>
                <Field label="Cantidad *">
                  <input type="number" placeholder="0" value={formStock.cantidad} onChange={(e) => setFormStock({ ...formStock, cantidad: e.target.value })} style={inputStyle} />
                </Field>
                <Field label="Depósito">
                  <select value={formStock.deposito_id} onChange={(e) => setFormStock({ ...formStock, deposito_id: e.target.value })} style={inputStyle}>
                    <option value="">Sin depósito</option>
                    {depositos.map(d => <option key={d.id} value={d.id}>{d.deposito}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '10px' }}>
                <button onClick={guardarStock} style={btnPrimario}>💾 Guardar</button>
                <button onClick={() => { setMostrarFormStock(false); setStockEditando(null) }} style={btnSecundario}>Cancelar</button>
              </div>
            </div>
          )}

          <div style={card}>
            <div style={cardTitle}>📦 Productos en stock</div>
            {stockGeneral.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                No hay productos cargados en stock general
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stockGeneral.map(s => (
                  <div key={s.id}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 16px', background: '#f9fafb',
                      borderRadius: mostrarMovimiento === s.id ? '10px 10px 0 0' : '10px',
                      border: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '8px',
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a' }}>
                          {s.productos?.producto || '-'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                          {s.depositos?.deposito || 'Sin depósito'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          padding: '6px 16px', borderRadius: '20px',
                          background: s.cantidad > 0 ? '#dcfce7' : '#fef2f2',
                          color: s.cantidad > 0 ? '#16a34a' : '#dc2626',
                          fontWeight: '700', fontSize: '16px',
                        }}>
                          {s.cantidad} {s.cantidad !== 1 ? 'unidades' : 'unidad'}
                        </div>
                        <button onClick={() => setMostrarMovimiento(mostrarMovimiento === s.id ? null : s.id)} style={{ ...btnSecundario, fontSize: '12px', padding: '6px 12px' }}>
                          {mostrarMovimiento === s.id ? '✕' : '± Movimiento'}
                        </button>
                        <button onClick={() => {
                          setStockEditando(s.id)
                          setFormStock({ producto_id: String(s.productos?.id || ''), cantidad: String(s.cantidad), deposito_id: String(s.depositos?.id || '') })
                          setMostrarFormStock(true)
                        }} style={{ ...btnSecundario, fontSize: '12px', padding: '6px 12px' }}>
                          ✏️
                        </button>
                      </div>
                    </div>

                    {mostrarMovimiento === s.id && (
                      <div style={{
                        padding: '16px', background: 'white',
                        border: '1px solid #e5e7eb', borderTop: 'none',
                        borderRadius: '0 0 10px 10px',
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '10px', alignItems: 'end' }}>
                          <Field label="Tipo">
                            <select value={formMovimiento.tipo} onChange={(e) => setFormMovimiento({ ...formMovimiento, tipo: e.target.value })} style={inputStyle}>
                              <option value="entrada">📥 Entrada</option>
                              <option value="salida">📤 Salida</option>
                            </select>
                          </Field>
                          <Field label="Cantidad">
                            <input type="number" placeholder="0" value={formMovimiento.cantidad} onChange={(e) => setFormMovimiento({ ...formMovimiento, cantidad: e.target.value })} style={inputStyle} />
                          </Field>
                          <Field label="Concepto">
                            <input placeholder="Motivo del movimiento" value={formMovimiento.concepto} onChange={(e) => setFormMovimiento({ ...formMovimiento, concepto: e.target.value })} style={inputStyle} />
                          </Field>
                          <button onClick={() => guardarMovimiento(s.id)} style={{ ...btnPrimario, padding: '10px 16px', fontSize: '13px' }}>
                            💾
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
  fontSize: '15px', fontFamily: "'Outfit', sans-serif", background: 'white',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const card = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const cardTitle = { fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '16px' }
const statCard = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const statLabel = { fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }
const statNum = { fontSize: '28px', fontWeight: '700', color: '#1a1a1a' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnFantasma = { padding: '9px 16px', background: 'transparent', color: '#8B1E2D', border: '1px dashed #8B1E2D', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modalBox = { background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }
