export function normalizarTexto(texto) {
  if (!texto) return ''

  return texto
    .normalize('NFD') // separa tildes
    .replace(/[\u0300-\u036f]/g, '') // elimina tildes
    .toUpperCase()
}
