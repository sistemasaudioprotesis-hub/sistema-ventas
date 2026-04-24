import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabaseClient'

export function usePermiso(seccion) {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [permitido, setPermitido] = useState(false)

  useEffect(() => {
    async function verificar() {
      const stored = localStorage.getItem('usuario')
      if (!stored) { router.push('/login'); return }
      const usuario = JSON.parse(stored)

      // Admin siempre tiene acceso a todo
      if (usuario.rol === 'admin') { setPermitido(true); setVerificando(false); return }

      const { data } = await supabase
        .from('permisos')
        .select('tiene_acceso')
        .eq('rol', usuario.rol)
        .eq('seccion', seccion)
        .maybeSingle()

      if (!data || !data.tiene_acceso) {
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
