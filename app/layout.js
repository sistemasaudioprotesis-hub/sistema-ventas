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
              padding: '28px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
<a href="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '14px' }}>
  <img src="/logo.jpeg" alt="logo" style={{ width: '48px', height: '48px', borderRadius: '10px' }} />
  <span style={{ fontWeight: '700', fontSize: '20px', letterSpacing: '0.2px' }}>Audioprotesis</span>
</a>
            </div>

            {/* Navegación */}
            <nav style={{ padding: '20px 12px', flex: 1 }}>

              <NavSection label="Pacientes">
  <NavItem href="/pacientes" icon="👤" label="Gestión de Pacientes" />
  <NavItem href="/historial-pacientes" icon="🕓" label="Historial" />
</NavSection>

              <NavSection label="Operaciones">
                <NavItem href="/ventas" icon="💰" label="Ventas" />
                <NavItem href="/pagos" icon="💳" label="Pagos" />
              </NavSection>

              <NavSection label="Stock">
                <NavItem href="/numeros_serie" icon="📦" label="Números de Serie" />
              </NavSection>

            </nav>

            {/* Footer sidebar */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              fontSize: '13px',
              opacity: 0.5,
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
        fontSize: '11px',
        fontWeight: '600',
        letterSpacing: '1.2px',
        textTransform: 'uppercase',
        opacity: 0.5,
        padding: '0 10px',
        marginBottom: '8px',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function NavItem({ href, icon, label }) {
  return (
    <a href={href} style={{
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 14px',
      borderRadius: '8px',
      color: 'white',
      fontSize: '15px',
      fontWeight: '500',
      marginBottom: '4px',
    }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span>{label}</span>
    </a>
  )
}
