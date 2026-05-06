import { verificarSesion } from '../../../../../../lib/auth'
import { createServerClient } from '../../../../../../lib/supabaseServer'

export async function POST(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { tipo, cantidad, concepto } = await request.json()
    const supabase = createServerClient()

    let { data: stockRow } = await supabase
  .from('stock_general')
  .select('id, cantidad')
  .eq('producto_id', params.id)
  .maybeSingle()

if (!stockRow) {
  const { data: nuevoStock } = await supabase
    .from('stock_general')
    .insert([{ producto_id: Number(params.id), cantidad: 0 }])
    .select()
    .single()
  stockRow = nuevoStock
}
if (!stockRow) return Response.json({ error: 'Error al crear stock' }, { status: 500 })
    const nuevaCantidad = tipo === 'ingreso'
      ? stockRow.cantidad + cantidad
      : Math.max(0, stockRow.cantidad - cantidad)

    await supabase.from('stock_general').update({ cantidad: nuevaCantidad }).eq('id', stockRow.id)
    await supabase.from('stock_general_movimientos').insert([{
      stock_general_id: stockRow.id,
      tipo, cantidad, concepto: concepto || null,
      creado_por: usuario.id,
    }])

    return Response.json({ ok: true, cantidad: nuevaCantidad })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
