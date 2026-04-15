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
        productos (producto, tipo_id),
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
        tipo_id,
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
    if (!dni) {
      alert('Ingresar DNI')
      return
    }

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

  async function guardarVenta() {
    if (!paciente) {
      alert('Seleccionar paciente')
      return
    }

    if (!form.precio_pesos && !form.precio_usd) {
      alert('Ingresar precio')
      return
    }

    if (modoConSerie && !form.numero_serie_id) {
      alert('Seleccionar número de serie')
      return
    }

    if (!modoConSerie && !form.producto_id) {
      alert('Seleccionar producto')
      return
    }

    const fecha = new Date().toISOString()

    // 1. crear venta
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

    // 2. detalle
    await supabase.from('venta_detalle').insert([
      {
        venta_id: venta.id,
        numero_serie_id: modoConSerie ? Number(form.numero_serie_id) : null,
        precio_venta_pesos: form.precio_pesos ? Number(form.precio_pesos) : null,
        precio_venta_usd: form.precio_usd ? Number(form.precio_usd) : null,
        creado_por: 1,
      },
    ])

    // 3. actualizar stock si corresponde
    if (modoConSerie) {
      await supabase
        .from('numeros_serie')
        .update({
          en_stock: false,
          fecha_salida: fecha,
        })
        .eq('id', form.numero_serie_id)
    }

    alert('Venta registrada')

    setPaciente(null)
    setDni('')
    setForm({
      numero_serie_id: '',
      producto_id: '',
      precio_pesos: '',
      precio_usd: '',
    })

    obtenerSeries()
  }

  return (
    <div style={{ padding: '30px', maxWidth: '600px' }}>
      <h1>Ventas</h1>

      <input
        placeholder="DNI"
        value={dni}
        onChange={(e) => setDni(e.target.value)}
      />
      <button onClick={buscarPaciente}>Buscar</button>

      {paciente && (
        <p>
          {paciente.apellido_paciente} {paciente.nombres_paciente}
        </p>
      )}

      <hr />

      <h3>Detalle</h3>

      {/* PRODUCTO */}
      <select name="producto_id" value={form.producto_id} onChange={handleChange}>
        <option value="">Seleccionar producto</option>
        {productos.map(p => (
          <option key={p.id} value={p.id}>
            {p.producto}
          </option>
        ))}
      </select>

      {/* SERIE SOLO SI CORRESPONDE */}
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

      <button onClick={guardarVenta}>Guardar venta</button>
    </div>
  )
}
