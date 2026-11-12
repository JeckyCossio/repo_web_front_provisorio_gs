// Confere se o texto contém apenas dígitos.
export function soDigitos(texto) {
  if (texto.length === 0) return false
  for (const caractere of texto) {
    if (caractere < '0' || caractere > '9') return false
  }
  return true
}

// Aceita sinal negativo e uma parte decimal com ponto.
export function decimalSimples(texto) {
  const semSinal = texto[0] === '-' ? texto.slice(1) : texto
  const partes = semSinal.split('.')
  return partes.length <= 2 && partes.filter((parte) => !soDigitos(parte)).length === 0
}

// Valida grupos de milhares com ponto e decimais com vírgula.
export function numeroComMilhar(texto) {
  const semSinal = texto[0] === '-' ? texto.slice(1) : texto
  const partes = semSinal.split(',')
  if (partes.length > 2 || (partes.length === 2 && !soDigitos(partes[1]))) return false
  const grupos = partes[0].split('.')
  if (grupos.length < 2 || grupos[0].length > 3 || grupos[0][0] === '0') return false
  for (let i = 0; i < grupos.length; i++) {
    if (!soDigitos(grupos[i]) || (i > 0 && grupos[i].length !== 3)) return false
  }
  return true
}
