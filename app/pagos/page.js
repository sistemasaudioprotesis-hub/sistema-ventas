'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function Pagos() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const ventaIdParam = searchParams.get('venta_id')

  const [dni, setDni] = useState('')
  const [paciente, setPaciente] = useState(null)

  const [ventas, setVentas] = useState([])
  const [ventaSeleccionada, setVentaSeleccionada] = useState(ventaIdParam || '')

  const [formasPago, setFormasPago] = useState([])

  const [form, setForm] = useState({
    forma_pago_id: '',
    monto_pesos: '',
    monto_usd: '',
  })

  useEffect(() => {
    obtenerFormasPago()

    if (ventaIdParam) {
      setVentaSeleccionada(ventaIdParam)
    }
  }, [])

  async function obtenerFormasPago() {
    const { data } = await supabase
      .from('formas_pago')
      .select('*')
      .order('forma_pago')

    setFormasPago(data || [])
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
      alert('Paciente no encontrado')
      return
    }

    setPaciente(data)

    // 🔥 traer ventas del paciente
    const { data: ventasData } = await supabase
      .from('ventas')
      .select('*')
      .eq('paciente_id', data.id)
      .order('fecha', { ascending: false })

    setVentas(ventasData || [])
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function guardarPago() {
    if (!ventaSeleccionada) {
      alert('Seleccionar venta')
      return
    }

    if (!form.monto_pesos && !form.monto_usd) {
      alert('Debe ingresar monto en pesos o USD')
      return
    }

    if (!form.forma_pago_id) {
      alert('Seleccionar forma de pago')
      return
    }

    const { error } = await supabase.from('pagos').insert([
      {
        venta_id: Number(ventaSeleccionada),
        fecha_pago: new Date().toISOString(),
        forma_pago_id: Number(form.forma_pago_id),
        monto_pesos: form.monto_pesos || null,
        monto_usd: form.monto_usd || null,
        creado_por: 1,
      },
    ])

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    alert('Pago registrado')

    router.replace('/ventas')
  }

  return (
    <div style={{ padding: '30px', maxWidth: '700px' }}>
      <h1>Pagos</h1>

      <h3>Buscar paciente</h3>

      <input
        placeholder="DNI"
        value={dni}
        onChange={(e) => setDni(e.target.value)}
      />

      <button onClick={buscarPaciente}>
        Buscar
      </button>

      {paciente && (
        <div style={{ marginTop: '10px', border: '1px solid #ccc', padding: '10px' }}>
          <strong>
            {paciente.apellido_paciente} {paciente.nombres_paciente}
          </strong>

          <div>Tel: {paciente.telefono || '-'}</div>
          <div>Mail: {paciente.mail || '-'}</div>

          <button
            onClick={() =>
              (window.location.href = `/pacientes?dni=${paciente.dni}&volver=pagos`)
            }
          >
            Editar paciente
          </button>
        </div>
      )}

      <hr />

      <h3>Seleccionar venta</h3>

      <select
        value={ventaSeleccionada}
        onChange={(e) => setVentaSeleccionada(e.target.value)}
      >
        <option value="">Seleccionar venta</option>

        {ventas.map(v => (
          <option key={v.id} value={v.id}>
            Venta #{v.id} - {new Date(v.fecha).toLocaleDateString()}
          </option>
        ))}
      </select>

      <hr />

      <h3>Cargar pago</h3>

      <select
        name="forma_pago_id"
        value={form.forma_pago_id}
        onChange={handleChange}
      >
        <option value="">Forma de pago</option>
        {formasPago.map(f => (
          <option key={f.id} value={f.id}>
            {f.forma_pago}
          </option>
        ))}
      </select>

      <input
        name="monto_pesos"
        placeholder="Monto en pesos"
        value={form.monto_pesos}
        onChange={handleChange}
      />

      <input
        name="monto_usd"
        placeholder="Monto en USD"
        value={form.monto_usd}
        onChange={handleChange}
      />

      <button onClick={guardarPago}>
        Guardar pago
      </button>
    </div>
  )
}
