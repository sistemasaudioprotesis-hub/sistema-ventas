import { verificarSesion } from '../../../../../../lib/auth'
import { createServerClient } from '../../../../../../lib/supabaseServer'

export async function PUT(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('venta_detalle')
      .update(body)
      .eq('id', params.itemId)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ detalle: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const supabase = createServerClient()

    const { data: detalle } = await supabase
      .from('venta_detalle')
      .select('*')
      .eq('id', params.itemId)
      .single()

    if (!detalle) return Response.json({ error: 'Detalle no encontrado' }, { status: 404 })

    await supabase.from('venta_detalle_historial').insert([{
      venta_detalle_id: detalle.id,
      venta_id: detalle.venta_id,
      numero_serie_id: detalle.numero_serie_id,
      producto_id: detalle.producto_id,
      precio_venta_pesos: detalle.precio_venta_pesos,
      precio_venta_usd: detalle.precio_venta_usd,
      modificado_por: usuario.id,
    }])

    if (detalle.numero_serie_id) {
      await supabase.from('numeros_serie').update({ en_stock: true }).eq('id', detalle.numero_serie_id)
    }

    const { error } = await supabase.from('venta_detalle').delete().eq('id', params.itemId)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const { data: detallesRestantes } = await supabase
      .from('venta_detalle')
      .select('precio_venta_pesos, precio_venta_usd, cantidad')
      .eq('venta_id', detalle.venta_id)

    const totalPesos = (detallesRestantes || []).reduce((acc, d) => acc + ((Number(d.precio_venta_pesos) || 0) * (Number(d.cantidad) || 1)), 0)
    const totalUsd = (detallesRestantes || []).reduce((acc, d) => acc + ((Number(d.precio_venta_usd) || 0) * (Number(d.cantidad) || 1)), 0)

    await supabase.from('ventas').update({
      total_pesos: totalPesos,
      total_dolares: totalUsd,
      confirmada: (detallesRestantes || []).length > 0,
    }).eq('id', detalle.venta_id)

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
