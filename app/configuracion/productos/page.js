'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { fetchConToken } from '../../../lib/fetchConToken'
import { normalizarTexto } from '../../../lib/formatText'
import { usePermiso } from '../../../lib/usePermisos'

export default function ConfiguracionProductos() {
  const [tipos, setTipos] = useState([])
  const [productos, setProductos] = useState([])
  const [modelos, setModelos] = useState([])
  const [tab, setTab] = useState('tipos')
  const { verificando, permitido } = usePermiso('configuracion')

  const [mostrarFormTipo, setMostrarFormTipo] = useState(false)
  const [editandoTipo, setEditandoTipo] = useState(null)
  const [formTipo, setFormTipo] = useState({ tipo: '', requiere_serie: true })

  const [mostrarFormProducto, setMostrarFormProducto] = useState(false)
  const [editandoProducto, setEditandoProducto] = useState(null)
  const [formProducto, setFormProducto] = useState({ producto: '', tipo_id: '', controla_stock: false, requiere_modelo: false, activo: true })

  const [mostrarFormModelo, setMostrarFormModelo] = useState(false)
  const [editandoModelo, setEditandoModelo] = useState(null)
  const [formModelo, setFormModelo] = useState({ modelo: '', producto_id: '' })
  const [filtroProductoModelo, setFiltroProductoModelo] = useState('')

  useEffect(() => { obtenerDatos() }, [])

  if (verificando || !permitido) return null

  async function obtenerDatos() {
    const [resTipos, resProductos, resModelos] = await Promise.all([
      fetchConToken('/api/configuracion/tipos-producto'),
      fetchConToken('/api/configuracion/productos'),
      fetchConToken('/api/configuracion/modelos'),
    ])
    const [dTipos, dProductos, dModelos] = await Promise.all([resTipos.json(), resProductos.json(), resModelos.json()])
    setTipos(dTipos.tipos || [])
    setProductos(dProductos.productos || [])
    setModelos(dModelos.modelos || [])
  }

  // --- TIPOS ---
  function abrirNuevoTipo() { setEditandoTipo(null); setFormTipo({ tipo: '', requiere_serie: true }); setMostrarFormTipo(true) }
  function abrirEditarTipo(t) { setEditandoTipo(t); setFormTipo({ tipo: t.tipo || '', requiere_serie: t.requiere_serie ?? true }); setMostrarFormTipo(true) }
  function cerrarFormTipo() { setMostrarFormTipo(false); setEditandoTipo(null); setFormTipo({ tipo: '', requiere_serie: true }) }

  async function guardarTipo() {
    if (!formTipo.tipo) { alert('Ingresar nombre del tipo'); return }
    const body = { tipo: normalizarTexto(formTipo.tipo), requiere_serie: formTipo.requiere_serie }
    if (editandoTipo) await fetchConToken(`/api/configuracion/tipos-producto/${editandoTipo.id}`, { method: 'PUT', body: JSON.stringify(body) })
    else { const res = await fetchConToken('/api/configuracion/tipos-producto', { method: 'POST', body: JSON.stringify(body) }); if (!res.ok) { const d = await res.json(); alert('Error: ' + d.error); return } }
    cerrarFormTipo(); obtenerDatos()
  }

  // --- PRODUCTOS ---
  function abrirNuevoProducto() { setEditandoProducto(null); setFormProducto({ producto: '', tipo_id: '', controla_stock: false, requiere_modelo: false, activo: true }); setMostrarFormProducto(true) }
  function abrirEditarProducto(p) { setEditandoProducto(p); setFormProducto({ producto: p.producto || '', tipo_id: String(p.tipo_id || ''), controla_stock: p.controla_stock || false, requiere_modelo: p.requiere_modelo || false, activo: p.activo ?? true }); setMostrarFormProducto(true) }
  function cerrarFormProducto() { setMostrarFormProducto(false); setEditandoProducto(null); setFormProducto({ producto: '', tipo_id: '', controla_stock: false, requiere_modelo: false, activo: true }) }

  async function guardarProducto() {
    if (!formProducto.producto || !formProducto.tipo_id) { alert('Completar campos obligatorios'); return }
    const body = { producto: normalizarTexto(formProducto.producto), tipo_id: Number(formProducto.tipo_id), controla_stock: formProducto.controla_stock, requiere_modelo: formProducto.requiere_modelo, activo: formProducto.activo }
    if (editandoProducto) await fetchConToken(`/api/configuracion/productos/${editandoProducto.id}`, { method: 'PUT', body: JSON.stringify(body) })
    else { const res = await fetchConToken('/api/configuracion/productos', { method: 'POST', body: JSON.stringify(body) }); if (!res.ok) { const d = await res.json(); alert('Error: ' + d.error); return } }
    cerrarFormProducto(); obtenerDatos()
  }

  async function toggleActivoProducto(p) {
    await fetchConToken(`/api/configuracion/productos/${p.id}`, { method: 'PUT', body: JSON.stringify({ activo: !p.activo }) })
    obtenerDatos()
  }

  // --- MODELOS ---
  function abrirNuevoModelo() { setEditandoModelo(null); setFormModelo({ modelo: '', producto_id: filtroProductoModelo || '' }); setMostrarFormModelo(true) }
  function abrirEditarModelo(m) { setEditandoModelo(m); setFormModelo({ modelo: m.modelo || '', producto_id: String(m.producto_id || '') }); setMostrarFormModelo(true) }
  function cerrarFormModelo() { setMostrarFormModelo(false); setEditandoModelo(null); setFormModelo({ modelo: '', producto_id: '' }) }

  async function guardarModelo() {
    if (!formModelo.modelo || !formModelo.producto_id) { alert('Completar campos obligatorios'); return }
    const body = { modelo: normalizarTexto(formModelo.modelo), producto_id: Number(formModelo.producto_id), activo: true }
    if (editandoModelo) {
      await fetchConToken(`/api/configuracion/modelos/${editandoModelo.id}`, { method: 'PUT', body: JSON.stringify(body) })
    } else {
      const res = await fetchConToken('/api/configuracion/modelos', { method: 'POST', body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); alert('Error: ' + d.error); return }
    }
    cerrarFormModelo(); obtenerDatos()
  }

  async function toggleActivoModelo(m) {
    await fetchConToken(`/api/configuracion/modelos/${m.id}`, { method: 'PUT', body: JSON.stringify({ activo: !m.activo }) })
    obtenerDatos()
  }

  const productosConModelo = productos.filter(p => p.requiere_modelo)
  const modelosFiltrados = filtroProductoModelo ? modelos.filter(m => m.producto_id == filtroProductoModelo) : modelos

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Productos y Tipos</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>ABM de tipos de producto, productos y modelos</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['tipos', '🏷️ Tipos'], ['productos', '📦 Productos'], ['modelos', '🎯 Modelos']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: tab === val ? '#8B1E2D' : 'white', color: tab === val ? 'white' : '#374151', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>{label}</button>
        ))}
      </div>

      {/* TAB TIPOS */}
      {tab === 'tipos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={abrirNuevoTipo} style={btnPrimario}>+ Nuevo tipo</button>
          </div>
          {mostrarFormTipo && (
            <div style={card}>
              <div style={{ ...cardTitle, marginBottom: '16px' }}>{editandoTipo ? '✏️ Editar tipo' : '➕ Nuevo tipo'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Field label="Nombre del tipo *">
                  <input placeholder="Ej: AUDÍFONOS" value={formTipo.tipo} onChange={(e) => setFormTipo({ ...formTipo, tipo: e.target.value })} style={{ ...inputStyle, textTransform: 'uppercase' }} />
                </Field>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="requiere_serie" checked={formTipo.requiere_serie} onChange={(e) => setFormTipo({ ...formTipo, requiere_serie: e.target.checked })} />
                  <label htmlFor="requiere_serie" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>Requiere número de serie</label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
                <button onClick={guardarTipo} style={btnPrimario}>💾 Guardar</button>
                <button onClick={cerrarFormTipo} style={btnSecundario}>Cancelar</button>
              </div>
            </div>
          )}
          <div style={card}>
            <div style={{ ...cardTitle, marginBottom: '16px' }}>Tipos registrados <span style={{ fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>({tipos.length})</span></div>
            {tipos.length === 0 ? <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay tipos registrados</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tipos.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a' }}>{t.tipo}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{t.requiere_serie ? '🔢 Requiere número de serie' : '📦 Sin número de serie'}</div>
                    </div>
                    <button onClick={() => abrirEditarTipo(t)} style={{ ...btnSecundario, fontSize: '12px', padding: '6px 12px', color: '#8B1E2D', borderColor: '#f5c2c9' }}>✏️ Editar</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB PRODUCTOS */}
      {tab === 'productos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={abrirNuevoProducto} style={btnPrimario}>+ Nuevo producto</button>
          </div>
          {mostrarFormProducto && (
            <div style={card}>
              <div style={{ ...cardTitle, marginBottom: '16px' }}>{editandoProducto ? '✏️ Editar producto' : '➕ Nuevo producto'}</div>
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
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" id="controla_stock" checked={formProducto.controla_stock} onChange={(e) => setFormProducto({ ...formProducto, controla_stock: e.target.checked })} />
                    <label htmlFor="controla_stock" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>Controla stock</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" id="requiere_modelo" checked={formProducto.requiere_modelo} onChange={(e) => setFormProducto({ ...formProducto, requiere_modelo: e.target.checked })} />
                    <label htmlFor="requiere_modelo" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>Requiere modelo</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" id="activo" checked={formProducto.activo} onChange={(e) => setFormProducto({ ...formProducto, activo: e.target.checked })} />
                    <label htmlFor="activo" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>Activo</label>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
                <button onClick={guardarProducto} style={btnPrimario}>💾 Guardar</button>
                <button onClick={cerrarFormProducto} style={btnSecundario}>Cancelar</button>
              </div>
            </div>
          )}
          <div style={card}>
            <div style={{ ...cardTitle, marginBottom: '16px' }}>Productos registrados <span style={{ fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>({productos.length})</span></div>
            {productos.length === 0 ? <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay productos registrados</div> : (
              <div
