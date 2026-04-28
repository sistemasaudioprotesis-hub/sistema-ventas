import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchConToken } from './fetchConToken'

export function usePermiso(seccion) {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [permitido, setPermitido] = useState(false)

  useEffect(() => {
    async function verificar() {
      const stored = localStorage.getItem('usuario')
      if (!stored) { router.push('/login'); return }
      const usuario = JSON.parse(stored)

      if (usuario.rol === 'admin') {
        setPermitido(true)
        setVerificando(false)
        return
      }

      const res = await fetchConToken('/api/auth/permisos')
      const data = await res.json()
      const permisos = data.permisos || []
      const p = permisos.find(x => x.seccion === seccion)

      if (!p || !p.tiene_acceso) {
        setVerificando(false)
        router.push('/')
        return
      }

      setPermitido(true)
      setVerificando(false)
    }
    verificar()
  }, [seccion])

  return { verificando, permitido }
}
