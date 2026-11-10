// Como os números e as horas aparecem na tela, no jeito brasileiro (vírgula no decimal).
// JavaScript puro: as telas chamam estas funções, e os testes conferem o texto exato.

/**
 * Um número com vírgula e no máximo `casas` casas depois dela. Sem valor, devolve o traço.
 * @param {number|null} valor
 * @param {number} casas quantas casas decimais, no máximo
 * @returns {string} ex.: 22,8 · 410 · "—"
 */
export function formatarNumero(valor, casas = 1) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return '—'
  }
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: 0 })
}

/**
 * Uma porcentagem inteira (arredondada), sem valor vira o traço.
 * @param {number|null} valor de 0 a 100
 * @returns {string} ex.: "33%"
 */
export function formatarPorcento(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return '—'
  }
  return `${Math.round(valor)}%`
}

/**
 * A hora de uma data em milissegundos, no fuso do navegador.
 * @param {number|null} ms milissegundos desde 1970 (Date.now(), Date.parse)
 * @param {boolean} comSegundos se mostra os segundos
 * @returns {string} ex.: "14:32" ou "14:32:05"; sem data, o traço
 */
export function formatarHora(ms, comSegundos = false) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) {
    return '—'
  }
  const opcoes = { hour: '2-digit', minute: '2-digit', hour12: false }
  if (comSegundos) {
    opcoes.second = '2-digit'
  }
  return new Date(ms).toLocaleTimeString('pt-BR', opcoes)
}

/**
 * Singular ou plural pela quantidade: "1 mesa", "2 mesas", "0 mesas".
 * @param {number} quantidade
 * @param {string} singular
 * @param {string} plural
 * @returns {string}
 */
export function contar(quantidade, singular, plural) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`
}

// Os nomes que a tela mostra para cada palavra do domínio.
export const NOME_FAIXA = { baixo: 'baixo', medio: 'médio', alto: 'alto' }
export const NOME_SEVERIDADE = {
  adequado: 'adequado',
  atencao: 'atenção',
  critico: 'crítico',
  invalido: 'sem leitura',
}
export const NOME_ESTADO = {
  verde: 'Adequada',
  amarelo: 'Atenção',
  vermelho: 'Crítica',
  falha: 'Sem leitura',
}
export const NOME_PORTE = { pequena: 'Pequena', media: 'Média', grande: 'Grande' }
