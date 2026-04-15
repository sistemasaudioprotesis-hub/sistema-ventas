'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { normalizarTexto } from '../../lib/formatText'

export default function Pacientes() {
  const searchParams = useSearchParams()

  const dniParam = searchParams.get('dni')

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

    if (dniParam) {
      setBusquedaDni(dniParam)
      cargarPacientePorDni(dniParam)
    }
  }, [])

  async function obtenerProvincias() {
    const { data } = await supabase.from('provincias').select('*')
    setProvincias(data || [])
  }

  function handleChange(e) {
    const { name, value } = e.target

    const camposTexto = [
      'apellido_paciente',
      'nombres_paciente',
      'domicilio',
      'localidad',
      'observaciones',
      'mail',
    ]

    const nuevoValor = camposTexto.includes(name)
      ? normalizarTexto(value)
      : value

    setForm({
      ...form,
      [name]: nuevoValor,
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

    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .eq('dni', busquedaDni)
      .maybeSingle()

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
      setForm((prev) => ({
        ...prev,
        dni: dni,
      }))
    }
  }

  async function guardar(destino) {
    if (!form.apellido_paciente || !form.nombres_paciente || !form.dni) {
      alert('Completar campos obligatorios')
      return
    }

    if (!form.provincia_id) {
      alert('Seleccionar provincia')
      return
    }

    if (pacienteId) {
      const { error } = await supabase
        .from('pacientes')
        .update({
          ...form,
          provincia_id: Number(form.provincia_id),
        })
        .eq('id', pacienteId)

      if (error) {
        alert('Error: ' + error.message)
        return
      }

      alert('Paciente actualizado')
    } else {
      const { error } = await supabase.from('pacientes').insert([
        {
          ...form,
          provincia_id: Number(form.provincia_id),
          creado_por: 1,
        },
      ])

      if (error) {
        alert('Error: ' + error.message)
        return
      }

      alert('Paciente creado')
    }

    if (destino === 'ventas') {
      window.location.href = `/ventas?dni=${form.dni}`
    }

    if (destino === 'pagos') {
      window.location.href = `/pagos?dni=${form.dni}`
    }
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
          {provincias.map(p => (
            <option key={p.id} value={p.id}>
              {p.provincia}
            </option>
          ))}
        </select>

        <input name="mail" placeholder="Mail" value={form.mail} onChange={handleChange} />
        <textarea name="observaciones" placeholder="Observaciones" value={form.observaciones} onChange={handleChange} />

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => guardar('ventas')}>
            Guardar y volver a ventas
          </button>

          <button onClick={() => guardar('pagos')}>
            Guardar y volver a pagos
          </button>
        </div>
      </div>
    </div>
  )
}
