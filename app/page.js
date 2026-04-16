'use client'

export default function Home() {
  return (
    <div style={container}>

      {/* HEADER */}
      <div style={header}>
        <img src="/logo.jpeg" alt="logo" style={logo} />
        <h1 style={title}>Audioprotesis</h1>
      </div>

      {/* SECCIONES */}
      <div style={grid}>

        <Section title="Pacientes">
          <Card title="Gestión de Pacientes" href="/pacientes" />
        </Section>

        <Section title="Operaciones">
          <Card title="Ventas" href="/ventas" />
          <Card title="Pagos" href="/pagos" />
        </Section>

        <Section title="Stock">
          <Card title="Números de Serie" href="/numeros_serie" />
        </Section>

      </div>

    </div>
  )
}

/* COMPONENTES */

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '30px' }}>
      <h2 style={sectionTitle}>{title}</h2>
      <div style={cardContainer}>{children}</div>
    </div>
  )
}

function Card({ title, href }) {
  return (
    <a href={href} style={{ textDecoration: 'none' }}>
      <div style={card}>
        {title}
      </div>
    </a>
  )
}

/* ESTILOS */

const container = {
  padding: '30px',
  maxWidth: '900px',
  margin: 'auto',
  fontFamily: 'sans-serif',
}

const header = {
  display: 'flex',
  alignItems: 'center',
  gap: '15px',
  marginBottom: '30px',
}

const logo = {
  width: '50px',
  height: '50px',
}

const title = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#8B1E2D', // bordó marca
}

const sectionTitle = {
  marginBottom: '10px',
  color: '#8B1E2D',
}

const grid = {
  display: 'flex',
  flexDirection: 'column',
}

const cardContainer = {
  display: 'flex',
  gap: '15px',
  flexWrap: 'wrap',
}

const card = {
  padding: '20px',
  minWidth: '200px',
  borderRadius: '12px',
  background: '#ffffff',
  border: '1px solid #eee',
  boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
  cursor: 'pointer',
  fontWeight: '500',
  transition: '0.2s',
}
