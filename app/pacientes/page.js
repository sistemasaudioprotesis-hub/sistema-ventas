'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function Pacientes() {
  const searchParams = useSearchParams()

  const volver = searchParams.get('volver')
  const dniParam = searchParams.get('dni')

  const [provincias, setProvincias] = useState([])
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

    if (dniParam) {
      cargarPacientePorDni(dniParam)
    }
  }, [])

  async function obtenerProvincias() {
    const { data } = await supabase.from('provincias').select('*')
    setProvincias(data || [])
  }

  async function cargarPacientePorDni(dni) {
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .eq('dni', dni)
      .maybeSingle()

    if (data) {
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
    } else {
      setForm(prev => ({ ...prev, dni }))
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function guardar() {
    if (!form.apellido_paciente || !form.nombres_paciente || !form.dni) {
      alert('Completar campos obligatorios')
      return
    }

    if (pacienteId) {
      await supabase
        .from('pacientes')
        .update({ ...form, provincia_id: Number(form.provincia_id) })
        .eq('id', pacienteId)
    } else {
      await supabase.from('pacientes').insert([
        { ...form, provincia_id: Number(form.provincia_id), creado_por: 1 },
      ])
    }

    if (volver === 'ventas') {
      window.location.href = `/ventas?dni=${form.dni}`
    }
  }

  return (
    <div style={{ padding: '30px', maxWidth: '600px' }}>
      <h1>Pacientes</h1>

      <input name="apellido_paciente" value={form.apellido_paciente} onChange={handleChange} placeholder="Apellido" />
      <input name="nombres_paciente" value={form.nombres_paciente} onChange={handleChange} placeholder="Nombre" />
      <input name="dni" value={form.dni} disabled />

      <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" />
      <input name="domicilio" value={form.domicilio} onChange={handleChange} placeholder="Domicilio" />
      <input name="localidad" value={form.localidad} onChange={handleChange} placeholder="Localidad" />

      <select name="provincia_id" value={form.provincia_id} onChange={handleChange}>
        <option value="">Seleccionar provincia</option>
        {provincias.map(p => (
          <option key={p.id} value={p.id}>{p.provincia}</option>
        ))}
      </select>

      <input name="mail" value={form.mail} onChange={handleChange} placeholder="Mail" />
      <textarea name="observaciones" value={form.observaciones} onChange={handleChange} />

      <button onClick={guardar}>
        {pacienteId ? 'Actualizar paciente' : 'Guardar paciente'}
      </button>
    </div>
  )
}
