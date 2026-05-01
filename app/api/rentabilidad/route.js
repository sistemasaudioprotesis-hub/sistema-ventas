import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    if (!['admin', 'director'].includes(usuario.rol)) return Response.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const supabase = createServerClient()

    const { data: ventas, error } = await supabase
      .from('ventas')
      .select(`
        id, fecha, total_pesos, total_dolares,
        pacientes (apellido_paciente, nombres_paciente),
        venta_detalle (
          id, precio_venta_pesos, precio_venta_usd,
          numeros_serie (id, costo_usd, modelo_id, modelos (modelo), productos (id, producto)),
          productos (id, producto)
        )
      `)
      .eq('confirmada', true)
      .gte('fecha', desde + 'T00:00:00')
      .lte('fecha', hasta + 'T23:59:59')
      .order('fecha', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    const ventasCompletas = await Promise.all((ventas || []).map(async v => {
      const [{ data: pagos }, { data: derivador }] = await Promise.all([
        supabase.from('pagos')
          .select('monto_pesos, monto_usd, formas_pago (es_efectivo, factor_rentabilidad)')
          .eq('venta_id', v.id),
        supabase.from('venta_derivadores')
          .select('monto_calculado, tipo_comision, valor_comision')
          .eq('venta_id', v.id)
          .maybeSingle(),
      ])

      const fechaStr = v.fecha.split('T')[0]
      const { data: cotizData } = await supabase
        .from('valor_dolar_bna')
        .select('dolar_vendedor')
        .lte('fecha', fechaStr)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle()
      const cotiz = cotizData?.dolar_vendedor

      // Factor proporcional según forma de pago
      const pagosData = pagos || []
let factorPago = 1
if (pagosData.length > 0) {
  const factorMinimo = Math.min(...pagosData.map(p => Number(p.formas_pago?.factor_rentabilidad) || 1))
  factorPago = factorMinimo
}
const todosEfectivo = factorPago === 1

      console.log('venta', v.id, 'pagosData:', JSON.stringify(pagosData.map(p => ({ factor: p.formas_pago?.factor_rentabilidad, monto_pesos: p.monto_pesos, monto_usd: p.monto_usd }))), 'factorFinal:', factorPago)

      const itemsConSerie = (v.venta_detalle || []).filter(d => d.numeros_serie?.costo_usd)
      const precioVentaUSD = itemsConSerie.reduce((acc, d) => acc + (Number(d.precio_venta_usd) || 0), 0)
      const costoUSD = itemsConSerie.reduce((acc, d) => acc + (Number(d.numeros_serie?.costo_usd) || 0), 0)

      let comisionUSD = 0
      if (derivador) {
        if (derivador.monto_calculado && cotiz) {
          comisionUSD = Number(derivador.monto_calculado) / cotiz
        } else if (derivador.tipo_comision === 'monto_fijo' && derivador.valor_comision && cotiz) {
          comisionUSD = Number(derivador.valor_comision) / cotiz
        } else if (derivador.tipo_comision === 'porcentaje' && derivador.valor_comision) {
          comisionUSD = precioVentaUSD * Number(derivador.valor_comision) / 100
        }
      }

      const gananciaBrutaUSD = precioVentaUSD - costoUSD - comisionUSD
      const gananciaNeta = gananciaBrutaUSD * factorPago
      const margenPct = precioVentaUSD > 0 ? ((gananciaNeta / precioVentaUSD) * 100).toFixed(1) : null

      return {
        ...v,
        todosEfectivo,
        factorPago,
        itemsConSerie,
        precioVentaUSD,
        costoUSD,
        comisionUSD,
        gananciaBrutaUSD,
        gananciaNeta,
        margenPct,
        tieneAudifonos: itemsConSerie.length > 0,
      }
    }))

    return Response.json({ ventas: ventasCompletas })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
