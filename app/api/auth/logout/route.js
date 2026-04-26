import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (token) {
      const supabase = createServerClient()
      await supabase.from('sesiones').delete().eq('token', token)
    }
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
