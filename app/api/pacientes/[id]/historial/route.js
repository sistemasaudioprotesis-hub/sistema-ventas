import { verificarSesion } from '../../../../../lib/auth'
import { createServerClient } from '../../../../../lib/supabaseServer'

export async function GET(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('pacientes_historial')
      .select('*')
      .eq('paciente_id', params.id)
      .order('created_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ historial: data || [] })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const supabase = createServerClient()

    const { error } = await supabase
      .from('pacientes_historial')
      .insert([{ ...body, paciente_id: Number(params.id), creado_por: usuario.id }])

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
