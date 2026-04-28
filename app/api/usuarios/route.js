import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    console.log('usuario:', usuario)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    if (usuario.rol !== 'admin') return Response.json({ error: 'Sin permisos' }, { status: 403 })
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, usuario, rol, activo, created_at')
      .order('nombre')
    console.log('data:', data, 'error:', error)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ usuarios: data || [] })
  } catch (e) {
    console.log('catch:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    if (usuario.rol !== 'admin') return Response.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('usuarios')
      .insert([{ ...body, creado_por: usuario.id }])
      .select('id, nombre, usuario, rol, activo')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ usuario: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
