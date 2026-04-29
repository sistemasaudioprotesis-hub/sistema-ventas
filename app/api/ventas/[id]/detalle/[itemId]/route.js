import { verificarSesion } from '../../../../../../lib/auth'
import { createServerClient } from '../../../../../../lib/supabaseServer'

export async function PUT(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('venta_detalle')
      .update(body)
      .eq('id', params.itemId)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ detalle: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = createServerClient()
    const { error } = await supabase.from('venta_detalle').delete().eq('id', params.itemId)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
