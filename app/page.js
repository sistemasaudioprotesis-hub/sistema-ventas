export default function Home() {
  return (
    <div style={{ padding: '40px' }}>
      <h1>Sistema de Ventas</h1>

      <ul style={{ marginTop: '20px' }}>
        <li>
          <a href="/pacientes">Pacientes</a>
        </li>
        <li>
          <a href="/numeros-serie">Números de Serie</a>
        </li>
        <li>
          <a href="/ventas">Ventas</a>
        </li>
      </ul>
    </div>
  )
}
