'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function Pagos() {
  const searchParams = useSearchParams()

  const ventaId = searchParams.get('venta_id')

  const [formasPago, setFormasPago] = useState([])

  const [form, setForm] = useState({
    forma_pago_id: '',
    monto_pesos: '',
    monto_usd: '',
  })

  useEffect(() => {
    obtenerFormasPago()
  }, [])

  async function obtenerFormasPago() {
    const { data } = await supabase
      .from('formas_pago')
      .select('*')
      .order('forma_pago')

    setFormasPago(data || [])
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function guardarPago() {
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
        venta_id: Number(ventaId),
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

    window.location.href = '/ventas'
  }

  return (
    <div style={{ padding: '30px', maxWidth: '600px' }}>
      <h1>Pagos</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <select name="forma_pago_id" value={form.forma_pago_id} onChange={handleChange}>
          <option value="">Seleccionar forma de pago</option>
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
    </div>
  )
}
