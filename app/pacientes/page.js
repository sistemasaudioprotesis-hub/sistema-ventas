'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([])
  const [nombrePaciente, setNombrePaciente] = useState('')

  useEffect(() => {
    obtenerPacientes()
  }, [])

  async function obtenerPacientes() {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')

    if (error) {
      console.error('Error al obtener pacientes:', error)
      return
    }

    setPacientes(data || [])
  }

  async function agregarPaciente() {
    if (!nombrePaciente) {
      alert('El nombre es obligatorio')
      return
    }

    const { data, error } = await supabase
      .from('pacientes')
      .insert([
        {
          nombre_paciente: nombrePaciente,
          creado_por: 1, // temporal
        },
      ])
      .select()

    if (error) {
      console.error('Error al insertar:', error)
      alert('Error: ' + error.message)
      return
    }

    console.log('Insertado:', data)

    setNombrePaciente('')
    obtenerPacientes()
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Pacientes</h1>

      <input
        placeholder="Nombre del paciente"
        value={nombrePaciente}
        onChange={(e) => setNombrePaciente(e.target.value)}
        style={{ marginRight: '10px' }}
      />

      <button onClick={agregarPaciente}>Agregar</button>

      <ul>
        {pacientes.map((p) => (
          <li key={p.id}>
            {p.nombre_paciente}
          </li>
        ))}
      </ul>
    </div>
  )
}
