import { verificarSesion } from '../../../lib/auth'
import { createServerClient } from '../../../lib/supabaseServer'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const hoy = new Date().toISOString().split('T')[0]
    const supabase = createServerClient()

    // Ver si ya hay cotización de hoy
    const { data: hoyData } = await supabase
      .from('valor_dolar_bna')
      .select('fecha, dolar_vendedor')
      .eq('fecha', hoy)
      .maybeSingle()

    if (hoyData) {
      return Response.json({ cotizacion: hoyData.dolar_vendedor, fecha: hoyData.fecha, fuente: 'hoy' })
    }

    // Si no hay, buscar en la API desde el servidor
    try {
      const res = await fetch('https://dolarapi.com/v1/dolares/blue')
      const json = await res.json()
      const venta = json.venta
      if (venta) {
        await supabase.from('valor_dolar_bna').insert([{
          fecha: hoy, dolar_vendedor: venta, creado_por: usuario.id
        }])
        return Response.json({ cotizacion: venta, fecha: hoy, fuente: 'api' })
      }
    } catch {
      // API falló, usar la más reciente
    }

    // Fallback — usar la más reciente disponible
    const { data: anterior } = await supabase
      .from('valor_dolar_bna')
      .select('fecha, dolar_vendedor')
      .lte('fecha', hoy)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (anterior) {
      return Response.json({ cotizacion: anterior.dolar_vendedor, fecha: anterior.fecha, fuente: 'anterior' })
    }

    return Response.json({ cotizacion: null, fecha: null, fuente: 'ninguna' })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { valor, fecha } = await request.json()
    const supabase = createServerClient()
    const fechaUsar = fecha || new Date().toISOString().split('T')[0]

    const { data: existe } = await supabase
      .from('valor_dolar_bna')
      .select('id')
      .eq('fecha', fechaUsar)
      .maybeSingle()

    if (existe) {
      await supabase.from('valor_dolar_bna')
        .update({ dolar_vendedor: valor, creado_por: usuario.id })
        .eq('fecha', fechaUsar)
    } else {
      await supabase.from('valor_dolar_bna')
        .insert([{ fecha: fechaUsar, dolar_vendedor: valor, creado_por: usuario.id }])
    }

    return Response.json({ ok: true, cotizacion: valor, fecha: fechaUsar })

  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
