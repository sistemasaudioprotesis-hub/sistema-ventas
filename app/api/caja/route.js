import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha')
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const fechaDesde = desde || fecha
    const fechaHasta = hasta || fecha
    const supabase = createServerClient()
    const [{ data: manuales }, { data: pagos }] = await Promise.all([
      supabase.from('caja_movimientos')
        .select('*')
        .gte('fecha', fechaDesde)
        .lte('fecha', fechaHasta)
        .order('created_at'),
      supabase.from('pagos')
        .select(`id, monto_pesos, monto_usd, fecha_pago, forma_pago_id,
          formas_pago (forma_pago),
          ventas (pacientes (apellido_paciente, nombres_paciente))`)
        .gte('fecha_pago', `${fechaDesde}T00:00:00`)
        .lte('fecha_pago', `${fechaHasta}T23:59:59`)
        .order('fecha_pago'),
    ])
    return Response.json({ manuales: manuales || [], pagos: pagos || [] })
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
      .from('caja_movimientos')
      .insert([{ ...body, origen: 'manual', creado_por: usuario.id }])
      .select()
      .single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ movimiento: data })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
