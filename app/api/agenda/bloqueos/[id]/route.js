import { verificarSesion } from '../../../../../lib/auth'
import { createServerClient } from '../../../../../lib/supabaseServer'

export async function DELETE(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = createServerClient()
    const { error } = await supabase.from('agenda_bloqueos').delete().eq('id', params.id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
