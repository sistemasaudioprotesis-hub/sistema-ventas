import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const busqueda = searchParams.get('q')

    const supabase = createServerClient()
    let query = supabase.from('pacientes').select('*')

    if (busqueda) {
      if (/^\d+$/.test(busqueda)) {
        query = query.eq('dni', Number(busqueda))
      } else {
        query = query.ilike('apellido_paciente', `%${busqueda}%`)
      }
    }

    const { data, error } = await query.order('apellido_paciente')
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ pacientes: data || [] })

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
      .from('pacientes')
      .insert([{ ...body, creado_por: usuario.id }])
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ paciente: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
