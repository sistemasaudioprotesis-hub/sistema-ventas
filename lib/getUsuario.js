export function getUsuarioId() {
  if (typeof window === 'undefined') return 1
  const stored = localStorage.getItem('usuario')
  if (!stored) return 1
  return JSON.parse(stored).id || 1
}

export function getUsuario() {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('usuario')
  if (!stored) return null
  return JSON.parse(stored)
}
