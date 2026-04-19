'use client'

export const dynamic = 'force-dynamic'

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
  const [seriesFiltradas, setSeriesFiltradas] = useState([])
  const [productos, setProductos] = useState([])
  const [modoConSerie, setModoConSerie] = useState(true)
  const [ventaId, setVentaId] = useState(null)
  const [ventaConfirmada, setVentaConfirmada] = useState(false)
  const [items, setItems] = useState([])

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
      .select(`id, numero_serie, producto_id, productos (producto), depositos (deposito)`)
      .eq('en_stock', true)
      .order('numero_serie')
    setSeries(data || [])
  }

  async function obtenerProductos() {
    const { data } = await supabase
      .from('productos')
      .select(`id, producto, tipo_producto (requiere_serie)`)
    setProductos(data || [])
  }

  async function buscarPacienteAutomatico(dniParam) {
    const { data } = await supabase.from('pacientes').select('*').eq('dni', Number(dniParam))
    if (data && data.length === 1) { setPaciente(data[0]); setDni(data[0].dni) }
    else if (data && data.length > 1) setResultados(data)
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
      const requiereSerie = prod?.tipo_producto?.requiere_serie
      setModoConSerie(requiereSerie)
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
      const { data: venta } = await supabase.from('ventas').insert([{ paciente_id: paciente.id, fecha, creado_por: 1, confirmada: false }]).select().single()
      ventaActualId = venta.id
      setVentaId(ventaActualId)
    }

    const { data: detalle } = await supabase.from('venta_detalle').insert([{
      venta_id: ventaActualId,
      numero_serie_id: modoConSerie ? Number(form.numero_serie_id) : null,
      producto_id: !modoConSerie ? Number(form.producto_id) : null,
      precio_venta_pesos: form.precio_pesos || null,
      precio_venta_usd: form.precio_usd || null,
      creado_por: 1,
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
    const { error } = await supabase.from('ventas').update({ confirmada: true, total_pesos: totalPesos, total_dolares: totalUSD }).eq('id', ventaId)
    if (error) { alert('Error: ' + error.message); return }
    setVentaConfirmada(true)
    alert('Venta confirmada')
  }

  function irAPagos() {
    if (!ventaConfirmada) { alert('Debe confirmar la venta primero'); return }
    window.location.href = `/pagos?venta_id=${ventaId}&dni=${dni}`
  }

  async function finalizarVenta() {
    if (!ventaId) return alert('No hay venta')
    const { error } = await supabase.from('ventas').update({ confirmada: true, total_pesos: totalPesos, total_dolares: totalUSD }).eq('id', ventaId)
    if (error) { alert('Error: ' + error.message); return }
    alert('Venta finalizada sin pagos')
    setVentaId(null); setPaciente(null); setDni(''); setItems([]); setVentaConfirmada(false)
  }

  const totalPesos = items.reduce((acc, i) => acc + (Number(i.precio_pesos) || 0), 0)
  const totalUSD = items.reduce((acc, i) => acc + (Number(i.precio_usd) || 0), 0)

  return (
    <div style={{ maxWidth: '750px' }}>

      {/* Título */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Ventas</h1>
        <p style={{ color: '#6b7280', marginTop: '6px', fontSize: '14px' }}>Registrar nueva venta</p>
      </div>

      {/* Buscador de paciente */}
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
          }} style={{ ...inputStyle, marginTop: '10px' }}>
            <option value="">Seleccionar paciente ({resultados.length} encontrados)</option>
            {resultados.map(p => (
              <option key={p.id} value={p.id}>{p.apellido_paciente} {p.nombres_paciente} — DNI: {p.dni}</option>
            ))}
          </select>
        )}

        {/* Info paciente seleccionado */}
        {paciente && (
          <div style={{
            marginTop: '14px',
            padding: '14px 16px',
            background: '#fdf2f4',
            borderRadius: '8px',
            border: '1px solid #f5c2c9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#8B1E2D' }}>
                {paciente.apellido_paciente} {paciente.nombres_paciente}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                DNI: {paciente.dni} {paciente.telefono ? `· Tel: ${paciente.telefono}` : ''} {paciente.mail ? `· ${paciente.mail}` : ''}
              </div>
            </div>
            <button onClick={() => window.location.href = `/pacientes?dni=${paciente.dni}&volver=ventas`} style={btnSecundario}>
              ✏️ Editar
            </button>
          </div>
        )}
      </div>

      {/* Agregar producto */}
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

      {/* Carrito */}
      <div style={card}>
        <div style={cardTitle}>🛒 Carrito</div>

        {items.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: '14px', padding: '10px 0' }}>No hay productos agregados</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map(item => (
              <div key={item.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a' }}>{item.producto}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Serie: {item.serie}
                    {item.precio_pesos && ` · ${formatearPesos(item.precio_pesos)}`}
                    {item.precio_usd && ` · USD ${formatearUSD(item.precio_usd)}`}
                  </div>
                </div>
                <button onClick={() => eliminarItem(item)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#ef4444'
                }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Totales */}
        {items.length > 0 && (
          <div style={{
            marginTop: '16px',
            padding: '14px 16px',
            background: '#1a1a1a',
            borderRadius: '10px',
            color: 'white',
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
          }}>
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

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
          <button onClick={confirmarVenta} style={btnPrimario}>✅ Confirmar venta</button>
          <button onClick={irAPagos} style={btnSecundario}>💳 Ingresar pago</button>
          <button onClick={finalizarVenta} style={btnSecundario}>Finalizar sin pagos</button>
        </div>

      </div>

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

