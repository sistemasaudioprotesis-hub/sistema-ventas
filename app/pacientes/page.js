'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([])
  const [provincias, setProvincias] = useState([])

  const [form, setForm] = useState({
    nombre_paciente: '',
    dni: '',
    telefono: '',
    domicilio: '',
    localidad: '',
    provincia_id: '',
    mail: '',
    observaciones: '',
  })

  useEffect(() => {
    obtenerPacientes()
    obtenerProvincias()
  }, [])

  async function obtenerPacientes() {
    const { data, error } = await supabase.from('pacientes').select('*')

    if (error) {
      console.error(error)
      return
    }

    setPacientes(data || [])
  }

  async function obtenerProvincias() {
    const { data, error } = await supabase.from('provincias').select('*')

    if (error) {
      console.error(error)
      return
    }

    setProvincias(data || [])
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function agregarPaciente() {
    if (!form.nombre_paciente) {
      alert('El nombre es obligatorio')
      return
    }

    if (!form.dni) {
      alert('El DNI es obligatorio')
      return
    }

    if (!form.provincia_id) {
      alert('Seleccionar provincia')
      return
    }

    const { data: existe } = await supabase
      .from('pacientes')
      .select('id')
      .eq('dni', form.dni)
      .maybeSingle()

    if (existe) {
      alert('Ya existe un paciente con ese DNI')
      return
    }

    const { error } = await supabase.from('pacientes').insert([
      {
        ...form,
        provincia_id: Number(form.provincia_id),
        creado_por: 1,
      },
    ])

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    setForm({
      nombre_paciente: '',
      dni: '',
      telefono: '',
      domicilio: '',
      localidad: '',
      provincia_id: '',
      mail: '',
      observaciones: '',
    })

    obtenerPacientes()
  }

  return (
    <div style={{ padding: '30px', maxWidth: '600px' }}>
      <h1>Alta de Pacientes</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input name="nombre_paciente" placeholder="Nombre" value={form.nombre_paciente} onChange={handleChange} />
        <input name="dni" placeholder="DNI" value={form.dni} onChange={handleChange} />
        <input name="telefono" placeholder="Teléfono" value={form.telefono} onChange={handleChange} />
        <input name="domicilio" placeholder="Domicilio" value={form.domicilio} onChange={handleChange} />
        <input name="localidad" placeholder="Localidad" value={form.localidad} onChange={handleChange} />

        <select name="provincia_id" value={form.provincia_id} onChange={handleChange}>
          <option value="">Seleccionar provincia</option>
          {provincias.map((p) => (
            <option key={p.id} value={p.id}>
              {p.provincia}
            </option>
          ))}
        </select>

        <input name="mail" placeholder="Mail" value={form.mail} onChange={handleChange} />
        <textarea name="observaciones" placeholder="Observaciones" value={form.observaciones} onChange={handleChange} />

        <button onClick={agregarPaciente}>Guardar paciente</button>
      </div>

      <hr style={{ margin: '30px 0' }} />

      <h2>Listado</h2>

      <ul>
        {pacientes.map((p) => (
          <li key={p.id}>
            {p.nombre_paciente} - {p.dni}
          </li>
        ))}
      </ul>
    </div>
  )
}
