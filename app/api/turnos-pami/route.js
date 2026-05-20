import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const supabase = createServerClient()
    let query = supabase
      .from('turnos_pami')
      .select('*, visita_motivos (id, motivo)')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true })
    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)
    const { data, error } = await query
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
      .from('turnos_pami')
      .insert([{ ...body, creado_por: usuario.id }])
      .select()
      .single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ turno: data })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
