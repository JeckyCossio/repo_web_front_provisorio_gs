import { LIMIARES } from './limiares.js'
import { decimalSimples, numeroComMilhar } from './numeros.js'

// Um limite null deixa esse lado do intervalo sem restrição.
export const FILTROS_VAZIOS = {
  ocupacaoMin: null,
  ocupacaoMax: null,
  temperaturaMin: null,
  temperaturaMax: null,
  luzMin: null,
  luzMax: null,
  ruidoMin: null,
  ruidoMax: null,
  exigirMesaLivre: false,
  somenteFavoritas: false,
}

const LIMITES = ['ocupacaoMin', 'ocupacaoMax', 'temperaturaMin', 'temperaturaMax', 'luzMin', 'luzMax', 'ruidoMin', 'ruidoMax']
const OPCOES = ['exigirMesaLivre', 'somenteFavoritas']

// Aceita números finitos como limites dos filtros.
function ehLimite(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
}

// Aceita decimais com ponto ou vírgula e milhares no formato brasileiro.
export function valorDoFiltro(campo, valor) {
  if (OPCOES.includes(campo)) {
    return valor === true
  }
  if (!LIMITES.includes(campo)) {
    throw new Error(`Filtro desconhecido: "${campo}". Use um dos nomes do FILTROS_VAZIOS.`)
  }
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null
  }
  if (typeof valor !== 'string') {
    return null
  }
  const texto = valor.trim()
  let numero = null
  if (numeroComMilhar(texto)) {
    numero = Number(texto.split('.').join('').replace(',', '.'))
  } else if (decimalSimples(texto.replace(',', '.'))) {
    numero = Number(texto.replace(',', '.'))
  }
  return numero !== null && Number.isFinite(numero) ? numero : null
}

// Conta os limites preenchidos e as opções marcadas.
export function contarFiltrosAtivos(filtros) {
  const dados = filtros || {}
  let ativos = 0
  for (const nome of LIMITES) {
    if (ehLimite(dados[nome])) {
      ativos = ativos + 1
    }
  }
  for (const nome of OPCOES) {
    if (dados[nome] === true) {
      ativos = ativos + 1
    }
  }
  return ativos
}

// Aceita os extremos e troca os limites quando estão invertidos.
function passaNoIntervalo(valor, minimo, maximo) {
  const temMinimo = ehLimite(minimo)
  const temMaximo = ehLimite(maximo)
  if (!temMinimo && !temMaximo) {
    return true
  }
  if (!ehLimite(valor)) {
    return false
  }
  let menor = temMinimo ? minimo : -Infinity
  let maior = temMaximo ? maximo : Infinity
  if (menor > maior) {
    const guardado = menor
    menor = maior
    maior = guardado
  }
  return valor >= menor && valor <= maior
}

// Obtém o valor da luz apenas na unidade esperada.
function luzEmLux(luz) {
  const dados = luz || {}
  return dados.unidade === LIMIARES.luz.unidade ? dados.valor : null
}

// Confere se a sala atende a todos os filtros ativos.
export function itemPassaNosFiltros(item, filtros, favoritos = []) {
  const f = { ...FILTROS_VAZIOS, ...(filtros || {}) }
  const dados = item || {}
  const sala = dados.sala || {}
  const classificacao = dados.classificacao || {}
  const ocupacao = classificacao.ocupacao || {}
  const temperatura = classificacao.temperatura || {}
  const ruido = classificacao.ruido || {}

  if (!passaNoIntervalo(ocupacao.total, f.ocupacaoMin, f.ocupacaoMax)) {
    return false
  }
  if (!passaNoIntervalo(temperatura.valor, f.temperaturaMin, f.temperaturaMax)) {
    return false
  }
  if (!passaNoIntervalo(luzEmLux(classificacao.luz), f.luzMin, f.luzMax)) {
    return false
  }
  if (!passaNoIntervalo(ruido.valor, f.ruidoMin, f.ruidoMax)) {
    return false
  }
  if (f.exigirMesaLivre === true && !(ehLimite(ocupacao.mesasVazias) && ocupacao.mesasVazias >= 1)) {
    return false
  }
  if (f.somenteFavoritas === true) {
    const listaDeFavoritos = Array.isArray(favoritos) ? favoritos : []
    if (typeof sala.id !== 'string' || !listaDeFavoritos.includes(sala.id)) {
      return false
    }
  }
  return true
}

// Seleciona as salas que atendem aos filtros.
export function filtrarItens(itens, filtros, favoritos = []) {
  if (!Array.isArray(itens)) {
    return []
  }
  return itens.filter((item) => itemPassaNosFiltros(item, filtros, favoritos))
}
