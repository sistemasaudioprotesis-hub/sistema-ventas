'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function NumerosSerie() {
  const [tipos, setTipos] = useState([])
  const [productos, setProductos] = useState([])
  const [productosFiltrados, setProductosFiltrados] = useState([])
  const [depositos, setDepositos] = useState([])

  const [form, setForm] = useState({
    tipo_id: '',
    producto_id: '',
    numero_serie: '',
    costo_usd: '',
    deposito_id: '',
  })

  useEffect(() => {
    obtenerTipos()
    obtenerProductos()
    obtenerDepositos()
  }, [])

  async function obtenerTipos() {
    const { data } = await supabase.from('tipo_producto').select('*')
    setTipos(data || [])
  }

  async function obtenerProductos() {
    const { data } = await supabase.from('productos').select('*')
    setProductos(data || [])
  }

  async function obtenerDepositos() {
    const { data } = await supabase.from('depositos').select('*')
    setDepositos(data || [])
  }

  function handleChange(e) {
    const { name, value } = e.target

    if (name === 'tipo_id') {
      const filtrados = productos.filter(p => p.tipo_id === Number(value))

      setProductosFiltrados(filtrados)

      setForm({
        ...form,
        tipo_id: value,
        producto_id: '', // reset producto
      })

      return
    }

    setForm({
      ...form,
      [name]: value,
    })
  }

  async function guardar() {
    if (!form.producto_id || !form.numero_serie || !form.deposito_id) {
      alert('Completar campos obligatorios')
      return
    }

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
      tipo_id: '',
      producto_id: '',
      numero_serie: '',
      costo_usd: '',
      deposito_id: '',
    })

    setProductosFiltrados([])
  }

  return (
    <div style={{ padding: '30px', maxWidth: '600px' }}>
      <h1>Ingreso de Números de Serie</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        <select name="tipo_id" value={form.tipo_id} onChange={handleChange}>
          <option value="">Seleccionar tipo de producto</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.tipo}
            </option>
          ))}
        </select>

        <select name="producto_id" value={form.producto_id} onChange={handleChange}>
          <option value="">Seleccionar producto</option>
          {productosFiltrados.map((p) => (
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
          type="number"
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
