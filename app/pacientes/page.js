'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Pacientes() {
  const [provincias, setProvincias] = useState([])

  const [form, setForm] = useState({
    apellido_paciente: '',
    nombres_paciente: '',
    dni: '',
    telefono: '',
    domicilio: '',
    localidad: '',
    provincia_id: '',
    mail: '',
    observaciones: '',
  })

  useEffect(() => {
    obtenerProvincias()
  }, [])

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
    if (!form.apellido_paciente) {
      alert('El apellido es obligatorio')
      return
    }

    if (!form.nombres_paciente) {
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

    // limpiar formulario
    setForm({
      apellido_paciente: '',
      nombres_paciente: '',
      dni: '',
      telefono: '',
      domicilio: '',
      localidad: '',
      provincia_id: '',
      mail: '',
      observaciones: '',
    })

    alert('Paciente guardado correctamente')
  }

  return (
    <div style={{ padding: '30px', maxWidth: '600px' }}>
      <h1>Alta de Pacientes</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input name="apellido_paciente" placeholder="Apellido" value={form.apellido_paciente} onChange={handleChange} />
        <input name="nombres_paciente" placeholder="Nombre" value={form.nombres_paciente} onChange={handleChange} />
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
    </div>
  )
}
