import { LIMIARES, RUIDO_DB_MAX, RUIDO_DB_MIN } from './limiares.js'
import { resumoOcupacao, validarMesas } from './ocupacao.js'

// Aceita apenas números finitos.
function ehNumero(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
}

// Obtém os limites de um indicador conhecido.
function limiaresDe(indicador) {
  if (!['temperatura', 'luz', 'ruido', 'ocupacao'].includes(indicador)) {
    throw new Error(`Indicador desconhecido: "${indicador}". Use temperatura, luz, ruido ou ocupacao.`)
  }
  return LIMIARES[indicador]
}

// A faixa indica a posição na escala; a severidade indica a condição de uso.
export function classificarFaixa(indicador, valor) {
  const limiares = limiaresDe(indicador)
  if (!ehNumero(valor)) {
    return null
  }
  if (valor < limiares.limiteBaixo) {
    return 'baixo'
  }
  if (valor > limiares.limiteAlto) {
    return 'alto'
  }
  return 'medio'
}

// Compara com o limite inferior quando ele está definido.
function ficouAbaixo(valor, limite) {
  return limite !== null && valor < limite
}

// Compara com o limite superior quando ele está definido.
function ficouAcima(valor, limite) {
  return limite !== null && valor > limite
}

// Verifica primeiro os limites críticos e depois os de atenção.
export function classificarSeveridade(indicador, valor) {
  const limiares = limiaresDe(indicador)
  if (!ehNumero(valor)) {
    return 'invalido'
  }
  if (ficouAbaixo(valor, limiares.criticoAbaixo) || ficouAcima(valor, limiares.criticoAcima)) {
    return 'critico'
  }
  if (ficouAbaixo(valor, limiares.atencaoAbaixo) || ficouAcima(valor, limiares.atencaoAcima)) {
    return 'atencao'
  }
  return 'adequado'
}

// Converte o ruído simulado para uma escala de zero a cem.
export function indiceRuido(db) {
  if (!ehNumero(db)) {
    return null
  }
  const indice = Math.round((100 * (db - RUIDO_DB_MIN)) / (RUIDO_DB_MAX - RUIDO_DB_MIN))
  return Math.min(100, Math.max(0, indice))
}

const SEVERIDADES_VALIDAS = ['adequado', 'atencao', 'critico']

// Erros de leitura têm prioridade; depois prevalece a pior severidade.
export function estadoGeral(severidades, statusDispositivo) {
  const temStatus = statusDispositivo !== null && statusDispositivo !== undefined
  if (temStatus && statusDispositivo !== 'ok') {
    return 'falha'
  }
  if (!Array.isArray(severidades) || severidades.length === 0) {
    return 'falha'
  }
  for (const severidade of severidades) {
    if (!SEVERIDADES_VALIDAS.includes(severidade)) {
      return 'falha'
    }
  }
  if (severidades.includes('critico')) {
    return 'vermelho'
  }
  if (severidades.includes('atencao')) {
    return 'amarelo'
  }
  return 'verde'
}

// Reúne o valor, a faixa e a severidade da leitura.
function classificarIndicador(indicador, valor) {
  return {
    valor: ehNumero(valor) ? valor : null,
    faixa: classificarFaixa(indicador, valor),
    severidade: classificarSeveridade(indicador, valor),
  }
}

// Classifica a luz apenas quando a unidade é lux estimado.
function classificarLuz(luz) {
  const dados = luz || {}
  const unidade = dados.unidade || null
  if (unidade !== LIMIARES.luz.unidade) {
    return { valor: ehNumero(dados.valor) ? dados.valor : null, unidade, faixa: null, severidade: 'invalido' }
  }
  return { ...classificarIndicador('luz', dados.valor), unidade }
}

// Valida as mesas e classifica a porcentagem de ocupação.
function classificarOcupacao(mesas) {
  if (!validarMesas(mesas).valido) {
    return {
      total: null, capacidade: null, vagas: null, mesasVazias: null, taxa: null,
      faixa: null, severidade: 'invalido',
    }
  }
  const resumo = resumoOcupacao(mesas)
  return {
    ...resumo,
    faixa: classificarFaixa('ocupacao', resumo.taxa),
    severidade: classificarSeveridade('ocupacao', resumo.taxa),
  }
}

// Combina os indicadores para definir a situação geral da sala.
export function classificarSala(sala) {
  const dados = sala || {}
  const temperatura = classificarIndicador('temperatura', dados.temperaturaC)
  const luz = classificarLuz(dados.luz)
  const ruido = { ...classificarIndicador('ruido', dados.ruidoDb), indice: indiceRuido(dados.ruidoDb) }
  const ocupacao = classificarOcupacao(dados.mesas)
  const severidades = [temperatura.severidade, luz.severidade, ruido.severidade, ocupacao.severidade]
  return {
    temperatura,
    luz,
    ruido,
    ocupacao,
    estado: estadoGeral(severidades, dados.statusDispositivo),
  }
}
