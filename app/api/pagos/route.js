import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const ventaId = searchParams.get('venta_id')
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const formaPagoId = searchParams.get('forma_pago_id')

    const supabase = createServerClient()
    let query = supabase.from('pagos').select(`
      id, monto_pesos, monto_usd, fecha_pago, forma_pago_id,
      cotizacion_usada, monto_equivalente_pesos, monto_equivalente_usd,
      formas_pago (forma_pago, es_efectivo),
      ventas (id, total_pesos, total_dolares, obra_social_id, pacientes (apellido_paciente, nombres_paciente, dni))
    `).order('fecha_pago', { ascending: false })

    if (ventaId) query = query.eq('venta_id', ventaId)
    if (desde) query = query.gte('fecha_pago', `${desde}T00:00:00`)
    if (hasta) query = query.lte('fecha_pago', `${hasta}T23:59:59`)
    if (formaPagoId) query = query.eq('forma_pago_id', formaPagoId)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ pagos: data || [] })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('pagos')
      .insert([{ ...body, creado_por: usuario.id }])
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ pago: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
