import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function GET(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('visitas')
      .select(`
        id, fecha, observaciones, marca, costo_pesos, costo_usd,
        respuesta_paciente, fecha_entrega, numero_orden,
        pacientes (id, apellido_paciente, nombres_paciente, dni, telefono),
        ventas (id, total_pesos, total_dolares)
      `)
      .eq('id', params.id)
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ reparacion: data })
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

    // Traer estado actual para comparar
    const { data: actual } = await supabase
      .from('visitas')
      .select('respuesta_paciente')
      .eq('id', params.id)
      .single()

    const { data, error } = await supabase
      .from('visitas')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Grabar historial solo si cambió el estado
    const estadoAnterior = actual?.respuesta_paciente || 'ingresada'
    const estadoNuevo = body.respuesta_paciente

    if (estadoNuevo && estadoNuevo !== estadoAnterior) {
      await supabase.from('reparaciones_historial').insert([{
        visita_id: params.id,
        estado: estadoNuevo,
        observaciones: `Cambio desde: ${estadoAnterior}`,
        creado_por: usuario.id,
      }])
    }

    return Response.json({ reparacion: data })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
