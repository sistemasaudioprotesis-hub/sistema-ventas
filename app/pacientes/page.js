'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([])
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')

  useEffect(() => {
    obtenerPacientes()
  }, [])
  
  async function obtenerPacientes() {
    const { data } = await supabase.from('pacientes').select('*')
    setPacientes(data || [])
  }

  async function agregarPaciente() {
  const { data, error } = await supabase.from('pacientes').insert([
    { nombre, apellido },
  ])

  console.log('DATA:', data)
  console.log('ERROR:', error)

  if (error) {
    alert('Error: ' + error.message)
    return
  }

  setNombre('')
  setApellido('')
  obtenerPacientes()
}
    await supabase.from('pacientes').insert([
      { nombre, apellido },
    ])

    setNombre('')
    setApellido('')
    obtenerPacientes()
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
