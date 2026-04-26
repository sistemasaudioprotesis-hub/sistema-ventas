import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const profesionalId = searchParams.get('profesional_id')
    const pacienteId = searchParams.get('paciente_id')

    const supabase = createServerClient()
    let query = supabase.from('turnos').select(`
      id, fecha, hora, estado, asistio, observaciones, nombre_libre,
      pacientes (id, apellido_paciente, nombres_paciente, dni, telefono),
      profesionales (id, nombre),
      visita_motivos (id, motivo),
      obras_sociales (id, obra_social)
    `)

    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)
    if (profesionalId) query = query.eq('profesional_id', profesionalId)
    if (pacienteId) query = query.eq('paciente_id', pacienteId)

    const { data, error } = await query.order('fecha').order('hora')
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ turnos: data || [] })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('turnos')
      .insert([{ ...body, creado_por: usuario.id }])
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ turno: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
