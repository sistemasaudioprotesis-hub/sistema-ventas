import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = createServerClient()
    const { data: derivs } = await supabase.from('derivadores').select('*').eq('activo', true).order('derivador')

    const conTotales = await Promise.all((derivs || []).map(async d => {
      const { data: comis } = await supabase.from('venta_derivadores').select('id, monto_calculado, pagado').eq('derivador_id', d.id)
      const pendiente = (comis || []).filter(c => !c.pagado).reduce((acc, c) => acc + (Number(c.monto_calculado) || 0), 0)
      const pagado = (comis || []).filter(c => c.pagado).reduce((acc, c) => acc + (Number(c.monto_calculado) || 0), 0)
      return { ...d, pendiente, pagado, total: (comis || []).length }
    }))

    return Response.json({ derivadores: conTotales })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
