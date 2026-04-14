'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Pacientes() {
  const [nombre, setNombre] = useState('')
  const [dni, setDni] = useState('')

  const guardarPaciente = async () => {
    const { error } = await supabase
      .from('PACIENTES')
      .insert([{ NOMBRE_PACIENTE: nombre, DNI: dni }])

    if (error) {
      alert(error.message)
    } else {
      alert('Paciente guardado')
      setNombre('')
      setDni('')
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Pacientes</h1>

      <input
        placeholder="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />

      <input
        placeholder="DNI"
        value={dni}
        onChange={(e) => setDni(e.target.value)}
      />

      <button onClick={guardarPaciente}>
        Guardar
      </button>
    </div>
  )
}
