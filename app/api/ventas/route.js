import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const pacienteId = searchParams.get('paciente_id')
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const obraSocialId = searchParams.get('obra_social_id')


    const supabase = createServerClient()
    let query = supabase.from('ventas').select(`
  id, fecha, confirmada, total_pesos, total_dolares, obra_social_id,
  pacientes (apellido_paciente, nombres_paciente, dni),
  obras_sociales (obra_social),
  venta_detalle (
    id, precio_venta_pesos, precio_venta_usd, cantidad,
    numero_serie_id, producto_id,
    numeros_serie (id, numero_serie, modelo_id, productos (id, producto)),
    productos (id, producto)
  )
`).order('fecha', { ascending: false })

    if (pacienteId) query = query.eq('paciente_id', pacienteId)
    if (desde) query = query.gte('fecha', `${desde}T00:00:00`)
    if (hasta) query = query.lte('fecha', `${hasta}T23:59:59`)
    if (obraSocialId) query = query.eq('obra_social_id', obraSocialId)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ventas: data || [] })

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
      .from('ventas')
      .insert([{ ...body, creado_por: usuario.id }])
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ venta: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
