import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const pacienteId = searchParams.get('paciente_id')
    const motivoId = searchParams.get('motivo_id')
    const creadoPor = searchParams.get('creado_por')
    const esReparacion = searchParams.get('es_reparacion')
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    const supabase = createServerClient()
    let query = supabase.from('visitas')
      .select(`
        id, fecha, observaciones, created_at, atendido_por,
        visita_motivos (motivo),
        pacientes (id, apellido_paciente, nombres_paciente, dni, telefono),
        ventas (id, fecha, total_pesos, total_dolares)
      `)
      .order('fecha', { ascending: false })

    if (pacienteId) query = query.eq('paciente_id', pacienteId)
    if (motivoId) query = query.eq('motivo_id', motivoId)
    if (creadoPor) query = query.eq('creado_por', creadoPor)
    if (esReparacion !== null && esReparacion !== undefined) query = query.eq('es_reparacion', esReparacion === 'true')
    if (desde) query = query.gte('fecha', `${desde}T00:00:00`)
    if (hasta) query = query.lte('fecha', `${hasta}T23:59:59`)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ visitas: data || [] })

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

    const { data, error } = await supabase.from('visitas').insert([{
      paciente_id: body.paciente_id,
      fecha: body.fecha || new Date().toISOString(),
      motivo_id: body.motivo_id,
      observaciones: body.observaciones || null,
      venta_id: body.venta_id || null,
      es_reparacion: body.es_reparacion || false,
      atendido_por: usuario.id,
      creado_por: usuario.id,
    }]).select().single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ visita: data })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
