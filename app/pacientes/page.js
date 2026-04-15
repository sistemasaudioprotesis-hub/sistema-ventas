'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function Pacientes() {
  const searchParams = useSearchParams()

  const [provincias, setProvincias] = useState([])
  const [busquedaDni, setBusquedaDni] = useState('')
  const [pacienteId, setPacienteId] = useState(null)

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

    const dniParam = searchParams.get('dni')

    if (dniParam) {
      setForm((prev) => ({
        ...prev,
        dni: dniParam,
      }))
    }
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

  function limpiarFormulario() {
    setPacienteId(null)
    setBusquedaDni('')
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
  }

  async function buscarPaciente() {
    if (!busquedaDni) {
      alert('Ingresar DNI')
      return
    }

    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('dni', busquedaDni)
      .maybeSingle()

    if (error) {
      console.error(error)
      alert('Error al buscar')
      return
    }

    if (!data) {
      alert('No se encontró paciente')
      return
    }

    setPacienteId(data.id)

    setForm({
      apellido_paciente: data.apellido_paciente || '',
      nombres_paciente: data.nombres_paciente || '',
      dni: data.dni || '',
      telefono: data.telefono || '',
      domicilio: data.domicilio || '',
      localidad: data.localidad || '',
      provincia_id: data.provincia_id ? String(data.provincia_id) : '',
      mail: data.mail || '',
      observaciones: data.observaciones || '',
    })
  }

  async function actualizarPaciente() {
    if (!pacienteId) {
      alert('Primero buscá un paciente')
      return
    }

    const { error } = await supabase
      .from('pacientes')
      .update({
        ...form,
        provincia_id: Number(form.provincia_id),
      })
      .eq('id', pacienteId)

    if (error) {
      console.error(error)
      alert('Error al actualizar')
      return
    }

    alert('Paciente actualizado correctamente')
  }

  async function agregarPaciente() {
    if (!form.apellido_paciente || !form.nombres_paciente || !form.dni || !form.provincia_id) {
      alert('Completar campos obligatorios')
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
      alert('Error al guardar')
      return
    }

    alert('Paciente guardado correctamente')

    // 🔥 volver a ventas con DNI
    window.location.href = `/ventas?dni=${form.dni}`
  }

  return (
    <div style={{ padding: '30px', maxWidth: '600px' }}>
      <h1>Pacientes</h1>

      <h3>Buscar por DNI</h3>
      <input
        placeholder="Ingresar DNI"
        value={busquedaDni}
        onChange={(e) => setBusquedaDni(e.target.value)}
      />
      <button onClick={buscarPaciente}>Buscar</button>
      <button onClick={limpiarFormulario}>Nuevo paciente</button>

      <hr style={{ margin: '20px 0' }} />

      <h3>Formulario</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input name="apellido_paciente" placeholder="Apellido" value={form.apellido_paciente} onChange={handleChange} />
        <input name="nombres_paciente" placeholder="Nombre" value={form.nombres_paciente} onChange={handleChange} />

        <input
          name="dni"
          placeholder="DNI"
          value={form.dni}
          onChange={handleChange}
          disabled={pacienteId !== null}
        />

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

        <button onClick={agregarPaciente}>Guardar nuevo</button>
        <button onClick={actualizarPaciente}>Actualizar paciente</button>
      </div>
    </div>
  )
}
