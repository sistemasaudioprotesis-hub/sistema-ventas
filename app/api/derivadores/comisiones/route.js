import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const derivadorId = searchParams.get('derivador_id')
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const pagado = searchParams.get('pagado')

    const supabase = createServerClient()
    let query = supabase.from('venta_derivadores')
      .select(`
        id, tipo_comision, valor_comision, monto_calculado, pagado, fecha_pago,
        derivadores (id, derivador),
        ventas (id, fecha, total_pesos, total_dolares,
          pacientes (apellido_paciente, nombres_paciente))
      `)
      .order('created_at', { ascending: false })

    if (derivadorId) query = query.eq('derivador_id', derivadorId)
    if (pagado !== null && pagado !== undefined) query = query.eq('pagado', pagado === 'true')
    if (desde) query = query.gte('created_at', `${desde}T00:00:00`)
    if (hasta) query = query.lte('created_at', `${hasta}T23:59:59`)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ comisiones: data || [] })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
