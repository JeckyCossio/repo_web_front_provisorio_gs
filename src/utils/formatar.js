// Formata o número em português ou mostra um traço sem leitura.
export function formatarNumero(valor, casas = 1) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return '—'
  }
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: 0 })
}

// Arredonda o valor e acrescenta o símbolo de porcentagem.
export function formatarPorcento(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return '—'
  }
  return `${Math.round(valor)}%`
}

// Formata a hora local, com segundos quando solicitado.
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

// Escolhe singular ou plural conforme a quantidade.
export function contar(quantidade, singular, plural) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`
}

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
