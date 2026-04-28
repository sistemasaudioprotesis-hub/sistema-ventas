import { verificarSesion } from '../../../../../../lib/auth'
import { createServerClient } from '../../../../../../lib/supabaseServer'

export async function GET(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const supabase = createServerClient()
    const { data: stockRow } = await supabase.from('stock_general')
      .select('id').eq('producto_id', params.id).maybeSingle()
    if (!stockRow) return Response.json({ movimientos: [] })
    const { data, error } = await supabase.from('stock_general_movimientos')
      .select('*').eq('stock_general_id', stockRow.id)
      .order('created_at', { ascending: false }).limit(50)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ movimientos: data || [] })
  } catch (e) { return Response.json({ error: 'Error interno' }, { status: 500 }) }
}
