import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const pacienteId = searchParams.get('paciente_id')

    const supabase = createServerClient()

    let query = supabase
      .from('ventas')
      .select(`
        id, fecha, total_pesos, total_dolares,
        pacientes (id, apellido_paciente, nombres_paciente, dni, telefono),
        obras_sociales (obra_social),
        venta_detalle (
          id, precio_venta_pesos, precio_venta_usd, cantidad,
          numeros_serie (id, numero_serie, modelos (modelo), productos (id, producto, tipo_id, tipo_producto (tipo))),
          productos (id, producto, tipo_id, tipo_producto (tipo))
        ),
        pagos (id, monto_pesos, monto_usd, monto_equivalente_pesos, monto_equivalente_usd)
      `)
      .eq('confirmada', true)
      .order('fecha', { ascending: false })

    if (pacienteId) query = query.eq('paciente_id', pacienteId)

    const { data: ventas, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Filter only ventas with saldo pendiente
    const ventasConSaldo = (ventas || []).map(v => {
      const pagadoP = (v.pagos || []).reduce((acc, p) => acc + (Number(p.monto_equivalente_pesos) || Number(p.monto_pesos) || 0), 0)
      const pagadoU = (v.pagos || []).reduce((acc, p) => acc + (Number(p.monto_equivalente_usd) || Number(p.monto_usd) || 0), 0)
      const saldoP = (Number(v.total_pesos) || 0) - pagadoP
      const saldoU = (Number(v.total_dolares) || 0) - pagadoU
      return { ...v, saldoP, saldoU, pagadoP, pagadoU }
    }).filter(v => v.saldoP > 0.01 || v.saldoU > 0.01)

    return Response.json({ ventas: ventasConSaldo })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
