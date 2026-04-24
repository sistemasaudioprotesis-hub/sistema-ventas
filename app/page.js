'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const [permisos, setPermisos] = useState(null)
  const [rol, setRol] = useState(null)

  useEffect(() => {
    async function cargar() {
      const stored = localStorage.getItem('usuario')
      if (!stored) return
      const usuario = JSON.parse(stored)
      setRol(usuario.rol)
      if (usuario.rol === 'admin') { setPermisos('admin'); return }
      const { data } = await supabase.from('permisos').select('seccion, tiene_acceso').eq('rol', usuario.rol)
      setPermisos(data || [])
    }
    cargar()
  }, [])

  function puedeVer(seccion) {
    if (!seccion) return true // sin restricción
    if (permisos === 'admin') return true
    if (!permisos) return false
    const p = permisos.find(x => x.seccion === seccion)
    return p?.tiene_acceso ?? false
  }

  const sections = [
    {
      title: 'Pacientes',
      items: [
        {
          href: '/pacientes', label: 'Gestión de Pacientes', desc: 'Alta, búsqueda y edición',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
        },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        {
          href: '/agenda', label: 'Turnos', desc: 'Agenda y calendario semanal',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
        },
        {
          href: '/reparaciones', label: 'Reparaciones', desc: 'Seguimiento de equipos en reparación',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
        },
        {
          href: '/ventas', label: 'Ventas', desc: 'Registrar y gestionar ventas',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
        },
        {
          href: '/pagos', label: 'Pagos', desc: 'Gestionar pagos y saldos',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
        },
        {
          href: '/caja', label: 'Caja', desc: 'Movimientos diarios',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
        },
      ],
    },
    {
      title: 'Información',
      items: [
        {
          href: '/reportes', label: 'Reportes', desc: 'Ventas, pagos y caja por período',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
        },
        {
          href: '/derivadores-reporte', label: 'Derivadores', desc: 'Comisiones pendientes y pagadas',
          seccion: 'derivadores_reporte',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
        },
        {
          href: '/rentabilidad', label: 'Rentabilidad', desc: 'Ganancia por venta y producto',
          seccion: 'rentabilidad',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
        },
      ],
    },
    {
      title: 'Stock',
      items: [
        {
          href: '/numeros_serie', label: 'Números de Serie', desc: 'Control de stock',
          seccion: 'stock_series',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
        },
        {
          href: '/stock-productos', label: 'Stock Productos', desc: 'Control de stock por unidad',
          seccion: 'stock_productos',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><line x1="3.27" y1="6.96" x2="12" y2="12.01"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
        },
      ],
    },
    {
      title: 'Configuración',
      items: [
        {
          href: '/obras-sociales', label: 'Obras Sociales', desc: 'Gestión de obras sociales',
          seccion: 'configuracion',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
        },
        {
          href: '/formas-pago', label: 'Formas de Pago', desc: 'Gestión de medios de cobro',
          seccion: 'configuracion',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
        },
        {
          href: '/derivadores', label: 'Derivadores', desc: 'Gestión de derivadores y comisiones',
          seccion: 'configuracion',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
        },
        {
          href: '/usuarios', label: 'Usuarios', desc: 'Gestión de accesos',
          seccion: 'usuarios',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
        },
        {
          href: '/permisos', label: 'Permisos', desc: 'Control de acceso por rol',
          seccion: 'usuarios',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
        },
      ],
    },
  ]

  // Mientras carga permisos no mostrar nada
  if (permisos === null) return null

  return (
    <div>
      <div style={{
        marginBottom: '36px', padding: '28px 32px',
        background: 'linear-gradient(135deg, #8B1E2D 0%, #b02038 100%)',
        borderRadius: '16px', color: 'white',
      }}>
        <div style={{ fontSize: '13px', fontWeight: '600', opacity: 0.7, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Sistema de Gestión</div>
        <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>AudioProtesis</div>
        <div style={{ fontSize: '14px', opacity: 0.75 }}>Quilmes, Buenos Aires</div>
      </div>

      {sections.map(section => {
        const itemsVisibles = section.items.filter(item => puedeVer(item.seccion))
        if (itemsVisibles.length === 0) return null
        return (
          <div key={section.title} style={{ marginBottom: '36px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px', paddingLeft: '4px' }}>
              {section.title}
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              {itemsVisibles.map(item => (
                <a key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px',
                      padding: '22px 24px', minWidth: '190px', maxWidth: '220px',
                      cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      display: 'flex', flexDirection: 'column', gap: '14px',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#8B1E2D'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(139,30,45,0.12)'
                      e.currentTarget.style.transform = 'translateY(-3px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#8B1E2D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a1a', marginBottom: '3px' }}>{item.label}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{item.desc}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
