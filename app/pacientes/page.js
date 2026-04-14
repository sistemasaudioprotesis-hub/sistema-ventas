import { supabase } from '../../lib/supabaseClient'

export default async function Pacientes() {
  const { data: pacientes, error } = await supabase
    .from('pacientes')
    .select('*')

  if (error) {
    return <div>Error cargando pacientes</div>
  }

  return (
    <div>
      <h1>Lista de pacientes</h1>

      {pacientes?.length === 0 && <p>No hay pacientes</p>}

      <ul>
        {pacientes?.map((p) => (
          <li key={p.id}>
            {p.nombre} {p.apellido}
          </li>
        ))}
      </ul>
    </div>
  )
}
