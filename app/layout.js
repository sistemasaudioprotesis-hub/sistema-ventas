'use client'

import './globals.css'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function RootLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [usuario, setUsuario] = useState(null)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('usuario')
    if (!stored && pathname !== '/login') {
      router.push('/login')
      return
    }
    if (stored) {
      setUsuario(JSON.parse(stored))
    }
    setVerificando(false)
  }, [pathname])

  function cerrarSesion() {
    localStorage.removeItem('usuario')
    router.push('/login')
  }

  const esLogin = pathname === '/login'

  if (verificando && !esLogin) return null

  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: '#f9fafb', minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>

          {/* SIDEBAR — solo si no es login */}
          {!esLogin && (
            <aside className="no-print" style={{
  width: '250px',
              minHeight: '100vh',
              background: '#8B1E2D',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              position: 'fixed',
              top: 0, left: 0, bottom: 0,
              zIndex: 100,
            }}>

              {/* Logo y título */}
              <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                <a href="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/logo.jpeg" alt="logo" style={{ width: '54px', height: '54px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)' }} />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '17px', lineHeight: 1.2 }}>AudioProtesis</div>
                    <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '2px' }}>Quilmes, Bs As</div>
                  </div>
                </a>
              </div>

              {/* Navegación */}
              <nav style={{ padding: '20px 12px', flex: 1, overflowY: 'auto' }}>

                <NavSection label="Pacientes">
                  <NavItem href="/pacientes" label="Gestión de Pacientes" icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  }/>
                  <NavItem href="/historial-pacientes" label="Historial" icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  }/>
                </NavSection>

              <NavSection label="Configuración">
  <NavItem href="/obras-sociales" label="Obras Sociales" icon={
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  }/>

    <NavItem href="/formas-pago" label="Formas de Pago" icon={
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
}/>
  
</NavSection>

                <NavSection label="Operaciones">
  <NavItem href="/agenda" label="Agenda" icon={
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
}/>                
  <NavItem href="/ventas" label="Ventas" icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  }/>
                  <NavItem href="/pagos" label="Pagos" icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  }/>
                    <NavItem href="/caja" label="Caja" icon={
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
}/>
  <NavSection label="Información">
  <NavItem href="/reportes" label="Reportes" icon={
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  }/>
</NavSection>
                </NavSection>

                {/* Stock — solo director y admin */}
                {usuario && ['admin', 'director'].includes(usuario.rol) && (
                  <NavSection label="Stock">
                    <NavItem href="/numeros_serie" label="Números de Serie" icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                      </svg>
                    }/>
                  </NavSection>
                )}

                {/* Admin — solo admin */}
                {usuario && usuario.rol === 'admin' && (
                  <NavSection label="Administración">
                    <NavItem href="/usuarios" label="Usuarios" icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    }/>
                  </NavSection>
                )}

              </nav>

              {/* Footer con usuario y cerrar sesión */}
              {usuario && (
                <div style={{
                  padding: '14px 20px',
                  borderTop: '1px solid rgba(255,255,255,0.15)',
                }}>
                  <a href="/mi-perfil" style={{ textDecoration: 'none' }}>
  <div style={{ fontSize: '15px', fontWeight: '700', color: 'white', marginBottom: '3px' }}>
    {usuario.nombre}
  </div>
  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '10px', letterSpacing: '0.3px' }}>
    {usuario.rol} · Mi perfil →
  </div>
</a>
                  <button onClick={cerrarSesion} style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif",
                    width: '100%',
                  }}>
                    Cerrar sesión
                  </button>
                </div>
              )}

            </aside>
          )}

          {/* CONTENIDO PRINCIPAL */}
          <main style={{
            marginLeft: esLogin ? '0' : '250px',
            flex: 1,
            padding: esLogin ? '0' : '36px',
            minHeight: '100vh',
            fontSize: '16px',
          }}>
            {children}
          </main>

        </div>
      </body>
    </html>
  )
}

function NavSection({ label, children }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{
        fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px',
        textTransform: 'uppercase', opacity: 0.45, padding: '0 10px', marginBottom: '6px',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function NavItem({ href, icon, label }) {
  return (
    <a href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 12px', borderRadius: '8px', color: 'white',
        fontSize: '14px', fontWeight: '500', marginBottom: '2px', cursor: 'pointer',
      }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
        <span>{label}</span>
      </div>
    </a>
  )
}
