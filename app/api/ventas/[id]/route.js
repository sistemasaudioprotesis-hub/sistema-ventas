import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function GET(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        id, fecha, confirmada, total_pesos, total_dolares, obra_social_id,
        pacientes (apellido_paciente, nombres_paciente, dni),
        obras_sociales (obra_social),
        venta_detalle (
  id, precio_venta_pesos, precio_venta_usd, cantidad,
  numero_serie_id, producto_id,
  numeros_serie (id, numero_serie, productos (producto)),
  productos (id, producto)
)
      `)
      .eq('id', params.id)
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ venta: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('ventas')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ venta: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const supabase = createServerClient()

    const { data: venta } = await supabase.from('ventas').select('*').eq('id', params.id).single()
    if (!venta) return Response.json({ error: 'Venta no encontrada' }, { status: 404 })

    // Guardar historial de la venta
    await supabase.from('ventas_historial').insert([{
      venta_id: venta.id,
      total_pesos: venta.total_pesos,
      total_dolares: venta.total_dolares,
      confirmada: venta.confirmada,
      modificado_por: usuario.id,
    }])

    // Traer y guardar historial de cada detalle, liberar series
    const { data: detalles } = await supabase.from('venta_detalle').select('*').eq('venta_id', params.id)
    for (const d of (detalles || [])) {
      await supabase.from('venta_detalle_historial').insert([{
        venta_detalle_id: d.id,
        venta_id: d.venta_id,
        numero_serie_id: d.numero_serie_id,
        producto_id: d.producto_id,
        precio_venta_pesos: d.precio_venta_pesos,
        precio_venta_usd: d.precio_venta_usd,
        modificado_por: usuario.id,
      }])
      if (d.numero_serie_id) {
        await supabase.from('numeros_serie').update({ en_stock: true }).eq('id', d.numero_serie_id)
      }
    }

    // Guardar historial de pagos y borrarlos
    const { data: pagos } = await supabase.from('pagos').select('*').eq('venta_id', params.id)
    for (const p of (pagos || [])) {
      await supabase.from('pagos_historial').insert([{
        pago_id: p.id,
        monto_pesos: p.monto_pesos,
        monto_usd: p.monto_usd,
        forma_pago_id: p.forma_pago_id,
        modificado_por: usuario.id,
      }])
    }
    await supabase.from('pagos').delete().eq('venta_id', params.id)

    // Borrar detalle y derivadores
    await supabase.from('venta_detalle').delete().eq('venta_id', params.id)
    await supabase.from('venta_derivadores').delete().eq('venta_id', params.id)

    // Borrar la venta
    const { error } = await supabase.from('ventas').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
