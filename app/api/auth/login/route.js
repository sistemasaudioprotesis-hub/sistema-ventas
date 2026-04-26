import { createServerClient } from '../../../../lib/supabaseServer'
import { randomBytes } from 'crypto'

export async function POST(request) {
  try {
    const { usuario, password } = await request.json()
    if (!usuario || !password) {
      return Response.json({ error: 'Completar usuario y contraseña' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data } = await supabase
      .from('usuarios')
      .select('id, usuario, nombre, rol, activo')
      .eq('usuario', usuario.toLowerCase().trim())
      .eq('password', password)
      .maybeSingle()

    if (!data) {
      return Response.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
    }

    if (!data.activo) {
      return Response.json({ error: 'Usuario inactivo. Contactar al administrador' }, { status: 403 })
    }

    // Crear token de sesión
    const token = randomBytes(32).toString('hex')
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await supabase.from('sesiones').insert([{
      usuario_id: data.id,
      token,
      expires_at,
    }])

    return Response.json({
      token,
      usuario: {
        id: data.id,
        usuario: data.usuario,
        nombre: data.nombre,
        rol: data.rol,
      }
    })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
