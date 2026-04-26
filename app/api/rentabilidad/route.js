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
    const { data: ventas, error } = await supabase.from('ventas').select('id, fecha, total_pesos, total_dolares, pacientes (apellido_paciente, nombres_paciente), venta_detalle (id, precio_venta_pesos, precio_venta_usd, numeros_serie (id, costo_usd, productos (producto)), productos (producto))').eq('confirmada', true).gte('fecha', desde + 'T00:00:00').lte('fecha', hasta + 'T23:59:59').order('fecha', { ascending: false })
    if (error) return Response.json({ error: error.mess    if (error) return Response.json({ error: error.mess    if ise.    if (error) return Response.js {
      con      con      con      con      con      con     P      con      con      con      con      con      con     P      con      con    _e      con      con      con      con      con      con     P      con      con      con      con      con      con   is      con      con      con      con      co     const { data: cotizData } = await supabase.from('valor_dolar_bna').select('dolar_vendedor').lte('fecha', v.fecha.split('T')[0]).order('fecha', { ascending: false }).limit(1).maybeSingle()
      const cotiz = cotizData?.dolar_vendedor
      const todosEfectivo = (pagos || []).length > 0 && (pagos || []).every(p => p.formas_pago?.es_efectivo)
      const factorPago = todosEfectivo ? 1 : 0.7
      const itemsConSerie = (v.venta_detalle || []).filter(d => d.numeros_serie?.costo_usd)
      const precioVentaUSD = itemsConSerie.reduce((acc, d) => acc + (Number(d.precio_venta_usd) || 0), 0)
      const costoUSD = itemsConSerie.reduce((acc, d) => acc + (Number(d.numeros_serie?.costo_usd) || 0), 0)
      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      let comi      leSD      let comi      let comi      let comi cia      let comi      let comi      let comi      let comi      let comi      let comi      let comi      letnt      let comi      let comi      let comi    ...      let comi      let comi      let comi      let comi      let comi      let comi      iaBrutaUSD, gananciaNeta, margenPct, tieneAudifonos: itemsConSerie.length > 0 }
    }))
    return Response.    return Response.    return Response.    return Response.    return Response.    return Response.    retatus: 500 })
  }
}
