import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function DELETE(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const supabase = createServerClient()
    const { error } = await supabase.from('visitas').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const supabase = createServerClient()
    const { data, error } = await supabase.from('visitas')
      .insert([{ ...body, creado_por: usuario.id }]).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ visita: data })
  } catch (e) { return Response.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function PUT(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const supabase = createServerClient()
    const { data, error } = await supabase.from('visitas')
      .update(body)
      .eq('id', params.id)
      .select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ visita: data })
  } catch (e) { return Response.json({ error: 'Error interno' }, { status: 500 }) }
}
