import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { data } = await supabase
      .from('permisos')
      .select('seccion, tiene_acceso')
      .eq('rol', usuario.rol)

    return Response.json({ permisos: data || [] })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
