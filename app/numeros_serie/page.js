'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function NumerosSerie() {
  const [productos, setProductos] = useState([])
  const [depositos, setDepositos] = useState([])

  const [form, setForm] = useState({
    producto_id: '',
    numero_serie: '',
    costo_usd: '',
    deposito_id: '',
  })

  useEffect(() => {
    obtenerProductos()
    obtenerDepositos()
  }, [])

  async function obtenerProductos() {
    const { data } = await supabase.from('productos').select('*')
    setProductos(data || [])
  }

  async function obtenerDepositos() {
    const { data } = await supabase.from('depositos').select('*')
    setDepositos(data || [])
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function guardar() {
    if (!form.producto_id || !form.numero_serie || !form.deposito_id) {
      alert('Completar campos obligatorios')
      return
    }

    // validar serie única
    const { data: existe } = await supabase
      .from('numeros_serie')
      .select('id')
      .eq('numero_serie', form.numero_serie)
      .maybeSingle()

    if (existe) {
      alert('Ese número de serie ya existe')
      return
    }

    const { error } = await supabase.from('numeros_serie').insert([
      {
        producto_id: Number(form.producto_id),
        numero_serie: form.numero_serie,
        costo_usd: form.costo_usd ? Number(form.costo_usd) : null,
        deposito_id: Number(form.deposito_id),
        en_stock: true,
        creado_por: 1,
      },
    ])

    if (error) {
      console.error(error)
      alert('Error al guardar')
      return
    }

    alert('Número de serie guardado')

    setForm({
      producto_id: '',
      numero_serie: '',
      costo_usd: '',
      deposito_id: '',
    })
  }

  return (
    <div style={{ padding: '30px', maxWidth: '600px' }}>
      <h1>Ingreso de Números de Serie</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <select name="producto_id" value={form.producto_id} onChange={handleChange}>
          <option value="">Seleccionar producto</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.producto}
            </option>
          ))}
        </select>

        <input
          name="numero_serie"
          placeholder="Número de serie"
          value={form.numero_serie}
          onChange={handleChange}
        />

        <input
          name="costo_usd"
          placeholder="Costo USD"
          value={form.costo_usd}
          onChange={handleChange}
        />

        <select name="deposito_id" value={form.deposito_id} onChange={handleChange}>
          <option value="">Seleccionar depósito</option>
          {depositos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.deposito}
            </option>
          ))}
        </select>

        <button onClick={guardar}>Guardar</button>
      </div>
    </div>
  )
}
