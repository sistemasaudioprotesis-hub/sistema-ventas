'use client'

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
      console.error(error)
      return
    }

    setPacientes(data || [])
  }

  async function agregarPaciente() {
    const { error } = await supabase
      .from('pacientes')
      .insert([
        {
          nombre_paciente: nombrePaciente,
        },
      ])

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    setNombrePaciente('')
    obtenerPacientes()
  }

  return (
    <div>
      <h1>Pacientes</h1>

      <input
        placeholder="Nombre del paciente"
        value={nombrePaciente}
        onChange={(e) => setNombrePaciente(e.target.value)}
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
