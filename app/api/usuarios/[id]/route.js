import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function PUT(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    if (usuario.rol !== 'admin') return Response.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('usuarios')
      .update(body)
      .eq('id', params.id)
      .select('id, nombre, usuario, rol, activo')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ usuario: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
