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
