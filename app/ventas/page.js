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

  const [series, setSeries] = useState([])
  const [seriesFiltradas, setSeriesFiltradas] = useState([])

  const [productos, setProductos] = useState([])

  const [derivadores, setDerivadores] = useState([])
  const [derivadorId, setDerivadorId] = useState('')

  const [modoConSerie, setModoConSerie] = useState(true)
  const [ventaId, setVentaId] = useState(null)

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
    obtenerDerivadores()

    const dniParam = searchParams.get('dni')

    if (dniParam) {
      setDni(dniParam)

      setTimeout(() => {
        buscarPacienteAutomatico(dniParam)
      }, 300)
    }
  }, [])

  async function obtenerSeries() {
    const { data } = await supabase
      .from('numeros_serie')
      .select(`
        id,
        numero_serie,
        producto_id,
        productos (producto),
        depositos (deposito)
      `)
      .eq('en_stock', true)
      .order('numero_serie', { ascending: true })

    setSeries(data || [])
  }

  async function obtenerProductos() {
    const { data } = await supabase
      .from('productos')
      .select(`
        id,
        producto,
        tipo_producto (requiere_serie)
      `)

    setProductos(data || [])
  }

  async function obtenerDerivadores() {
    const { data } = await supabase
      .from('derivadores')
      .select('*')
      .order('derivador')

    setDerivadores(data || [])
  }

  async function buscarPacienteAutomatico(dniValor) {
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .eq('dni', dniValor)
      .maybeSingle()

    if (data) setPaciente(data)
  }

  async function buscarPaciente() {
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .eq('dni', dni)
      .maybeSingle()

    if (!data) {
      const confirmar = confirm('Paciente no encontrado. ¿Querés crearlo?')
      if (confirmar) {
        window.location.href = `/pacientes?dni=${dni}&volver=ventas`
      }
      return
    }

    setPaciente(data)
  }

  function handleChange(e) {
    const { name, value } = e.target

    if (name === 'producto_id') {
      const prod = productos.find(p => p.id === Number(value))
      const requiereSerie = prod?.tipo_producto?.requiere_serie

      setModoConSerie(requiereSerie)

      const filtradas = series.filter(
        s => s.producto_id === Number(value)
      )

      setSeriesFiltradas(filtradas)

      setForm({
        ...form,
        producto_id: value,
        numero_serie_id: '',
      })

      return
    }

    setForm({
      ...form,
      [name]: value,
    })
  }

  async function agregarItem() {
    if (!paciente) return alert('Seleccionar paciente')

    if (!form.precio_pesos && !form.precio_usd) {
      return alert('Ingresar precio')
    }

    if (modoConSerie && !form.numero_serie_id) {
      return alert('Seleccionar serie')
    }

    if (!modoConSerie && !form.producto_id) {
      return alert('Seleccionar producto')
    }

    const fecha = new Date().toISOString()
    let ventaActualId = ventaId

    if (!ventaActualId) {
      const { data: venta } = await supabase
        .from('ventas')
        .insert([
          {
            paciente_id: paciente.id,
            fecha,
            derivador_id: derivadorId || null,
            creado_por: 1,
          },
        ])
        .select()
        .single()

      ventaActualId = venta.id
      setVentaId(ventaActualId)
    }

    const { data: detalle } = await supabase
      .from('venta_detalle')
      .insert([
        {
          venta_id: ventaActualId,
          numero_serie_id: modoConSerie ? Number(form.numero_serie_id) : null,
          precio_venta_pesos: form.precio_pesos || null,
          precio_venta_usd: form.precio_usd || null,
          creado_por: 1,
        },
      ])
      .select()
      .single()

    if (modoConSerie) {
      await supabase
        .from('numeros_serie')
        .update({
          en_stock: false,
          fecha_salida: fecha,
        })
        .eq('id', form.numero_serie_id)
    }

    setItems([
      ...items,
      {
        id: detalle.id,
        numero_serie_id: form.numero_serie_id,
        producto: modoConSerie
          ? series.find(s => s.id == form.numero_serie_id)?.productos?.producto
          : productos.find(p => p.id == form.producto_id)?.producto,
        serie: modoConSerie
          ? series.find(s => s.id == form.numero_serie_id)?.numero_serie
          : '-',
        precio_pesos: form.precio_pesos,
        precio_usd: form.precio_usd,
      },
    ])

    setForm({
      numero_serie_id: '',
      producto_id: '',
      precio_pesos: '',
      precio_usd: '',
    })

    obtenerSeries()
  }

  async function eliminarItem(item) {
    if (item.numero_serie_id) {
      await supabase
        .from('numeros_serie')
        .update({
          en_stock: true,
          fecha_salida: null,
        })
        .eq('id', item.numero_serie_id)
    }

    await supabase.from('venta_detalle').delete().eq('id', item.id)

    setItems(items.filter(i => i.id !== item.id))

    obtenerSeries()
  }

  function finalizarVenta() {
    if (!ventaId) return alert('No hay venta')

    alert('Venta finalizada')

    setVentaId(null)
    setPaciente(null)
    setDni('')
    setItems([])
    setDerivadorId('')
  }

  const totalPesos = items.reduce((acc, i) => acc + (Number(i.precio_pesos) || 0), 0)
  const totalUSD = items.reduce((acc, i) => acc + (Number(i.precio_usd) || 0), 0)

  return (
    <div style={{ padding: '30px', maxWidth: '700px' }}>
      <h1>Ventas</h1>

      <input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="DNI" />
      <button onClick={buscarPaciente}>Buscar</button>

      {paciente && (
        <div style={{ marginTop: '10px', border: '1px solid #ccc', padding: '10px' }}>
          <strong>
            {paciente.apellido_paciente} {paciente.nombres_paciente}
          </strong>

          <div>Tel: {paciente.telefono || '-'}</div>
          <div>Mail: {paciente.mail || '-'}</div>

          <button
            onClick={() =>
              (window.location.href = `/pacientes?dni=${paciente.dni}&volver=ventas`)
            }
          >
            Editar paciente
          </button>
        </div>
      )}

      <h3>Derivador</h3>

      <select value={derivadorId} onChange={(e) => setDerivadorId(e.target.value)}>
        <option value="">Sin derivador</option>
        {derivadores.map(d => (
          <option key={d.id} value={d.id}>
            {d.derivador}
          </option>
        ))}
      </select>

      <hr />

      <h3>Agregar producto</h3>

      <select name="producto_id" value={form.producto_id} onChange={handleChange}>
        <option value="">Seleccionar producto</option>
        {productos.map(p => (
          <option key={p.id} value={p.id}>
            {p.producto}
          </option>
        ))}
      </select>

      {modoConSerie && (
        <select name="numero_serie_id" value={form.numero_serie_id} onChange={handleChange}>
          <option value="">Seleccionar serie</option>
          {seriesFiltradas.map(s => (
            <option key={s.id} value={s.id}>
              {s.numero_serie} - {s.productos?.producto}
            </option>
          ))}
        </select>
      )}

      <input name="precio_pesos" placeholder="Precio en pesos" value={form.precio_pesos} onChange={handleChange} />
      <input name="precio_usd" placeholder="Precio en USD" value={form.precio_usd} onChange={handleChange} />

      <button onClick={agregarItem}>Agregar a venta</button>

      <hr />

      <h3>Carrito</h3>

      {items.map(item => (
        <div key={item.id}>
          {item.producto} | {item.serie} |{' '}
          {item.precio_pesos
            ? formatearPesos(item.precio_pesos)
            : formatearUSD(item.precio_usd)}
          <button onClick={() => eliminarItem(item)}>❌</button>
        </div>
      ))}

      <hr />

      <h3>Totales</h3>
      <div>Total Pesos: {formatearPesos(totalPesos)}</div>
      <div>Total USD: {formatearUSD(totalUSD)}</div>

      <button onClick={finalizarVenta}>Finalizar venta</button>
    </div>
  )
}
