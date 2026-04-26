import { createServerClient } from '../../../../lib/supabaseServer'
import { randomBytes } from 'crypto'

export async function POST(request) {
  try {
    const { dni, password } = await request.json()
    if (!dni || !password) {
      return Response.json({ error: 'DNI y contraseña requeridos' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Buscar usuario por DNI
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('dni', dni)
      .eq('activo', true)
      .maybeSingle()

    if (!usuario) {
      return Response.json({ error: 'Usuario no encontrado' }, { status: 401 })
    }

    // Verificar contraseña (igual que como lo hacés ahora)
    const { data: passOk } = await supabase.rpc('verificar_password', {
      p_password: password,
      p_hash: usuario.password
    })

    if (!passOk) {
      return Response.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    }

    // Crear token de sesión
    const token = randomBytes(32).toString('hex')
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días

    await supabase.from('sesiones').insert([{
      usuario_id: usuario.id,
      token,
      expires_at,
    }])

    return Response.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
      }
    })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
