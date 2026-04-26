import { verificarSesion } from '../../../../lib/auth'

export async function GET(request) {
  try {
    const usuario = await verificarSesion(request)
    if (!usuario) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }
    return Response.json({ usuario })
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
