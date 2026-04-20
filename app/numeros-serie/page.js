'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { normalizarTexto } from '../../lib/formatText'

export default function NumerosSerie() {
  const [series, setSeries] = useState([])
  const [tipos, setTipos] = useState([])
  const [productos, setProductos] = useState([])
  const [productosFiltrados, setProductosFiltrados] = useState([])
  const [depositos, setDepositos] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('stock')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const [form, setForm] = useState({
    tipo_id: '',
    producto_id: '',
    numero_serie: '',
    costo_usd: '',
    deposito_id: '',
  })

  useEffect(() => {
    obtenerDatos()
  }, [])

  async function obtenerDatos() {
    const [{ data: seriesData }, { data: tiposData }, { data: productosData }, { data: depositosData }] = await Promise.all([
      supabase.from('numeros_serie').select(`
        id, numero_serie, costo_usd, en_stock, fecha_salida, created_at,
        productos (id, producto),
        depositos (id, deposito)
      `).order('created_at', { ascending: false }),
      supabase.from('tipo_producto').select('*').order('tipo'),
      supabase.from('productos').select('*').order('producto'),
      supabase.from('depositos').select('*').order('deposito'),
    ])

    setSeries(seriesData || [])
    setTipos(tiposData || [])
    setProductos(productosData || [])
    setDepositos(depositosData || [])
  }

  function handleChange(e) {
    const { name, value } = e.target

    if (name === 'tipo_id') {
      const filtrados = productos.filter(p => p.tipo_id === Number(value))
      setProductosFiltrados(filtrados)
      setForm({ ...form, tipo_id: value, producto_id: '' })
      return
    }

    if (name === 'numero_serie') {
      setForm({ ...form, numero_serie: normalizarTexto(value) })
      return
    }

    setForm({ ...form, [name]: value })
  }

  async function guardar() {
  if (!form.producto_id || !form.numero_serie || !form.deposito_id) {
    alert('Completar campos obligatorios')
    return
  }

  const numeroNormalizado = normalizarTexto(form.numero_serie)

  // Verificar duplicado ANTES de insertar
  const { data: existe } = await supabase
    .from('numeros_serie')
    .select('id')
    .eq('numero_serie', numeroNormalizado)
    .maybeSingle()

  if (existe) {
    alert('❌ Ese número de serie ya existe en el sistema')
    return
  }

  const { error } = await supabase.from('numeros_serie').insert([{
    producto_id: Number(form.producto_id),
    numero_serie: numeroNormalizado,
    costo_usd: form.costo_usd ? Number(form.costo_usd) : null,
    deposito_id: Number(form.deposito_id),
    en_stock: true,
    creado_por: 1,
  }])

  if (error) {
    alert('Error al guardar: ' + error.message)
    return
  }

  alert('✅ Número de serie guardado')
  setForm({ tipo_id: '', producto_id: '', numero_serie: '', costo_usd: '', deposito_id: '' })
  setProductosFiltrados([])
  setMostrarFormulario(false)
  obtenerDatos()
}

  // Filtros
  const seriesFiltradas = series.filter(s => {
    const estadoOk = filtroEstado === 'todos' ? true : filtroEstado === 'stock' ? s.en_stock : !s.en_stock
    const productoOk = filtroProducto ? s.productos?.id == filtroProducto : true
    return estadoOk && productoOk
  })

  const totalStock = series.filter(s => s.en_stock).length
  const totalVendidos = series.filter(s => !s.en_stock).length

  return (
    <div style={{ maxWidth: '850px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Números de Serie</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Control de stock por número de serie</p>
        </div>
        <button onClick={() => setMostrarFormulario(!mostrarFormulario)} style={btnPrimario}>
          {mostrarFormulario ? '✕ Cancelar' : '+ Agregar serie'}
        </button>
      </div>

      {/* Resumen */}
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

      {/* Formulario */}
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
              <input
                name="numero_serie"
                placeholder="Ej: SN-12345"
                value={form.numero_serie}
                onChange={handleChange}
                style={inputStyle}
              />
            </Field>

            <Field label="Costo USD">
              <input
                type="number"
                name="costo_usd"
                placeholder="0.00"
                value={form.costo_usd}
                onChange={handleChange}
                style={inputStyle}
              />
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

      {/* Filtros */}
      <div style={{ ...card, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[['stock', '✅ En stock'], ['vendido', '📦 Vendidos'], ['todos', 'Todos']].map(([val, label]) => (
              <button key={val} onClick={() => setFiltroEstado(val)} style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: filtroEstado === val ? '#8B1E2D' : 'white',
                color: filtroEstado === val ? 'white' : '#374151',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
              }}>
                {label}
              </button>
            ))}
          </div>

          <select value={filtroProducto} onChange={(e) => setFiltroProducto(e.target.value)} style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: '180px' }}>
            <option value="">Todos los productos</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.producto}</option>)}
          </select>
        </div>
      </div>

      {/* Lista */}
      <div style={card}>
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
          {seriesFiltradas.length} resultado{seriesFiltradas.length !== 1 ? 's' : ''}
        </div>

        {seriesFiltradas.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: '14px', padding: '20px 0', textAlign: 'center' }}>
            No hay series para mostrar
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {seriesFiltradas.map(s => (
              <div key={s.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                flexWrap: 'wrap',
                gap: '8px',
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
                  {s.fecha_salida && (
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                      Salida: {new Date(s.fecha_salida).toLocaleDateString('es-AR')}
                    </span>
                  )}
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
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

const statCard = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '16px 20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const statLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '4px',
}

const statNum = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#1a1a1a',
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
