'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function HistorialPacientes() {
  const searchParams = useSearchParams()
  const dniParam = searchParams.get('dni')

  const [dni, setDni] = useState(dniParam || '')
  const [paciente, setPaciente] = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (dniParam) buscar(dniParam)
  }, [])

  async function buscar(dniValor) {
    const valor = (dniValor || dni).trim()
    if (!valor) { alert('Ingresar DNI'); return }

    setCargando(true)

    const { data: pacienteData } = await supabase
      .from('pacientes')
      .select('*')
      .eq('dni', valor)
      .maybeSingle()

    if (!pacienteData) {
      alert('Paciente no encontrado')
      setCargando(false)
      return
    }

    setPaciente(pacienteData)

    const { data: historialData } = await supabase
      .from('pacientes_historial')
      .select('*')
      .eq('paciente_id', pacienteData.id)
      .order('created_at', { ascending: false })

    setHistorial(historialData || [])
    setCargando(false)
  }

  return (
    <div style={{ maxWidth: '750px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Historial de Paciente</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Cambios registrados en los datos del paciente</p>
        </div>
        {paciente && (
          <a href={`/pacientes?dni=${paciente.dni}`} style={btnSecundario}>← Volver a Paciente</a>
        )}
      </div>

      {/* Buscador */}
      <div style={card}>
        <div style={cardTitle}>🔍 Buscar por DNI</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            placeholder="DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={() => buscar()} style={btnPrimario}>
            {cargando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Datos actuales del paciente */}
      {paciente && (
        <div style={{ ...card, borderLeft: '4px solid #8B1E2D' }}>
          <div style={cardTitle}>👤 Datos actuales</div>
          <div style={{ fontWeight: '700', fontSize: '18px', color: '#8B1E2D', marginBottom: '8px' }}>
            {paciente.apellido_paciente} {paciente.nombres_paciente}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <Info label="DNI" value={paciente.dni} />
            <Info label="Teléfono" value={paciente.telefono} />
            <Info label="Mail" value={paciente.mail} />
            <Info label="Localidad" value={paciente.localidad} />
            <Info label="Domicilio" value={paciente.domicilio} colspan />
          </div>
          {paciente.observaciones && (
            <div style={{ marginTop: '10px', padding: '10px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#6b7280' }}>
              <strong>Observaciones:</strong> {paciente.observaciones}
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      {paciente && (
        <div style={card}>
          <div style={cardTitle}>
            🕓 Historial de cambios
            <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '400', color: '#9ca3af' }}>
              ({historial.length} registro{historial.length !== 1 ? 's' : ''})
            </span>
          </div>

          {historial.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '14px', padding: '16px 0', textAlign: 'center' }}>
              No hay cambios registrados para este paciente
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {historial.map((h, i) => (
                <div key={h.id} style={{
                  padding: '14px 16px',
                  background: '#f9fafb',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  position: 'relative',
                }}>
                  {/* Badge número */}
                  <div style={{
                    position: 'absolute',
                    top: '14px',
                    right: '14px',
                    background: '#e5e7eb',
                    color: '#6b7280',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '20px',
                  }}>
                    #{historial.length - i}
                  </div>

                  {/* Fecha */}
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', fontWeight: '600' }}>
                    {new Date(h.created_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
                  </div>

                  {/* Datos del historial */}
                  <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a', marginBottom: '8px' }}>
                    {h.apellido_paciente} {h.nombres_paciente}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    <Info label="Teléfono" value={h.telefono} />
                    <Info label="Mail" value={h.mail} />
                    <Info label="Domicilio" value={h.domicilio} />
                    <Info label="Localidad" value={h.localidad} />
                  </div>
                  {h.observaciones && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                      <strong>Obs:</strong> {h.observaciones}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}

function Info({ label, value }) {
  return (
    <div style={{ fontSize: '13px' }}>
      <span style={{ color: '#9ca3af', fontWeight: '600' }}>{label}: </span>
      <span style={{ color: '#374151' }}>{value || '-'}</span>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  fontSize: '15px',
  fontFamily: "'Outfit', sans-serif",
  background: 'white',
  color: '#1a1a1a',
  outline: 'none',
  boxSizing: 'border-box',
}

const card = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '20px 24px',
  marginBottom: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const cardTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '14px',
}

const btnPrimario = {
  padding: '10px 20px',
  background: '#8B1E2D',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600',
  cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
  whiteSpace: 'nowrap',
}

const btnSecundario = {
  padding: '10px 20px',
  background: 'white',
  color: '#374151',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
  textDecoration: 'none',
  display: 'inline-block',
}

