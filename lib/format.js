export function formatearPesos(valor) {
  if (!valor) return ''

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(valor)
}

export function formatearUSD(valor) {
  if (!valor) return ''

  const numero = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)

  return `U$S ${numero}`
}
