import { verificarSesion } from '../../../../lib/auth'
import { createServerClient } from '../../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const productoId = searchParams.get('producto_id')
    const depositoId = searchParams.get('deposito_id')

    const supabase = createServerClient()
    let query = supabase.from('numeros_serie').select(`
      id, numero_serie, costo_usd, en_stock, fecha_salida, created_at,
      productos (id, producto),
      depositos (id, deposito)
    `).order('created_at', { ascending: false })

    if (estado === 'stock') query = query.eq('en_stock', true)
    if (estado === 'vendido') query = query.eq('en_stock', false)
    if (productoId) query = query.eq('producto_id', productoId)
    if (depositoId) query = query.eq('deposito_id', depositoId)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ series: data || [] })

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
      .from('numeros_serie')
      .insert([{ ...body, en_stock: true, creado_por: usuario.id }])
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ serie: data })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
