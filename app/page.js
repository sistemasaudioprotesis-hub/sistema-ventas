'use client'

export default function Home() {
  const sections = [
    {
      title: 'Pacientes',
      icon: '👤',
      cards: [
        { title: 'Gestión de Pacientes', desc: 'Alta, búsqueda y edición de pacientes', href: '/pacientes' },
      ]
    },
    {
      title: 'Operaciones',
      icon: '💼',
      cards: [
        { title: 'Ventas', desc: 'Registrar nuevas ventas y ver historial', href: '/ventas' },
        { title: 'Pagos', desc: 'Gestionar pagos y saldos pendientes', href: '/pagos' },
      ]
    },
    {
      title: 'Stock',
      icon: '📦',
      cards: [
        { title: 'Números de Serie', desc: 'Control de stock por número de serie', href: '/numeros_serie' },
      ]
    },
  ]

  return (
    <div>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
          Panel Principal
        </h1>
        <p style={{ color: '#6b7280', marginTop: '6px', fontSize: '14px' }}>
          Bienvenido al sistema de gestión de Audioprotesis
        </p>
      </div>

      {/* Secciones */}
      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: '36px' }}>

          {/* Título sección */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '14px',
          }}>
            <span style={{ fontSize: '18px' }}>{section.icon}</span>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151',
              margin: 0,
            }}>
              {section.title}
            </h2>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {section.cards.map(card => (
              <a key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '20px 24px',
                    minWidth: '220px',
                    maxWidth: '280px',
                    cursor: 'pointer',
                    transition: '0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#8B1E2D'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(139,30,45,0.12)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{
                    fontWeight: '600',
                    fontSize: '15px',
                    color: '#8B1E2D',
                    marginBottom: '6px',
                  }}>
                    {card.title}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    lineHeight: '1.4',
                  }}>
                    {card.desc}
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
