'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { fetchConToken } from '../../lib/fetchConToken'
import { normalizarTexto } from '../../lib/formatText'
import { usePermiso } from '../../lib/usePermisos'

export default function NumerosSerie() {
  const [series, setSeries] = useState([])
  const [productos, setProductos] = useState([])
  const [productosFiltrados, setProductosFiltrados] = useState([])
  const [modelos, setModelos] = useState([])
  const [modelosFiltrados, setModelosFiltrados] = useState([])
  const [tipos, setTipos] = useState([])
  const [depositos, setDepositos] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('stock')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [filtroModelo, setFiltroModelo] = useState('')
  const [filtroDeposito, setFiltroDeposito] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [modoMasivo, setModoMasivo] = useState(false)
  const [seriesMasivas, setSeriesMasivas] = useState('')
  const [guardandoMasivo, setGuardandoMasivo] = useState(false)
  const { verificando, permitido } = usePermiso('stock_series')

  const [modalEditar, setModalEditar] = useState(null)
  const [formEditar, setFormEditar] = useState({ numero_serie: '', costo_usd: '', deposito_id: '' })

  const [form, setForm] = useState({ tipo_id: '', producto_id: '', modelo_id: '', numero_serie: '', costo_usd: '', deposito_id: '' })

  useEffect(() => { obtenerDatos() }, [])

  if (verificando || !permitido) return null

  async function obtenerDatos() {
    const [resSeries, resProductos, resTipos, resDepositos, resModelos] = await Promise.all([
      fetchConToken('/api/stock/series'),
      fetchConToken('/api/configuracion/productos'),
      fetchConToken('/api/configuracion/tipos-producto'),
      fetchConToken('/api/configuracion/depositos'),
      fetchConToken('/api/configuracion/modelos'),
    ])
    const [dSeries, dProductos, dTipos, dDepositos, dModelos] = await Promise.all([
      resSeries.json(), resProductos.json(), resTipos.json(), resDepositos.json(), resModelos.json()
    ])
    setSeries(dSeries.series || [])
    setProductos(dProductos.productos || [])
    setTipos(dTipos.tipos || [])
    setDepositos(dDepositos.depositos || [])
    setModelos(dModelos.modelos || [])
  }

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'tipo_id') {
      const filtrados = productos.filter(p => p.tipo_id === Number(value))
      setProductosFiltrados(filtrados)
      setModelosFiltrados([])
      setForm({ ...form, tipo_id: value, producto_id: '', modelo_id: '' })
      return
    }
    if (name === 'producto_id') {
      const prod = productos.find(p => p.id === Number(value))
      const mods = prod?.requiere_modelo ? modelos.filter(m => m.producto_id === Number(value) && m.activo) : []
      setModelosFiltrados(mods)
      setForm({ ...form, producto_id: value, modelo_id: '' })
      return
    }
    const nuevoValor = name === 'numero_serie' ? normalizarTexto(value) : value
    setForm({ ...form, [name]: nuevoValor })
  }

  async function guardar() {
    if (!form.producto_id || !form.numero_serie || !form.deposito_id) { alert('Completar campos obligatorios'); return }
    const prod = productos.find(p => p.id === Number(form.producto_id))
    if (prod?.requiere_modelo && !form.modelo_id) { alert('Seleccionar modelo'); return }
    const res = await fetchConToken('/api/stock/series', {
      method: 'POST',
      body: JSON.stringify({
        producto_id: Number(form.producto_id),
        modelo_id: form.modelo_id ? Number(form.modelo_id) : null,
        numero_serie: normalizarTexto(form.numero_serie),
        costo_usd: form.costo_usd ? Number(form.costo_usd) : null,
        deposito_id: Number(form.deposito_id),
      })
    })
    if (!res.ok) { alert('❌ Ese número de serie ya existe en el sistema'); return }
    alert('✅ Número de serie guardado')
    setForm({ tipo_id: '', producto_id: '', modelo_id: '', numero_serie: '', costo_usd: '', deposito_id: '' })
    setProductosFiltrados([])
    setModelosFiltrados([])
    setMostrarFormulario(false)
    obtenerDatos()
  }

  async function guardarMasivo() {
    if (!form.producto_id || !form.deposito_id) { alert('Seleccionar producto y depósito'); return }
    const prod = productos.find(p => p.id === Number(form.producto_id))
    if (prod?.requiere_modelo && !form.modelo_id) { alert('Seleccionar modelo'); return }
    const lineas = seriesMasivas.split('\n').map(l => l.trim()).filter(Boolean)
    if (lineas.length === 0) { alert('Ingresar al menos un número de serie'); return }
    setGuardandoMasivo(true)
    let ok = 0; let errores = []
    for (const linea of lineas) {
      const res = await fetchConToken('/api/stock/series', {
        method: 'POST',
        body: JSON.stringify({
          producto_id: Number(form.producto_id),
          modelo_id: form.modelo_id ? Number(form.modelo_id) : null,
          numero_serie: normalizarTexto(linea),
          costo_usd: form.costo_usd ? Number(form.costo_usd) : null,
          deposito_id: Number(form.deposito_id),
        })
      })
      if (res.ok) ok++
      else errores.push(normalizarTexto(linea))
    }
    setGuardandoMasivo(false)
    if (errores.length > 0) alert(`✅ ${ok} series guardadas\n❌ ${errores.length} duplicadas o con error:\n${errores.join('\n')}`)
    else alert(`✅ ${ok} series guardadas correctamente`)
    setSeriesMasivas('')
    setForm({ tipo_id: '', producto_id: '', modelo_id: '', numero_serie: '', costo_usd: '', deposito_id: '' })
    setProductosFiltrados([])
    setModelosFiltrados([])
    setMostrarFormulario(false)
    setModoMasivo(false)
    obtenerDatos()
  }

  function abrirEditar(s) {
    setModalEditar(s)
    setFormEditar({ numero_serie: s.numero_serie || '', costo_usd: s.costo_usd || '', deposito_id: String(s.depositos?.id || '') })
  }

  async function guardarEdicion() {
    if (!formEditar.numero_serie || !formEditar.deposito_id) { alert('Completar campos obligatorios'); return }
    const res = await fetchConToken(`/api/stock/series/${modalEditar.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        numero_serie: normalizarTexto(formEditar.numero_serie),
        costo_usd: formEditar.costo_usd ? Number(formEditar.costo_usd) : null,
        deposito_id: Number(formEditar.deposito_id),
      })
    })
    if (!res.ok) { const d = await res.json(); alert('Error: ' + d.error); return }
    setModalEditar(null)
    obtenerDatos()
  }

  const seriesFiltradas = series.filter(s => {
  const estadoOk = filtroEstado === 'todos' ? true : filtroEstado === 'stock' ? s.en_stock : !s.en_stock
  const productoOk = filtroProducto ? s.productos?.id == filtroProducto : true
  const modeloOk = filtroModelo ? s.modelo_id == filtroModelo : true
  const depositoOk = filtroDeposito ? s.depositos?.id == filtroDeposito : true
  return estadoOk && productoOk && modeloOk && depositoOk
})

  const totalStock = series.filter(s => s.en_stock).length
  const totalVendidos = series.filter(s => !s.en_stock).length

  return (
    <div style={{ maxWidth: '850px' }}>

      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Números de Serie</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Control de inventario por número de serie</p>
        </div>
        <button onClick={() => { setMostrarFormulario(!mostrarFormulario); setModoMasivo(false); setSeriesMasivas('') }} style={btnPrimario}>
          {mostrarFormulario ? '✕ Cancelar' : '+ Agregar serie'}
        </button>
      </div>

      {/* Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
        <div style={{ ...statCard, borderLeft: '4px solid #8B1E2D' }}><div style={statLabel}>Total</div><div style={statNum}>{series.length}</div></div>
        <div style={{ ...statCard, borderLeft: '4px solid #16a34a' }}><div style={statLabel}>En stock</div><div style={{ ...statNum, color: '#16a34a' }}>{totalStock}</div></div>
        <div style={{ ...statCard, borderLeft: '4px solid #6b7280' }}><div style={statLabel}>Vendidos</div><div style={statNum}>{totalVendidos}</div></div>
      </div>

      {/* Formulario */}
      {mostrarFormulario && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={cardTitle}>➕ Nueva serie</div>
            <button onClick={() => setModoMasivo(!modoMasivo)} style={{ ...btnFantasma, fontSize: '13px' }}>
              {modoMasivo ? '→ Carga individual' : '→ Carga masiva'}
            </button>
          </div>
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
            {modelosFiltrados.length > 0 && (
              <Field label="Modelo *">
                <select name="modelo_id" value={form.modelo_id} onChange={handleChange} style={inputStyle}>
                  <option value="">Seleccionar modelo</option>
                  {modelosFiltrados.map(m => <option key={m.id} value={m.id}>{m.modelo}</option>)}
                </select>
              </Field>
            )}
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

          {!modoMasivo ? (
            <div style={{ marginTop: '14px' }}>
              <Field label="Número de serie *">
                <input name="numero_serie" placeholder="Ej: SN-12345" value={form.numero_serie} onChange={handleChange} style={{ ...inputStyle, textTransform: 'uppercase' }} />
              </Field>
            </div>
          ) : (
            <div style={{ marginTop: '14px' }}>
              <Field label="Números de serie (uno por línea) *">
                <textarea
                  placeholder={'SN-001\nSN-002\nSN-003'}
                  value={seriesMasivas}
                  onChange={(e) => setSeriesMasivas(e.target.value)}
                  rows={6}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', textTransform: 'uppercase' }}
                />
              </Field>
              {seriesMasivas && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{seriesMasivas.split('\n').filter(l => l.trim()).length} series a cargar</div>}
            </div>
          )}

          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
            {!modoMasivo ? (
              <button onClick={guardar} style={btnPrimario}>💾 Guardar</button>
            ) : (
              <button onClick={guardarMasivo} disabled={guardandoMasivo} style={{ ...btnPrimario, opacity: guardandoMasivo ? 0.7 : 1 }}>
                {guardandoMasivo ? 'Guardando...' : `💾 Guardar ${seriesMasivas.split('\n').filter(l => l.trim()).length || 0} series`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ ...card, padding: '14px 20px' }}>
  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
    <div style={{ display: 'flex', gap: '6px' }}>
      {[['stock', '✅ En stock'], ['vendido', '📦 Vendidos'], ['todos', 'Todos']].map(([val, label]) => (
        <button key={val} onClick={() => setFiltroEstado(val)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', background: filtroEstado === val ? '#8B1E2D' : 'white', color: filtroEstado === val ? 'white' : '#374151', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>{label}</button>
      ))}
    </div>
    <select value={filtroProducto} onChange={(e) => { setFiltroProducto(e.target.value); setFiltroModelo('') }} style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: '180px' }}>
      <option value="">Todos los productos</option>
      {productos.map(p => <option key={p.id} value={p.id}>{p.producto}</option>)}
    </select>
    {filtroProducto && modelos.filter(m => m.producto_id == filtroProducto).length > 0 && (
      <select value={filtroModelo} onChange={(e) => setFiltroModelo(e.target.value)} style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: '180px' }}>
        <option value="">Todos los modelos</option>
        {modelos.filter(m => m.producto_id == filtroProducto).map(m => <option key={m.id} value={m.id}>{m.modelo}</option>)}
      </select>
    )}
    <select value={filtroDeposito} onChange={(e) => setFiltroDeposito(e.target.value)} style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: '180px' }}>
      <option value="">Todos los depósitos</option>
      {depositos.map(d => <option key={d.id} value={d.id}>{d.deposito}</option>)}
    </select>
  </div>
</div>

      {/* Lista */}
      <div style={card}>
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>{seriesFiltradas.length} resultado{seriesFiltradas.length !== 1 ? 's' : ''}</div>
        {seriesFiltradas.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: '14px', padding: '20px 0', textAlign: 'center' }}>No hay series para mostrar</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {seriesFiltradas.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a' }}>{s.numero_serie}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                    {s.productos?.producto || '-'}
                    {s.modelos?.modelo ? ` · ${s.modelos.modelo}` : ''}
                    {s.depositos?.deposito ? ` · ${s.depositos.deposito}` : ''}
                    {s.costo_usd ? ` · Costo: U$S ${s.costo_usd}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {s.fecha_salida && <span style={{ fontSize: '12px', color: '#9ca3af' }}>Salida: {new Date(s.fecha_salida).toLocaleDateString('es-AR')}</span>}
                  <button onClick={() => abrirEditar(s)} style={{ ...btnSecundario, fontSize: '12px', padding: '5px 10px', color: '#8B1E2D', borderColor: '#f5c2c9' }}>✏️ Editar</button>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: s.en_stock ? '#dcfce7' : '#f3f4f6', color: s.en_stock ? '#16a34a' : '#6b7280' }}>
                    {s.en_stock ? 'En stock' : 'Vendido'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL EDITAR */}
      {modalEditar && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '4px' }}>✏️ Editar serie</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              {modalEditar.productos?.producto}
              {modalEditar.modelos?.modelo ? ` · ${modalEditar.modelos.modelo}` : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Field label="Número de serie *">
                <input value={formEditar.numero_serie} onChange={(e) => setFormEditar({ ...formEditar, numero_serie: e.target.value })} style={{ ...inputStyle, textTransform: 'uppercase' }} />
              </Field>
              <Field label="Costo USD">
                <input type="number" placeholder="0.00" value={formEditar.costo_usd} onChange={(e) => setFormEditar({ ...formEditar, costo_usd: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="Depósito *">
                <select value={formEditar.deposito_id} onChange={(e) => setFormEditar({ ...formEditar, deposito_id: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar depósito</option>
                  {depositos.map(d => <option key={d.id} value={d.id}>{d.deposito}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={guardarEdicion} style={btnPrimario}>💾 Guardar</button>
              <button onClick={() => setModalEditar(null)} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
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
const cardTitle = { fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '0' }
const statCard = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const statLabel = { fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }
const statNum = { fontSize: '28px', fontWeight: '700', color: '#1a1a1a' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnFantasma = { padding: '9px 16px', background: 'transparent', color: '#8B1E2D', border: '1px dashed #8B1E2D', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modalBox = { background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }
