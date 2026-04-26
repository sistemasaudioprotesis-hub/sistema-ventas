import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    const supabase = createServerClient()
    let query = supabase.from('agenda_bloqueos').select(`
      id, fecha_inicio, fecha_fin, hora_inicio, hora_fin,
      motivo, todo_el_dia, todas_las_agendas,
      profesionales (id, nombre)
    `)

    if (desde) query = query.gte('fecha_fin', desde)
    if (hasta) query = query.lte('fecha_inicio', hasta)

    const { data, error } = await query.order('fecha_inicio')
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ bloqueos: data || [] })

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
      .from('agenda_bloqueos')
      .insert([{ ...body, creado_por: usuario.id }])
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ bloqueo: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
