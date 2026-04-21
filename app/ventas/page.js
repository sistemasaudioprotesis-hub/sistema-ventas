'use client'

export const dynamic = 'force-dynamic'

import { getUsuarioId } from '../../lib/getUsuario'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { formatearPesos, formatearUSD } from '../../lib/format'

export default function Ventas() {
  const searchParams = useSearchParams()

  const [dni, setDni] = useState('')
  const [paciente, setPaciente] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [series, setSeries] = useState([])
  const [seriesAll, setSeriesAll] = useState([]) // todas incluyendo vendidas para edición
  const [seriesFiltradas, setSeriesFiltradas] = useState([])
  const [productos, setProductos] = useState([])
  const [modoConSerie, setModoConSerie] = useState(true)
  const [ventaId, setVentaId] = useState(null)
  const [ventaConfirmada, setVentaConfirmada] = useState(false)
  const [items, setItems] = useState([])
  const [ventasPaciente, setVentasPaciente] = useState([])
  const [tab, setTab] = useState('nueva')

  // Edición
  const [ventaEditando, setVentaEditando] = useState(null)
  const [itemsEdicion, setItemsEdicion] = useState([])
  const [formEdicion, setFormEdicion] = useState({ producto_id: '', numero_serie_id: '', precio_pesos: '', precio_usd: '' })
  const [modoConSerieEdicion, setModoConSerieEdicion] = useState(true)
  const [seriesFiltradasEdicion, setSeriesFiltradasEdicion] = useState([])

  const [form, setForm] = useState({
    numero_serie_id: '',
    producto_id: '',
    precio_pesos: '',
    precio_usd: '',
  })

  useEffect(() => {
    obtenerSeries()
    obtenerProductos()
    const dniParam = searchParams.get('dni')
    if (dniParam) {
      setDni(dniParam)
      setTimeout(() => { buscarPacienteAutomatico(dniParam) }, 300)
    }
  }, [])

  async function obtenerSeries() {
    const { data } = await supabase
      .from('numeros_serie')
      .select(`id, numero_serie, producto_id, en_stock, productos (producto), depositos (deposito)`)
      .order('numero_serie')
    setSeriesAll(data || [])
    setSeries((data || []).filter(s => s.en_stock))
  }

  async function obtenerProductos() {
    const { data } = await supabase
      .from('productos')
      .select(`id, producto, tipo_producto (requiere_serie)`)
    setProductos(data || [])
  }

  async function buscarPacienteAutomatico(dniParam) {
    const { data } = await supabase.from('pacientes').select('*').eq('dni', Number(dniParam))
    if (data && data.length === 1) {
      setPaciente(data[0]); setDni(data[0].dni)
      cargarVentasPaciente(data[0].id)
    } else if (data && data.length > 1) setResultados(data)
  }

  async function cargarVentasPaciente(pacienteId) {
    const { data } = await supabase
      .from('ventas')
      .select(`
        id, fecha, confirmada, total_pesos, total_dolares,
        venta_detalle (
          id, precio_venta_pesos, precio_venta_usd, numero_serie_id, producto_id,
          numeros_serie (id, numero_serie, productos (producto)),
          productos (id, producto)
        )
      `)
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false })

    const ventasConSaldo = await Promise.all((data || []).map(async v => {
      const { data: pagos } = await supabase.from('pagos').select('monto_pesos, monto_usd').eq('venta_id', v.id)
      const pagadoP = (pagos || []).reduce((acc, p) => acc + (Number(p.monto_pesos) || 0), 0)
      const pagadoU = (pagos || []).reduce((acc, p) => acc + (Number(p.monto_usd) || 0), 0)
      return { ...v, pagadoPesos: pagadoP, pagadoUSD: pagadoU }
    }))

    setVentasPaciente(ventasConSaldo)
  }

  async function buscarPaciente() {
    const valor = busqueda.trim()
    if (!valor) { alert('Ingresar DNI o apellido'); return }

    let data, error
    if (/^\d+$/.test(valor)) {
      const res = await supabase.from('pacientes').select('*').eq('dni', Number(valor))
      data = res.data; error = res.error
    } else {
      const res = await supabase.from('pacientes').select('*').ilike('apellido_paciente', `%${valor}%`)
      data = res.data; error = res.error
    }

    if (error) { alert('Error buscando pacientes'); return }
    if (!data || data.length === 0) { alert('No se encontraron resultados'); setResultados([]); return }
    setResultados(data)
  }

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'producto_id') {
      const prod = productos.find(p => p.id === Number(value))
      setModoConSerie(prod?.tipo_producto?.requiere_serie)
      setSeriesFiltradas(series.filter(s => s.producto_id === Number(value)))
      setForm({ ...form, producto_id: value, numero_serie_id: '' })
      return
    }
    setForm({ ...form, [name]: value })
  }

  async function agregarItem() {
    if (!paciente) return alert('Seleccionar paciente')
    if (!form.precio_pesos && !form.precio_usd) return alert('Ingresar precio')
    if (modoConSerie && !form.numero_serie_id) return alert('Seleccionar serie')
    if (!modoConSerie && !form.producto_id) return alert('Seleccionar producto')

    const fecha = new Date().toISOString()
    let ventaActualId = ventaId

    if (!ventaActualId) {
      const { data: venta } = await supabase.from('ventas').insert([{
        paciente_id: paciente.id, fecha, creado_por: getUsuarioId(), confirmada: false
      }]).select().single()
      ventaActualId = venta.id
      setVentaId(ventaActualId)
    }

    const { data: detalle } = await supabase.from('venta_detalle').insert([{
      venta_id: ventaActualId,
      numero_serie_id: modoConSerie ? Number(form.numero_serie_id) : null,
      producto_id: !modoConSerie ? Number(form.producto_id) : null,
      precio_venta_pesos: form.precio_pesos || null,
      precio_venta_usd: form.precio_usd || null,
      creado_por: getUsuarioId(),
    }]).select().single()

    if (modoConSerie) {
      await supabase.from('numeros_serie').update({ en_stock: false, fecha_salida: fecha }).eq('id', form.numero_serie_id)
    }

    setItems([...items, {
      id: detalle.id,
      numero_serie_id: form.numero_serie_id,
      producto: modoConSerie
        ? series.find(s => s.id == form.numero_serie_id)?.productos?.producto
        : productos.find(p => p.id == form.producto_id)?.producto,
      serie: modoConSerie ? series.find(s => s.id == form.numero_serie_id)?.numero_serie : '-',
      precio_pesos: form.precio_pesos,
      precio_usd: form.precio_usd,
    }])

    setForm({ numero_serie_id: '', producto_id: '', precio_pesos: '', precio_usd: '' })
    obtenerSeries()
  }

  async function eliminarItem(item) {
    await supabase.from('venta_detalle').delete().eq('id', item.id)
    if (item.numero_serie_id) {
      await supabase.from('numeros_serie').update({ en_stock: true, fecha_salida: null }).eq('id', item.numero_serie_id)
    }
    setItems(items.filter(i => i.id !== item.id))
    obtenerSeries()
  }

  async function confirmarVenta() {
    if (!ventaId) return alert('No hay venta')
    const { error } = await supabase.from('ventas').update({
      confirmada: true, total_pesos: totalPesos, total_dolares: totalUSD
    }).eq('id', ventaId)
    if (error) { alert('Error: ' + error.message); return }
    setVentaConfirmada(true)
    alert('✅ Venta confirmada')
    if (paciente) cargarVentasPaciente(paciente.id)
  }

  function irAPagos() {
    if (!ventaConfirmada) { alert('Debe confirmar la venta primero'); return }
    window.location.href = `/pagos?venta_id=${ventaId}&dni=${dni}`
  }

  async function finalizarVenta() {
    if (!ventaId) return alert('No hay venta')
    const { error } = await supabase.from('ventas').update({
      confirmada: true, total_pesos: totalPesos, total_dolares: totalUSD
    }).eq('id', ventaId)
    if (error) { alert('Error: ' + error.message); return }
    alert('✅ Venta finalizada sin pagos')
    setVentaId(null); setPaciente(null); setDni(''); setItems([])
    setVentaConfirmada(false); setBusqueda(''); setVentasPaciente([])
  }

  // ---- EDICIÓN ----
  function abrirEdicion(venta) {
    setVentaEditando(venta)
    setItemsEdicion(venta.venta_detalle || [])
    setFormEdicion({ producto_id: '', numero_serie_id: '', precio_pesos: '', precio_usd: '' })
  }

  function cerrarEdicion() {
    setVentaEditando(null)
    setItemsEdicion([])
  }

  function handleChangeEdicion(e) {
    const { name, value } = e.target
    if (name === 'producto_id') {
      const prod = productos.find(p => p.id === Number(value))
      setModoConSerieEdicion(prod?.tipo_producto?.requiere_serie)
      // Para edición mostramos todas las series en stock + la que ya tiene ese item
      setSeriesFiltradasEdicion(seriesAll.filter(s => s.producto_id === Number(value) && (s.en_stock)))
      setFormEdicion({ ...formEdicion, producto_id: value, numero_serie_id: '' })
      return
    }
    setFormEdicion({ ...formEdicion, [name]: value })
  }

  async function guardarCambioItem(item, campo, valor) {
    // Guardar historial antes de modificar
    await supabase.from('venta_detalle_historial').insert([{
      venta_detalle_id: item.id,
      venta_id: ventaEditando.id,
      numero_serie_id: item.numero_serie_id,
      producto_id: item.producto_id,
      precio_venta_pesos: item.precio_venta_pesos,
      precio_venta_usd: item.precio_venta_usd,
      modificado_por: getUsuarioId(),
    }])

    const updateData = { [campo]: valor }

    // Si cambia el número de serie
    if (campo === 'numero_serie_id') {
      // Devolver el serie anterior al stock
      if (item.numero_serie_id) {
        await supabase.from('numeros_serie').update({ en_stock: true, fecha_salida: null }).eq('id', item.numero_serie_id)
      }
      // Marcar el nuevo serie como vendido
      if (valor) {
        await supabase.from('numeros_serie').update({ en_stock: false, fecha_salida: new Date().toISOString() }).eq('id', valor)
      }
    }

    await supabase.from('venta_detalle').update(updateData).eq('id', item.id)

    // Actualizar items en estado
    setItemsEdicion(itemsEdicion.map(i => i.id === item.id ? { ...i, [campo]: valor } : i))
    obtenerSeries()
  }

  async function eliminarItemEdicion(item) {
    if (!confirm('¿Eliminar este producto de la venta?')) return

    // Guardar historial
    await supabase.from('venta_detalle_historial').insert([{
      venta_detalle_id: item.id,
      venta_id: ventaEditando.id,
      numero_serie_id: item.numero_serie_id,
      producto_id: item.producto_id,
      precio_venta_pesos: item.precio_venta_pesos,
      precio_venta_usd: item.precio_venta_usd,
      modificado_por: getUsuarioId(),
    }])

    await supabase.from('venta_detalle').delete().eq('id', item.id)

    if (item.numero_serie_id) {
      await supabase.from('numeros_serie').update({ en_stock: true, fecha_salida: null }).eq('id', item.numero_serie_id)
    }

    setItemsEdicion(itemsEdicion.filter(i => i.id !== item.id))
    obtenerSeries()
  }

  async function agregarItemEdicion() {
    if (!formEdicion.precio_pesos && !formEdicion.precio_usd) return alert('Ingresar precio')
    if (modoConSerieEdicion && !formEdicion.numero_serie_id) return alert('Seleccionar serie')
    if (!modoConSerieEdicion && !formEdicion.producto_id) return alert('Seleccionar producto')

    const fecha = new Date().toISOString()

    const { data: detalle } = await supabase.from('venta_detalle').insert([{
      venta_id: ventaEditando.id,
      numero_serie_id: modoConSerieEdicion ? Number(formEdicion.numero_serie_id) : null,
      producto_id: !modoConSerieEdicion ? Number(formEdicion.producto_id) : null,
      precio_venta_pesos: formEdicion.precio_pesos || null,
      precio_venta_usd: formEdicion.precio_usd || null,
      creado_por: getUsuarioId(),
    }]).select().single()

    if (modoConSerieEdicion) {
      await supabase.from('numeros_serie').update({ en_stock: false, fecha_salida: fecha }).eq('id', formEdicion.numero_serie_id)
    }

    const nuevaSerieInfo = seriesAll.find(s => s.id == formEdicion.numero_serie_id)
    const nuevoProductoInfo = productos.find(p => p.id == formEdicion.producto_id)

    setItemsEdicion([...itemsEdicion, {
      id: detalle.id,
      numero_serie_id: modoConSerieEdicion ? Number(formEdicion.numero_serie_id) : null,
      producto_id: !modoConSerieEdicion ? Number(formEdicion.producto_id) : null,
      precio_venta_pesos: formEdicion.precio_pesos || null,
      precio_venta_usd: formEdicion.precio_usd || null,
      numeros_serie: nuevaSerieInfo ? { id: nuevaSerieInfo.id, numero_serie: nuevaSerieInfo.numero_serie, productos: nuevaSerieInfo.productos } : null,
      productos: nuevoProductoInfo ? { id: nuevoProductoInfo.id, producto: nuevoProductoInfo.producto } : null,
    }])

    setFormEdicion({ producto_id: '', numero_serie_id: '', precio_pesos: '', precio_usd: '' })
    obtenerSeries()
  }

  async function guardarTotalesVenta() {
    const nuevoTotalPesos = itemsEdicion.reduce((acc, i) => acc + (Number(i.precio_venta_pesos) || 0), 0)
    const nuevoTotalUSD = itemsEdicion.reduce((acc, i) => acc + (Number(i.precio_venta_usd) || 0), 0)

    // Guardar historial de la venta
    await supabase.from('ventas_historial').insert([{
      venta_id: ventaEditando.id,
      total_pesos: ventaEditando.total_pesos,
      total_dolares: ventaEditando.total_dolares,
      confirmada: ventaEditando.confirmada,
      modificado_por: getUsuarioId(),
    }])

    await supabase.from('ventas').update({
      total_pesos: nuevoTotalPesos,
      total_dolares: nuevoTotalUSD,
    }).eq('id', ventaEditando.id)

    alert('✅ Venta actualizada')
    cerrarEdicion()
    if (paciente) cargarVentasPaciente(paciente.id)
    obtenerSeries()
  }

  const totalPesos = items.reduce((acc, i) => acc + (Number(i.precio_pesos) || 0), 0)
  const totalUSD = items.reduce((acc, i) => acc + (Number(i.precio_usd) || 0), 0)
  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

  return (
    <div style={{ maxWidth: '750px' }}>

      {/* Título */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Ventas</h1>
        <p style={{ color: '#6b7280', marginTop: '6px', fontSize: '14px' }}>Registrar y gestionar ventas</p>
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
            cargarVentasPaciente(p.id)
          }} style={{ ...inputStyle, marginTop: '10px' }}>
            <option value="">Seleccionar paciente ({resultados.length} encontrados)</option>
            {resultados.map(p => (
              <option key={p.id} value={p.id}>{p.apellido_paciente} {p.nombres_paciente} — DNI: {p.dni}</option>
            ))}
          </select>
        )}

        {paciente && (
          <div style={{
            marginTop: '14px', padding: '14px 16px', background: '#fdf2f4',
            borderRadius: '8px', border: '1px solid #f5c2c9',
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

      {/* Tabs */}
      {paciente && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[['nueva', '➕ Nueva venta'], ['historial', `📋 Historial (${ventasPaciente.length})`]].map(([val, label]) => (
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
      )}

      {/* TAB NUEVA VENTA */}
      {tab === 'nueva' && (
        <>
          <div style={card}>
            <div style={cardTitle}>➕ Agregar producto</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Producto</label>
                <select name="producto_id" value={form.producto_id} onChange={handleChange} style={inputStyle}>
                  <option value="">Seleccionar producto</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.producto}</option>)}
                </select>
              </div>
              {modoConSerie && (
                <div>
                  <label style={labelStyle}>Número de serie</label>
                  <select name="numero_serie_id" value={form.numero_serie_id} onChange={handleChange} style={inputStyle}>
                    <option value="">Seleccionar serie</option>
                    {seriesFiltradas.map(s => <option key={s.id} value={s.id}>{s.numero_serie} — {s.productos?.producto}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={labelStyle}>Precio en pesos</label>
                <input name="precio_pesos" placeholder="$0" value={form.precio_pesos} onChange={handleChange} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Precio en USD</label>
                <input name="precio_usd" placeholder="USD 0" value={form.precio_usd} onChange={handleChange} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginTop: '14px' }}>
              <button onClick={agregarItem} style={btnPrimario}>+ Agregar al carrito</button>
            </div>
          </div>

          <div style={card}>
            <div style={cardTitle}>🛒 Carrito</div>
            {items.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', padding: '10px 0' }}>No hay productos agregados</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 14px', background: '#f9fafb',
                    borderRadius: '8px', border: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '8px',
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a' }}>{item.producto}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        Serie: {item.serie}
                        {item.precio_pesos && ` · ${formatearPesos(item.precio_pesos)}`}
                        {item.precio_usd && ` · USD ${formatearUSD(item.precio_usd)}`}
                      </div>
                    </div>
                    <button onClick={() => eliminarItem(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#ef4444' }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div style={{ marginTop: '16px', padding: '14px 16px', background: '#1a1a1a', borderRadius: '10px', color: 'white', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '11px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pesos</div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>{formatearPesos(totalPesos)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total USD</div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>{formatearUSD(totalUSD)}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
              <button onClick={confirmarVenta} style={btnPrimario}>✅ Confirmar venta</button>
              <button onClick={irAPagos} style={btnSecundario}>💳 Ingresar pago</button>
              <button onClick={finalizarVenta} style={btnSecundario}>Finalizar sin pagos</button>
            </div>
          </div>
        </>
      )}

      {/* TAB HISTORIAL */}
      {tab === 'historial' && !ventaEditando && (
        <div style={card}>
          <div style={cardTitle}>📋 Historial de ventas</div>
          {ventasPaciente.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
              No hay ventas registradas para este paciente
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ventasPaciente.map(v => {
                const saldoP = (v.total_pesos || 0) - v.pagadoPesos
                const saldoU = (v.total_dolares || 0) - v.pagadoUSD
                const pagada = saldoP <= 0 && saldoU <= 0

                return (
                  <div key={v.id} style={{ padding: '14px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a1a' }}>
                          Venta #{v.id} — {new Date(v.fecha).toLocaleDateString('es-AR')}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                          {v.total_pesos > 0 && `Total: ${fmt(v.total_pesos)}`}
                          {v.total_dolares > 0 && ` · U$S ${v.total_dolares}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                          background: pagada ? '#dcfce7' : '#fef2f2',
                          color: pagada ? '#16a34a' : '#dc2626',
                        }}>
                          {pagada ? '✅ Pagada' : `Saldo: ${saldoP > 0 ? fmt(saldoP) : `U$S ${saldoU}`}`}
                        </span>
                        {!pagada && (
                          <button onClick={() => window.location.href = `/pagos?venta_id=${v.id}&dni=${dni}`}
                            style={{ ...btnSecundario, fontSize: '12px', padding: '6px 12px' }}>
                            💳 Pagar
                          </button>
                        )}
                        <button onClick={() => abrirEdicion(v)}
                          style={{ ...btnSecundario, fontSize: '12px', padding: '6px 12px', color: '#8B1E2D', borderColor: '#f5c2c9' }}>
                          ✏️ Editar
                        </button>
                      </div>
                    </div>
                    {v.venta_detalle?.map(d => (
                      <div key={d.id} style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>
                        · {d.numeros_serie?.productos?.producto || d.productos?.producto || '-'}
                        {d.numeros_serie?.numero_serie ? ` (${d.numeros_serie.numero_serie})` : ''}
                        {d.precio_venta_pesos ? ` — ${fmt(d.precio_venta_pesos)}` : ''}
                        {d.precio_venta_usd ? ` — U$S ${d.precio_venta_usd}` : ''}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* EDICIÓN DE VENTA */}
      {tab === 'historial' && ventaEditando && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={cardTitle}>✏️ Editando Venta #{ventaEditando.id}</div>
            <button onClick={cerrarEdicion} style={{ ...btnSecundario, fontSize: '13px', padding: '6px 12px' }}>← Volver</button>
          </div>

          {/* Items actuales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {itemsEdicion.map(item => (
              <div key={item.id} style={{ padding: '14px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a', marginBottom: '10px' }}>
                  {item.numeros_serie?.productos?.producto || item.productos?.producto || '-'}
                  {item.numeros_serie?.numero_serie ? ` (${item.numeros_serie.numero_serie})` : ''}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Cambiar serie */}
                  {item.numero_serie_id && (
                    <div>
                      <label style={labelStyle}>Cambiar número de serie</label>
                      <select
                        value={item.numero_serie_id || ''}
                        onChange={(e) => guardarCambioItem(item, 'numero_serie_id', Number(e.target.value))}
                        style={inputStyle}
                      >
                        <option value={item.numero_serie_id}>
                          {item.numeros_serie?.numero_serie} (actual)
                        </option>
                        {seriesAll.filter(s => s.en_stock && s.producto_id === (item.numeros_serie?.productos ? seriesAll.find(x => x.id === item.numero_serie_id)?.producto_id : null)).map(s => (
                          <option key={s.id} value={s.id}>{s.numero_serie}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Cambiar precio pesos */}
                  <div>
                    <label style={labelStyle}>Precio pesos</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        defaultValue={item.precio_venta_pesos || ''}
                        onBlur={(e) => {
                          if (e.target.value !== String(item.precio_venta_pesos || '')) {
                            guardarCambioItem(item, 'precio_venta_pesos', e.target.value ? Number(e.target.value) : null)
                          }
                        }}
                        placeholder="$0"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Cambiar precio USD */}
                  <div>
                    <label style={labelStyle}>Precio USD</label>
                    <input
                      defaultValue={item.precio_venta_usd || ''}
                      onBlur={(e) => {
                        if (e.target.value !== String(item.precio_venta_usd || '')) {
                          guardarCambioItem(item, 'precio_venta_usd', e.target.value ? Number(e.target.value) : null)
                        }
                      }}
                      placeholder="U$S 0"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <button onClick={() => eliminarItemEdicion(item)} style={{ ...btnSecundario, fontSize: '12px', padding: '6px 12px', color: '#dc2626', borderColor: '#fecaca' }}>
                    🗑️ Eliminar producto
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Agregar nuevo producto a la venta */}
          <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px', border: '1px dashed #e5e7eb', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>➕ Agregar producto a esta venta</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Producto</label>
                <select name="producto_id" value={formEdicion.producto_id} onChange={handleChangeEdicion} style={inputStyle}>
                  <option value="">Seleccionar</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.producto}</option>)}
                </select>
              </div>
              {modoConSerieEdicion && (
                <div>
                  <label style={labelStyle}>Serie</label>
                  <select name="numero_serie_id" value={formEdicion.numero_serie_id} onChange={handleChangeEdicion} style={inputStyle}>
                    <option value="">Seleccionar serie</option>
                    {seriesFiltradasEdicion.map(s => <option key={s.id} value={s.id}>{s.numero_serie}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={labelStyle}>Precio pesos</label>
                <input name="precio_pesos" placeholder="$0" value={formEdicion.precio_pesos} onChange={handleChangeEdicion} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Precio USD</label>
                <input name="precio_usd" placeholder="U$S 0" value={formEdicion.precio_usd} onChange={handleChangeEdicion} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginTop: '10px' }}>
              <button onClick={agregarItemEdicion} style={{ ...btnSecundario, fontSize: '13px' }}>+ Agregar</button>
            </div>
          </div>

          {/* Guardar cambios */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
            <button onClick={guardarTotalesVenta} style={btnPrimario}>💾 Guardar cambios</button>
            <button onClick={cerrarEdicion} style={btnSecundario}>Cancelar</button>
          </div>
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
