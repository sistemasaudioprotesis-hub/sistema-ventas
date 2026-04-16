'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function HistorialPacientes() {
  const [dni, setDni] = useState('')
  const [paciente, setPaciente] = useState(null)
  const [historial, setHistorial] = useState([])

  async function buscar() {
    if (!dni) {
      alert('Ingresar DNI')
      return
    }

    // 🔍 buscar paciente
    const { data: pacienteData } = await supabase
      .from('pacientes')
      .select('*')
      .eq('dni', dni)
      .maybeSingle()

    if (!pacienteData) {
      alert('Paciente no encontrado')
      return
    }

    setPaciente(pacienteData)

    // 🔍 traer historial
    const { data: historialData } = await supabase
      .from('pacientes_historial')
      .select('*')
      .eq('paciente_id', pacienteData.id)
      .order('created_at', { ascending: false })

    setHistorial(historialData || [])
  }

  return (
    <div style={{ padding: '30px', maxWidth: '800px' }}>
      <h1>Historial de Pacientes</h1>

      <input
        placeholder="DNI"
        value={dni}
        onChange={(e) => setDni(e.target.value)}
      />

      <button onClick={buscar}>Buscar</button>

      <hr />

      {paciente && (
        <div style={{ marginBottom: '20px' }}>
          <h3>
            {paciente.apellido_paciente} {paciente.nombres_paciente}
          </h3>
          <div>Tel: {paciente.telefono || '-'}</div>
          <div>Mail: {paciente.mail || '-'}</div>
        </div>
      )}

      <h3>Historial</h3>

      {historial.length === 0 && <div>No hay historial</div>}

      {historial.map((h) => (
        <div
          key={h.id}
          style={{
            border: '1px solid #ccc',
            padding: '10px',
            marginBottom: '10px',
            background: '#fafafa',
          }}
        >
          <div>
            <strong>
              {new Date(h.created_at).toLocaleString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
              })}
            </strong>
          </div>

          <div style={{ marginTop: '5px' }}>
            <strong>ANTES:</strong> {h.apellido_paciente} {h.nombres_paciente}
          </div>

          <div>Tel: {h.telefono || '-'}</div>
          <div>Mail: {h.mail || '-'}</div>
          <div>Domicilio: {h.domicilio || '-'}</div>
          <div>Localidad: {h.localidad || '-'}</div>
          <div>Observaciones: {h.observaciones || '-'}</div>
        </div>
      ))}
    </div>
  )
}
