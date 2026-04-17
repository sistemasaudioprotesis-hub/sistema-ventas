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
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
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
      setBusqueda(dniParam)
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
    setBusqueda('')
    setResultados([])

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
    if (!busqueda) {
      alert('Ingresar DNI o apellido')
      return
    }

    let query = supabase.from('pacientes').select('*')

    if (!isNaN(busqueda)) {
      query = query.eq('dni', busqueda)
    } else {
      query = query.ilike('apellido_paciente', `%${busqueda}%`)
    }

    const { data } = await query.order('apellido_paciente')

    if (!data || data.length === 0) {
      alert('No se encontraron resultados')
      setResultados([])
      return
    }

    setResultados(data)
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
      const { data: pacienteActual } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', pacienteId)
        .single()

      await supabase.from('pacientes_historial').insert([
        {
          paciente_id: pacienteId,
          apellido_paciente: pacienteActual.apellido_paciente,
          nombres_paciente: pacienteActual.nombres_paciente,
          telefono: pacienteActual.telefono,
          domicilio: pacienteActual.domicilio,
          localidad: pacienteActual.localidad,
          provincia_id: pacienteActual.provincia_id,
          mail: pacienteActual.mail,
          observaciones: pacienteActual.observaciones,
          creado_por: 1,
        },
      ])

      await supabase
        .from('pacientes')
        .update({
          ...form,
          provincia_id: Number(form.provincia_id),
        })
        .eq('id', pacienteId)

      alert('Paciente actualizado')
    } else {
      await supabase.from('pacientes').insert([
        {
          ...form,
          provincia_id: Number(form.provincia_id),
          creado_por: 1,
        },
      ])

      alert('Paciente creado')
    }

    if (destino === 'ventas') {
      window.location.href = `/ventas?dni=${form.dni}`
    }

    if (destino === 'pagos') {
      window.location.href = `/pagos?dni=${form.dni}`
    }

    if (!destino) {
      limpiarFormulario()
    }
  }

  return (
    <div style={{ padding: '30px', maxWidth: '600px' }}>
      <h1>Pacientes</h1>

      <h3>Buscar paciente</h3>

      <input
        placeholder="Buscar por DNI o Apellido"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <button onClick={buscarPaciente}>Buscar</button>

      {resultados.map(p => (
        <div
          key={p.id}
          style={{
            border: '1px solid #ddd',
            padding: '10px',
            marginTop: '5px',
            borderRadius: '8px',
            cursor: 'pointer',
            background: '#fafafa'
          }}
          onClick={() => {
            setPacienteId(p.id)

            setForm({
              apellido_paciente: p.apellido_paciente || '',
              nombres_paciente: p.nombres_paciente || '',
              dni: p.dni || '',
              telefono: p.telefono || '',
              domicilio: p.domicilio || '',
              localidad: p.localidad || '',
              provincia_id: p.provincia_id ? String(p.provincia_id) : '',
              mail: p.mail || '',
              observaciones: p.observaciones || '',
            })

            setResultados([])
          }}
        >
          <div><strong>{p.apellido_paciente}</strong></div>
          <div>{p.nombres_paciente}</div>
          <div>DNI: {p.dni}</div>
        </div>
      ))}

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
          <button onClick={() => guardar('')}>
            Guardar
          </button>

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
