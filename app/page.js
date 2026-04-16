'use client'

export default function Home() {
  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: 'auto' }}>
      
      <h1 style={{ marginBottom: '30px' }}>
        Audioprotesis
      </h1>

      <div style={{ display: 'grid', gap: '30px' }}>

        {/* PACIENTES */}
        <div>
          <h2>Pacientes</h2>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <a href="/pacientes">
              <button style={btn}>Gestión de Pacientes</button>
            </a>
          </div>
        </div>

        {/* OPERACIONES */}
        <div>
          <h2>Operaciones</h2>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <a href="/ventas">
              <button style={btn}>Ventas</button>
            </a>

            <a href="/pagos">
              <button style={btn}>Pagos</button>
            </a>
          </div>
        </div>

        {/* STOCK */}
        <div>
          <h2>Stock</h2>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <a href="/numeros_serie">
              <button style={btn}>Números de Serie</button>
            </a>
          </div>
        </div>

        {/* CONFIGURACIÓN */}
        <div>
          <h2>Configuración</h2>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <a href="/tipo_producto">
              <button style={btn}>Tipos de Producto</button>
            </a>

            <a href="/productos">
              <button style={btn}>Productos</button>
            </a>

            <a href="/derivadores">
              <button style={btn}>Derivadores</button>
            </a>

            <a href="/obras_sociales">
              <button style={btn}>Obras Sociales</button>
            </a>

            <a href="/depositos">
              <button style={btn}>Depósitos</button>
            </a>

            <a href="/formas_pago">
              <button style={btn}>Formas de Pago</button>
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}

const btn = {
  padding: '15px 25px',
  fontSize: '16px',
  borderRadius: '10px',
  border: '1px solid #ccc',
  cursor: 'pointer',
  background: '#f5f5f5',
}
