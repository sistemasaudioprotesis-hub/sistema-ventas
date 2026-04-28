import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const supabase = createServerClient()
    const { data, error } = await supabase.from('productos')
      .select('*, tipo_producto (id, tipo, requiere_serie)').order('producto')
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ productos: data || [] })
  } catch (e) { return Response.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const supabase = createServerClient()
    const { data, error } = await supabase.from('productos')
      .insert([{ ...body, activo: true, creado_por: usuario.id }]).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ producto: data })
  } catch (e) { return Response.json({ error: 'Error interno' }, { status: 500 }) }
}
