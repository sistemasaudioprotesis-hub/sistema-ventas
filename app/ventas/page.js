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

  const [form, setForm] = useState({
    numero_serie_id: '',
    precio_pesos: '',
  })

  useEffect(() => {
    obtenerSeries()

    const dniParam = searchParams.get('dni')

    if (dniParam) {
      setDni(dniParam)
    }
  }, [])

  async function obtenerSeries() {
    const { data } = await supabase
      .from('numeros_serie')
      .select('*')
      .eq('en_stock', true)

    setSeries(data || [])
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

      if (confirmar) {
        window.location.href = `/pacientes?dni=${dni}`
      }

      return
    }

    setPaciente(data)
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function guardarVenta() {
    if (!paciente || !form.numero_serie_id) {
      alert('Completar datos')
      return
    }

    const fecha = new Date().toISOString()

    // 1. crear venta
    const { data: venta, error: errorVenta } = await supabase
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

    if (errorVenta) {
      console.error(errorVenta)
      alert('Error al crear venta')
      return
    }

    // 2. crear detalle
    const { error: errorDetalle } = await supabase
      .from('venta_detalle')
      .insert([
        {
          venta_id: venta.id,
          numero_serie_id: Number(form.numero_serie_id),
          precio_venta_pesos: form.precio_pesos ? Number(form.precio_pesos) : null,
          creado_por: 1,
        },
      ])

    if (errorDetalle) {
      console.error(errorDetalle)
      alert('Error en detalle')
      return
    }

    // 3. actualizar stock
    await supabase
      .from('numeros_serie')
      .update({
        en_stock: false,
        fecha_salida: fecha,
      })
      .eq('id', form.numero_serie_id)

    alert('Venta registrada correctamente')

    // reset
    setPaciente(null)
    setDni('')
    setForm({
      numero_serie_id: '',
      precio_pesos: '',
    })

    obtenerSeries()
  }

  return (
    <div style={{ padding: '30px', maxWidth: '600px' }}>
      <h1>Ventas</h1>

      <h3>Buscar paciente</h3>

      <input
        placeholder="Ingresar DNI"
        value={dni}
        onChange={(e) => setDni(e.target.value)}
      />

      <button onClick={buscarPaciente}>Buscar</button>

      {paciente && (
        <div style={{ marginTop: '10px' }}>
          <strong>
            {paciente.apellido_paciente} {paciente.nombres_paciente}
          </strong>
        </div>
      )}

      <hr style={{ margin: '20px 0' }} />

      <h3>Venta</h3>

      <select
        name="numero_serie_id"
        value={form.numero_serie_id}
        onChange={handleChange}
      >
        <option value="">Seleccionar número de serie</option>
        {series.map((s) => (
          <option key={s.id} value={s.id}>
            {s.numero_serie}
          </option>
        ))}
      </select>

      <input
        name="precio_pesos"
        placeholder="Precio en pesos"
        value={form.precio_pesos}
        onChange={handleChange}
      />

      <button onClick={guardarVenta}>Guardar venta</button>
    </div>
  )
}
