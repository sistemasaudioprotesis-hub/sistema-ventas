import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const operadorId = searchParams.get('operador_id')
    const pacienteId = searchParams.get('paciente_id')
    const obraSocialId = searchParams.get('obra_social_id')
    const formaPagoId = searchParams.get('forma_pago_id')
    const motivoId = searchParams.get('motivo_id')
    const agendaId = searchParams.get('agenda_id')
    const estadoReparacion = searchParams.get('estado_reparacion')
    const supabase = createServerClient()

    if (tipo === 'ventas') {
      let query = supabase.from('ventas').select('id, fecha, confirmada, total_pesos, total_dolares, pacientes (apellido_paciente, nombres_paciente, dni), venta_detalle (id, precio_venta_pesos, precio_venta_usd, numeros_serie (numero_serie, productos (producto)), productos (producto))').gte('fecha', desde + 'T00:00:00').lte('fecha', hasta + 'T23:59:59').order('fecha', { ascending: false })
      if (operadorId) query = query.eq('creado_por', operadorId)
      if (obraSocialId) query = query.eq('obra_social_id', obraSocialId)
      if (pacienteId) query = query.eq('paciente_id', pacienteId)
      const { data, error } = await query
      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({ data: data || [] })
    }

    if (tipo === 'pagos') {
      let query = supabase.from('pagos').select('id, monto_pesos, monto_usd, fecha_pago, formas_pago (forma_pago), ventas (id, total_pesos, total_dolares, pacientes (apellido_paciente, nombres_paciente, dni))').gte('fecha_pago', desde + 'T00:00:00').lte('fecha_pago', hasta + 'T23:59:59').order('fecha_pago', { ascending: false })
      if (operadorId) query = query.eq('creado_por', operadorId)
      if (formaPagoId) query = query.eq('forma_pago_id', formaPagoId)
      const { data, error } = await query
      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({ data: data || [] })
    }

    if (tipo === 'caja') {
      const [{ data: pagos }, { data: manuales }] = await Promise.all([
        supabase.from('pagos').select('id, monto_pesos, monto_usd, fecha_pago, formas_pago (forma_pago), ventas (pacientes (apellido_paciente, nombres_paciente))').gte('fecha_pago', desde + 'T00:00:00').lte('fecha_pago', hasta + 'T23:59:59'),
        supabase.from('caja_movimientos').select('*').gte('fecha', desde).lte('fecha', hasta),
      ])
      return Response.json({ data: { pagos: pagos || [], manuales: manuales || [] } })
    }

    if (tipo === 'visitas') {
      let query = supabase.from('visitas').select('id, fecha, observaciones, visita_motivos (motivo), pacientes (apellido_paciente, nombres_paciente, dni), ventas (id)').eq('es_reparacion', false).gte('fecha', desde + 'T00:00:00').lte('fecha', hasta + 'T23:59:59').order('fecha', { ascending: false })
      if (motivoId) query = query.eq('motivo_id', motivoId)
      if (operadorId) query = query.eq('creado_por', operadorId)
      if (pacienteId) query = query.eq('paciente_id', pacienteId)
      const { data, error } = await query
      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({ data: data || [] })
    }

    if (tipo === 'turnos') {
      let query = supabase.from('turnos').select('id, fecha, hora, estado, asistio, observaciones, nombre_libre, pacientes (apellido_paciente, nombres_paciente, dni, telefono), profesionales (nombre), visita_motivos (motivo), obras_sociales (obra_social)').gte('fecha', desde).lte('fecha', hasta).order('fecha').order('hora')
      if (agendaId) query = query.eq('profesional_id', agendaId)
      if (pacienteId) query = query.eq('paciente_id', pacienteId)
      if (motivoId) query = query.eq('motivo_id', motivoId)
      const { data, error } = await query
      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({ data: data || [] })
    }

    if (tipo === 'reparaciones') {
      let query = supabase.from('visitas').select('id, fecha, observaciones, marca, costo_pesos, costo_usd, respuesta_paciente, fecha_entrega, numero_orden, pacientes (apellido_paciente, nombres_paciente, dni, telefono), ventas (id, total_pesos, total_dolares)').eq('es_reparacion', true).gte('fecha', desde + 'T00:00:00').lte('fecha', hasta + 'T23:59:59').order('numero_orden', { ascending: false })
      if (estadoReparacion) query = query.eq('respuesta_paciente', estadoReparacion)
      if (pacienteId) query = query.eq('paciente_id', pacienteId)
      const { data, error } = await query
      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({ data: data || [] })
    }

    return Response.json({ error: 'Tipo no válido' }, { status: 400 })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
