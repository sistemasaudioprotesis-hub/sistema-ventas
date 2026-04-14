async function agregarPaciente() {
  if (!nombrePaciente) {
    alert('El nombre es obligatorio')
    return
  }

  const { data, error } = await supabase
    .from('pacientes')
    .insert([
      {
        nombre_paciente: nombrePaciente,
        creado_por: 1, // temporal
      },
    ])
    .select()

  if (error) {
    console.error(error)
    alert('Error: ' + error.message)
    return
  }

  console.log('Insertado:', data)

  setNombrePaciente('')
  obtenerPacientes()
}
