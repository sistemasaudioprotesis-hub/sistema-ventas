import { verificarSesion } from '../../../../../lib/auth'
import { createServerClient } from '../../../../../lib/supabaseServer'

export async function GET(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('reparaciones_historial')
      .select('id, estado, observaciones, creado_por, created_at')
      .eq('visita_id', params.id)
      .order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ historial: data || [] })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
