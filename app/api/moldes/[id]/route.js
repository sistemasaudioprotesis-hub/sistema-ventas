import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function PUT(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const supabase = createServerClient()
    const { data: actual } = await supabase.from('visitas')
      .select('respuesta_paciente')
      .eq('id', params.id)
      .single()
    const { data, error } = await supabase.from('visitas')
      .update(body)
      .eq('id', params.id)
      .select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    const estadoAnterior = actual?.respuesta_paciente || 'ingresado'
    const estadoNuevo = body.respuesta_paciente
    if (estadoNuevo && estadoNuevo !== estadoAnterior) {
      await supabase.from('reparaciones_historial').insert([{
        visita_id: params.id,
        estado: estadoNuevo,
        observaciones: `Cambio desde: ${estadoAnterior}`,
        creado_por: usuario.id,
      }])
    }
    return Response.json({ molde: data })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
