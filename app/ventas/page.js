'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function Ventas() {
  const searchParams = useSearchParams()

  const [dni, setDni] = useState('')
  const [paciente, setPaciente] = useState(null)

  const [series, setSeries] = useState([])
  const [productos, setProductos] = useState([])

  const [modoConSerie, setModoConSerie] = useState(true)
  const [ventaId, setVentaId] = useState(null)

  const [items, setItems] = useState([]) // 🔥 carrito

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
        productos (producto),
        depositos (deposito)
      `)
      .eq('en_stock', true)

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
      if (confirmar) window.location.href = `/pacientes?dni=${dni}`
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

    // crear venta si no existe
    if (!ventaActualId) {
      const { data: venta } = await supabase
        .from('ventas')
        .insert([
          {
            paciente_id: paciente.id,
            fecha,
            creado_por: 1,
          },
        ])
        .select()
        .single()

      ventaActualId = venta.id
      setVentaId(ventaActualId)
    }

    // guardar detalle
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

    // actualizar stock
    if (modoConSerie) {
      await supabase
        .from('numeros_serie')
        .update({
          en_stock: false,
          fecha_salida: fecha,
        })
        .eq('id', form.numero_serie_id)
    }

    // 🔥 agregar al carrito visual
    setItems([
      ...items,
      {
        id: detalle.id,
        producto: modoConSerie
          ? series.find(s => s.id == form.numero_serie_id)?.productos?.producto
          : productos.find(p => p.id == form.producto_id)?.producto,
        serie: modoConSerie
          ? series.find(s => s.id == form.numero_serie_id)?.numero_serie
          : '-',
        precio: form.precio_pesos || form.precio_usd,
      },
    ])

    // limpiar form
    setForm({
      numero_serie_id: '',
      producto_id: '',
      precio_pesos: '',
      precio_usd: '',
    })

    obtenerSeries()
  }

  function finalizarVenta() {
    if (!ventaId) return alert('No hay venta')

    alert('Venta finalizada')

    setVentaId(null)
    setPaciente(null)
    setDni('')
    setItems([])
  }

  return (
    <div style={{ padding: '30px', maxWidth: '700px' }}>
      <h1>Ventas</h1>

      <input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="DNI" />
      <button onClick={buscarPaciente}>Buscar</button>

      {paciente && (
        <p>
          {paciente.apellido_paciente} {paciente.nombres_paciente}
        </p>
      )}

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
          {series.map(s => (
            <option key={s.id} value={s.id}>
              {s.numero_serie} - {s.productos?.producto}
            </option>
          ))}
        </select>
      )}

      <input
        name="precio_pesos"
        placeholder="Precio en pesos"
        value={form.precio_pesos}
        onChange={handleChange}
      />

      <input
        name="precio_usd"
        placeholder="Precio en USD"
        value={form.precio_usd}
        onChange={handleChange}
      />

      <button onClick={agregarItem}>Agregar a venta</button>

      <hr />

      <h3>Carrito</h3>

      {items.map(item => (
        <div key={item.id}>
          {item.producto} | {item.serie} | ${item.precio}
        </div>
      ))}

      <button onClick={finalizarVenta}>Finalizar venta</button>
    </div>
  )
}
