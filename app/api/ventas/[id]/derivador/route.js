import { verificarSesion } from '../../../../../lib/auth'
import { createServerClient } from '../../../../../lib/supabaseServer'

export async function POST(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('venta_derivadores')
      .insert([{ ...body, venta_id: Number(params.id), creado_por: usuario.id }])
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ derivador: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('venta_derivadores')
      .select('*, derivadores (derivador)')
      .eq('venta_id', params.id)
      .maybeSingle()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ derivador: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
