'use client'

export default function Home() {

  const sections = [
    {
      title: 'Pacientes',
      items: [
        {
          href: '/pacientes',
          label: 'Gestión de Pacientes',
          desc: 'Alta, búsqueda y edición',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          ),
        },
        {
          href: '/historial-pacientes',
          label: 'Historial',
          desc: 'Cambios en datos de pacientes',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        {
          href: '/ventas',
          label: 'Ventas',
          desc: 'Registrar y ver ventas',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          ),
        },
        {
          href: '/pagos',
          label: 'Pagos',
          desc: 'Gestionar pagos y saldos',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Stock',
      items: [
        {
          href: '/numeros_serie',
          label: 'Números de Serie',
          desc: 'Control de stock',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          ),
        },
      ],
    },
  ]

  return (
    <div>

      {/* Header bienvenida */}
      <div style={{
        marginBottom: '36px',
        padding: '28px 32px',
        background: 'linear-gradient(135deg, #8B1E2D 0%, #b02038 100%)',
        borderRadius: '16px',
        color: 'white',
      }}>
        <div style={{ fontSize: '13px', fontWeight: '600', opacity: 0.7, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
          Sistema de Gestión
        </div>
        <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
          AudioProtesis
        </div>
        <div style={{ fontSize: '14px', opacity: 0.75 }}>
          Quilmes, Buenos Aires
        </div>
      </div>

      {/* Secciones */}
      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: '36px' }}>

          {/* Título sección */}
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#9ca3af',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: '14px',
            paddingLeft: '4px',
          }}>
            {section.title}
          </div>

          {/* Grid de items */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {section.items.map(item => (
              <a key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '14px',
                    padding: '22px 24px',
                    minWidth: '190px',
                    maxWidth: '220px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
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
                  {/* Ícono circular estilo Instagram */}
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#8B1E2D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}>
                    {item.icon}
                  </div>

                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a1a', marginBottom: '3px' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {item.desc}
                    </div>
                  </div>

                </div>
              </a>
            ))}
          </div>

        </div>
      ))}

    </div>
  )
}
