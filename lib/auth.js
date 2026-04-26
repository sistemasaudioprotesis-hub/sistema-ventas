import { createServerClient } from './supabaseServer'

export async function verificarSesion(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const supabase = createServerClient()
  const { data } = await supabase
    .from('sesiones')
    .select('*, usuarios (id, nombre, rol, activo)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!data || !data.usuarios?.activo) return null
  return data.usuarios
}
