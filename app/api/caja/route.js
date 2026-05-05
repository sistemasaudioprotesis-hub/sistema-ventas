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

    const [{ data: manuales }, { data: pagos }, { data: manualesAnteriores }, { data: pagosAnteriores }] = await Promise.all([
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
supabase.from('caja_movimientos')
  .select('tipo, monto_pesos, monto_usd, forma_pago_id')
  .gte('fecha', '2026-05-01')
  .lt('fecha', fechaDesde),
supabase.from('pagos')
  .select('monto_pesos, monto_usd, forma_pago_id')
  .gte('fecha_pago', '2026-05-01T00:00:00')
  .lt('fecha_pago', `${fechaDesde}T00:00:00`),
    ])

    const saldoAnteriorEfectivoPesos =
      (manualesAnteriores || []).filter(m => !m.forma_pago_id || m.forma_pago_id === 1)
        .reduce((acc, m) => acc + (m.tipo === 'ingreso' ? 1 : -1) * (Number(m.monto_pesos) || 0), 0) +
      (pagosAnteriores || []).filter(p => p.forma_pago_id === 1)
        .reduce((acc, p) => acc + (Number(p.monto_pesos) || 0), 0)

    const saldoAnteriorEfectivoUSD =
      (manualesAnteriores || []).filter(m => !m.forma_pago_id || m.forma_pago_id === 1)
        .reduce((acc, m) => acc + (m.tipo === 'ingreso' ? 1 : -1) * (Number(m.monto_usd) || 0), 0) +
      (pagosAnteriores || []).filter(p => p.forma_pago_id === 1)
        .reduce((acc, p) => acc + (Number(p.monto_usd) || 0), 0)

    const saldosAnterioresOtros = {}
    ;[...(manualesAnteriores || []), ...(pagosAnteriores || [])].forEach(m => {
      const fpId = m.forma_pago_id
      if (!fpId || fpId === 1) return
      if (!saldosAnterioresOtros[fpId]) saldosAnterioresOtros[fpId] = { pesos: 0, usd: 0 }
      const factor = m.tipo === 'egreso' ? -1 : 1
      saldosAnterioresOtros[fpId].pesos += factor * (Number(m.monto_pesos) || 0)
      saldosAnterioresOtros[fpId].usd += factor * (Number(m.monto_usd) || 0)
    })

    return Response.json({
      manuales: manuales || [],
      pagos: pagos || [],
      saldoAnterior: {
        efectivoPesos: saldoAnteriorEfectivoPesos,
        efectivoUSD: saldoAnteriorEfectivoUSD,
        otros: saldosAnterioresOtros,
      }
    })
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
