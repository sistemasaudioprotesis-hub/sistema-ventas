import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const supabase = createServerClient()
    const { data, error } = await supabase.from('modelos')
      .select('id, modelo, producto_id, activo')
      .order('producto_id').order('modelo')
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ modelos: data || [] })
  } catch (e) { return Response.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const supabase = createServerClient()
    const { data, error } = await supabase.from('modelos').insert([body]).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ modelo: data })
  } catch (e) { return Response.json({ error: 'Error interno' }, { status: 500 }) }
}
