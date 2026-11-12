import { soDigitos } from './numeros.js'

// Confere os dígitos e separadores da data e hora.
function diaEHoraValidos(texto) {
  if (texto.length !== 19) return false
  const separadores = { 4: '-', 7: '-', 10: 'T', 13: ':', 16: ':' }
  for (let i = 0; i < texto.length; i++) {
    if (separadores[i]) {
      if (texto[i] !== separadores[i]) return false
    } else if (!soDigitos(texto[i])) return false
  }
  return true
}

// Exige data, hora e fuso para evitar as conversões permissivas do Date.parse.
export function lerDataIso(texto) {
  if (typeof texto !== 'string') {
    return null
  }
  const diaEHora = texto.slice(0, 19)
  if (!diaEHoraValidos(diaEHora)) return null
  const fuso = texto.slice(-1) === 'Z' ? 'Z' : texto.slice(-6)
  if (fuso !== 'Z' && !(
    (fuso[0] === '+' || fuso[0] === '-') && fuso[3] === ':' &&
    soDigitos(fuso.slice(1, 3)) && soDigitos(fuso.slice(4, 6))
  )) return null
  const fracao = texto.slice(19, texto.length - fuso.length)
  if (fracao !== '' && !(fracao[0] === '.' && soDigitos(fracao.slice(1)))) return null
  // Ajusta a fração de segundos do Postgres para os milissegundos do JavaScript.
  const milesimos = (fracao.slice(1) + '000').slice(0, 3)
  const milissegundos = Date.parse(`${diaEHora}.${milesimos}${fuso}`)
  return Number.isNaN(milissegundos) ? null : milissegundos
}

// Compara a idade da leitura com o limite, compensando a diferença entre os relógios.
export function leituraDesatualizada(atualizadoEm, agora, limiteSegundos, diferencaRelogioMs = 0) {
  const horaDaLeitura = lerDataIso(atualizadoEm)
  const temAgora = typeof agora === 'number' && Number.isFinite(agora)
  const temLimite = typeof limiteSegundos === 'number' && Number.isFinite(limiteSegundos) && limiteSegundos > 0
  if (horaDaLeitura === null || !temAgora || !temLimite) {
    return true
  }
  const idade = agora + diferencaRelogioMs - horaDaLeitura
  const limite = limiteSegundos * 1000
  return idade > limite || idade < -limite
}
