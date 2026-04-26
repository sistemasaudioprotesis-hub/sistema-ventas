import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const pacienteId = searchParams.get('paciente_id')
    const estado = searchParams.get('estado')
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    const supabase = createServerClient()
    let query = supabase.from('visitas')
      .select(`
        id, fecha, observaciones, marca, costo_pesos, costo_usd,
        respuesta_paciente, fecha_entrega, numero_orden, es_reparacion,
        pacientes (id, apellido_paciente, nombres_paciente, dni, telefono),
        ventas (id, total_pesos, total_dolares)
      `)
      .eq('es_reparacion', true)
      .order('numero_orden', { ascending: false })

    if (pacienteId) query = query.eq('paciente_id', pacienteId)
    if (estado) query = query.eq('respuesta_paciente', estado)
    if (desde) query = query.gte('fecha', `${desde}T00:00:00`)
    if (hasta) query = query.lte('fecha', `${hasta}T23:59:59`)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ reparaciones: data || [] })

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
      .from('visitas')
      .insert([{ ...body, es_reparacion: true, creado_por: usuario.id }])
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ reparacion: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
