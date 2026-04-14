'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([])
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
 
  // cargar pacientes
  useEffect(() => {
    obtenerPacientes()
  }, [])

  async function obtenerPacientes() {
    const { data, error } = await supabase.from('pacientes').select('*')
    if (!error) setPacientes(data)
  }

  // agregar paciente
  async function agregarPaciente() {
    const { error } = await supabase.from('pacientes').insert([
      { nombre, apellido },
    ])

    if (!error) {
      setNombre('')
      setApellido('')
      obtenerPacientes()
    }
  }

  return (
    <div>
      <h1>Pacientes</h1>

      <input
        placeholder="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />

      <input
        placeholder="Apellido"
        value={apellido}
        onChange={(e) => setApellido(e.target.value)}
      />

      <button onClick={agregarPaciente}>Agregar</button>

      <ul>
        {pacientes.map((p) => (
          <li key={p.id}>
            {p.nombre} {p.apellido}
          </li>
        ))}
      </ul>
    </div>
  )
}
