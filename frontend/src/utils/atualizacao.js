// A hora da leitura: se a data é válida e se a leitura já está velha (CONTEXTO, §6.5; RN-11).
// Recebe a hora atual por parâmetro para permitir testes com relógio controlado.

import { soDigitos } from './numeros.js'

// Os separadores têm posições fixas em uma data ISO completa.
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

/**
 * Lê uma data completa (dia, hora e fuso). Use esta função, e não o Date.parse direto:
 * o Date.parse do Chrome aceita "0" (ano 2000) e "99" (1999) como data, e um texto fora do
 * padrão pode ser lido de um jeito em cada navegador.
 * @param {unknown} texto a data que veio (ex.: o updated_at do Supabase)
 * @returns {number|null} os milissegundos desde 1970 (como o Date.parse), ou null se não for uma data completa
 */
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
  // O padrão do JavaScript tem exatamente 3 casas depois do ponto (milissegundos), e o
  // Postgres manda 6 (microssegundos). Ficam as 3 primeiras: '.5' vira '500', '.123456' vira '123'.
  const milesimos = (fracao.slice(1) + '000').slice(0, 3)
  const milissegundos = Date.parse(`${diaEHora}.${milesimos}${fuso}`)
  // NaN quando o formato está certo mas a data não existe (ex.: mês 13).
  return Number.isNaN(milissegundos) ? null : milissegundos
}

/**
 * Diz se a leitura está velha demais para ser mostrada como atual (o selo "Desatualizado").
 * Não muda o estado da sala: a tela continua mostrando a última leitura, com o aviso (RN-11).
 * Na dúvida, diz que está desatualizada: sem data válida, sem limite, ou com a data mais
 * longe no futuro que o próprio limite (relógio errado ou linha mexida à mão).
 * @param {string|null} atualizadoEm a hora da leitura (o atualizadoEm da sala normalizada)
 * @param {number} agora a hora atual, em milissegundos (Date.now())
 * @param {number} limiteSegundos depois de quantos segundos a leitura fica velha
 *   (o STALE_AFTER_SECONDS, ainda pendente: depende do intervalo de envio do ESP32)
 * @returns {boolean} true se está desatualizada (ou se não dá para saber)
 */
export function leituraDesatualizada(atualizadoEm, agora, limiteSegundos) {
  const horaDaLeitura = lerDataIso(atualizadoEm)
  const temAgora = typeof agora === 'number' && Number.isFinite(agora)
  const temLimite = typeof limiteSegundos === 'number' && Number.isFinite(limiteSegundos) && limiteSegundos > 0
  if (horaDaLeitura === null || !temAgora || !temLimite) {
    return true
  }
  const idade = agora - horaDaLeitura // em milissegundos; negativa se a data está no futuro
  const limite = limiteSegundos * 1000
  return idade > limite || idade < -limite
}
