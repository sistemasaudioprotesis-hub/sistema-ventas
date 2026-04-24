'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const SECCIONES = [
  { key: 'pacientes', label: 'Pacientes' },
  { key: 'agenda', label: 'Turnos / Agenda' },
  { key: 'reparaciones', label: 'Reparaciones' },
  { key: 'ventas', label: 'Ventas' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'caja', label: 'Caja' },
  { key: 'reportes', label: 'Reportes' },
  { key: 'stock_productos', label: 'Stock Productos' },
  { key: 'derivadores_reporte', label: 'Derivadores (reporte)' },
  { key: 'rentabilidad', label: 'Rentabilidad' },
  { key: 'stock_series', label: 'Stock Números de Serie' },
  { key: 'configuracion', label: 'Configuración' },
  { key: 'usuarios', label: 'Usuarios' },
]

const ROLES = ['admin', 'director', 'vendedor']

export default function Permisos() {
  const router = useRouter()
  const [permisos, setPermisos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('usuario')
    if (!stored) { router.push('/login'); return }
    const usuario = JSON.parse(stored)
    if (usuario.rol !== 'admin') { router.push('/'); return }
    cargarPermisos()
  }, [])

  async function cargarPermisos() {
    const { data } = await supabase.from('permisos').select('*')
    setPermisos(data || [])
    setCargando(false)
  }

  function tieneAcceso(rol, seccion) {
    const p = permisos.find(x => x.rol === rol && x.seccion === seccion)
    return p?.tiene_acceso ?? false
  }

  async function togglePermiso(rol, seccion) {
    // Admin no se puede modificar
    if (rol === 'admin') return

    const key = `${rol}-${seccion}`
    setGuardando(key)

    const actual = tieneAcceso(rol, seccion)
    const { data: existe } = await supabase.from('permisos').select('id').eq('rol', rol).eq('seccion', seccion).maybeSingle()

    if (existe) {
      await supabase.from('permisos').update({ tiene_acceso: !actual }).eq('rol', rol).eq('seccion', seccion)
    } else {
      await supabase.from('permisos').insert([{ rol, seccion, tiene_acceso: !actual }])
    }

    await cargarPermisos()
    setGuardando(null)
  }

  return (
    <div style={{ maxWidth: '760px' }}>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Permisos por rol</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Controlá qué puede ver cada rol. El rol admin siempre tiene acceso total.</p>
      </div>

      {cargando ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Cargando...</div>
      ) : (
        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left', width: '45%' }}>Sección</th>
                {ROLES.map(rol => (
                  <th key={rol} style={{ ...thStyle, textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', textTransform: 'capitalize' }}>{rol}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECCIONES.map((sec, i) => (
                <tr key={sec.key} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <td style={{ ...tdStyle, fontWeight: '500' }}>{sec.label}</td>
                  {ROLES.map(rol => {
                    const acceso = tieneAcceso(rol, sec.key)
                    const esAdmin = rol === 'admin'
                    const key = `${rol}-${sec.key}`
                    return (
                      <td key={rol} style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => togglePermiso(rol, sec.key)}
                          disabled={esAdmin || guardando === key}
                          style={{
                            width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                            cursor: esAdmin ? 'default' : 'pointer',
                            fontSize: '18px',
                            background: acceso ? '#dcfce7' : '#fef2f2',
                            opacity: guardando === key ? 0.5 : 1,
                            transition: '0.15s',
                          }}
                        >
                          {guardando === key ? '...' : acceso ? '✅' : '❌'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#9ca3af', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
            * Los cambios se guardan al instante. El rol admin siempre tiene acceso total y no se puede modificar.
          </div>
        </div>
      )}

    </div>
  )
}

const card = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const thStyle = { padding: '10px 12px', fontWeight: '600', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }
const tdStyle = { padding: '12px 12px', borderBottom: '1px solid #f3f4f6', color: '#1a1a1a', verticalAlign: 'middle' }
