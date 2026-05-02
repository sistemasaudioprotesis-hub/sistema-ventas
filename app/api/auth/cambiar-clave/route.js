import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function POST(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const { password_actual, password_nueva } = await request.json()
    const supabase = createServerClient()
    const { data } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', usuario.id)
      .eq('password', password_actual)
      .maybeSingle()
    if (!data) return Response.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 })
    const { error } = await supabase
      .from('usuarios')
      .update({ password: password_nueva })
      .eq('id', usuario.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
