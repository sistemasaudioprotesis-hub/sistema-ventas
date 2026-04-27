import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function PUT(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const supabase = createServerClient()

    // Guardar historial antes de modificar
    const { data: actual } = await supabase.from('caja_movimientos').select('*').eq('id', params.id).single()
    if (actual) {
      await supabase.from('caja_movimientos_historial').insert([{
        caja_movimiento_id: actual.id,
        concepto: actual.concepto,
        tipo: actual.tipo,
        monto_pesos: actual.monto_pesos,
        monto_usd: actual.monto_usd,
        modificado_por: usuario.id,
      }])
    }

    const { data, error } = await supabase.from('caja_movimientos').update(body).eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ movimiento: data })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = createServerClient()
    const { error } = await supabase.from('caja_movimientos').delete().eq('id', params.id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
