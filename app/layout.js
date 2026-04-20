import './globals.css'

export const metadata = {
  title: 'Audioprotesis',
  description: 'Sistema de gestión de ventas',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: '#f9fafb', minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>

          {/* SIDEBAR */}
          <aside style={{
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
            <div style={{
              padding: '24px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.15)',
            }}>
              <a href="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="/logo.jpeg" alt="logo" style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)' }} />
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

              <NavSection label="Operaciones">
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
              </NavSection>

              <NavSection label="Stock">
                <NavItem href="/numeros_serie" label="Números de Serie" icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                }/>
              </NavSection>

            </nav>

            {/* Footer sidebar */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              fontSize: '12px',
              opacity: 0.4,
            }}>
              Sistema v1.0
            </div>

          </aside>

          {/* CONTENIDO PRINCIPAL */}
          <main style={{
            marginLeft: '250px',
            flex: 1,
            padding: '36px',
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
        fontSize: '10px',
        fontWeight: '700',
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        opacity: 0.45,
        padding: '0 10px',
        marginBottom: '6px',
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
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 12px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '2px',
        cursor: 'pointer',
      }}>
        <div style={{
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <span>{label}</span>
      </div>
    </a>
  )
}
