import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('productos')
      .select('id, producto, tipo_id, controla_stock, activo, requiere_modelo, tipo_producto (id, tipo, requiere_serie)')
      .eq('activo', true)
      .order('producto')

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ productos: data || [] })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
