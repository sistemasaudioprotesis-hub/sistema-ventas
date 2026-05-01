import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const pacienteId = searchParams.get('paciente_id')
    const estado = searchParams.get('estado')
    const laboratorioId = searchParams.get('laboratorio_id')
    const supabase = createServerClient()
    let query = supabase.from('visitas')
      .select(`
        id, fecha, observaciones, marca, costo_pesos, costo_usd,
        respuesta_paciente, fecha_entrega, numero_orden, es_molde, laboratorio_id,
        pacientes (id, apellido_paciente, nombres_paciente, dni, telefono),
        ventas (id, total_pesos, total_dolares)
      `)
      .eq('es_molde', true)
      .order('numero_orden', { ascending: false })
    if (pacienteId) query = query.eq('paciente_id', pacienteId)
    if (estado) query = query.eq('respuesta_paciente', estado)
    if (laboratorioId) query = query.eq('laboratorio_id', laboratorioId)
    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ moldes: data || [] })
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
    const { data: ultimaOrden } = await supabase.from('visitas')
      .select('numero_orden')
      .order('numero_orden', { ascending: false })
      .limit(1).maybeSingle()
    const proximoOrden = (ultimaOrden?.numero_orden || 0) + 1
    let { data: motivo } = await supabase.from('visita_motivos')
      .select('id').ilike('motivo', 'MOLDES Y TAPONES').maybeSingle()
    if (!motivo) {
      const { data: nuevoMotivo } = await supabase.from('visita_motivos')
        .insert([{ motivo: 'MOLDES Y TAPONES', creado_por: usuario.id }]).select().single()
      motivo = nuevoMotivo
    }
    const { data, error } = await supabase.from('visitas').insert([{
      ...body,
      es_molde: true,
      numero_orden: proximoOrden,
      motivo_id: motivo.id,
      respuesta_paciente: 'ingresado',
      atendido_por: usuario.id,
      creado_por: usuario.id,
      fecha: new Date().toISOString(),
    }]).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ molde: data })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
