// Os filtros do painel (CONTEXTO, §7.4; RN-06 e RN-14).
// é o hook; aqui só se decide se cada sala passa.
//
// Um "item" é { sala, classificacao, desatualizada }: a sala normalizada (normalizar.js),
// o resultado do classificarSala (classificacao.js) e se a leitura está velha (atualizacao.js).
// Os valores comparados vêm da classificação, onde uma leitura com problema já virou null.

import { LIMIARES } from './limiares.js'
import { decimalSimples, numeroComMilhar } from './numeros.js'

/**
 * Nenhum filtro ligado. Unidades: ocupação em pessoas na sala (o total), temperatura em °C,
 * luz em lux estimado e ruído em dB simulados. null quer dizer "sem limite".
 */
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

// Os nomes dos limites e das opções, para contar sem repetir código.
const LIMITES = ['ocupacaoMin', 'ocupacaoMax', 'temperaturaMin', 'temperaturaMax', 'luzMin', 'luzMax', 'ruidoMin', 'ruidoMax']
const OPCOES = ['exigirMesaLivre', 'somenteFavoritas']

// Um limite só vale se for um número de verdade. null, undefined, NaN e texto (até "20")
// querem dizer "sem limite": quem transforma o texto do campo em número é o valorDoFiltro.
function ehLimite(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
}

// Um número escrito do jeito simples, como no normalizar.js: o sinal de menos (se tiver),
// dígitos e, se tiver, o ponto ou a vírgula e mais dígitos. Ex.: "22.5", "22,5", "-3", "40".

// Um número com o ponto separando os milhares, como se escreve no Brasil: de 1 a 3 dígitos
// (sem começar com 0), depois grupos de "." e 3 dígitos e, se tiver, a vírgula e os decimais.
// Ex.: "1.000" (mil), "2.500" (dois mil e quinhentos), "1.000,5", "-1.000".
// Por quê: na luz, que vai até 100.000 lux, "1.000" quer dizer mil. Lido como decimal, viraria 1
// e o filtro faria o contrário do que a pessoa pediu, sem avisar. O campo type="number" também
// manda "1.000" como veio, então a conferência tem de ser aqui.
// O ponto com 1, 2 ou 4 dígitos depois ("22.5", "22.50") continua sendo a casa decimal.

/**
 * Transforma o que veio do campo da tela no valor do filtro, para o hook guardar.
 * Nos limites (o evento.target.value, que é texto): campo apagado, só espaços ou texto que não é
 * número viram null ("sem limite"); "22,5" e "22.5" viram 22.5. O ponto seguido de grupos de
 * exatamente 3 dígitos separa os milhares, como no Brasil: "1.000" vira 1000 e "1.000,5" vira 1000.5.
 * Nas opções (o evento.target.checked): só true liga.
 * @param {string} campo o nome do filtro, um dos do FILTROS_VAZIOS
 * @param {unknown} valor o que veio do campo
 * @returns {number|null|boolean} o número ou null nos limites; true ou false nas opções
 * @throws {Error} se o campo não for um dos do FILTROS_VAZIOS (erro de quem programou)
 */
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
  // Cuidado: o Number('') e o Number('  ') dão 0, e o 0 é um limite de verdade.
  // Por isso o texto é conferido antes, e não convertido direto.
  if (typeof valor !== 'string') {
    return null
  }
  const texto = valor.trim()
  let numero = null
  if (numeroComMilhar(texto)) {
    // "1.000,5": tira os pontos dos milhares e troca a vírgula decimal por ponto.
    numero = Number(texto.split('.').join('').replace(',', '.'))
  } else if (decimalSimples(texto.replace(',', '.'))) {
    numero = Number(texto.replace(',', '.'))
  }
  // Um texto com centenas de dígitos daria infinito, que também não é um limite.
  return numero !== null && Number.isFinite(numero) ? numero : null
}

/**
 * Conta quantos filtros estão ligados (para mostrar no botão e saber se há o que limpar).
 * Cada limite preenchido conta 1 (o 0 também) e cada opção marcada (true) conta 1.
 * @param {object} filtros os filtros, no formato do FILTROS_VAZIOS
 * @returns {number} de 0 a 10
 */
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

// Diz se o valor está dentro do intervalo, contando as duas bordas (RN-14).
// - Sem mínimo e sem máximo, o intervalo não filtra: passa qualquer coisa (até null).
// - Com algum limite, uma sala sem o valor (null) NÃO passa: não dá para dizer que está dentro.
// - Mínimo maior que o máximo (a pessoa digitou ao contrário): os dois são trocados.
function passaNoIntervalo(valor, minimo, maximo) {
  const temMinimo = ehLimite(minimo)
  const temMaximo = ehLimite(maximo)
  if (!temMinimo && !temMaximo) {
    return true
  }
  if (!ehLimite(valor)) {
    return false
  }
  let menor = temMinimo ? minimo : -Infinity // sem mínimo: qualquer valor serve por baixo
  let maior = temMaximo ? maximo : Infinity // sem máximo: qualquer valor serve por cima
  if (menor > maior) {
    const guardado = menor
    menor = maior
    maior = guardado
  }
  return valor >= menor && valor <= maior
}

// A luz só é comparada se estiver em lux estimado, a unidade dos filtros. Em outra unidade
// (ou sem unidade) o número não quer dizer lux, então conta como "a sala não tem o valor".
function luzEmLux(luz) {
  const dados = luz || {}
  return dados.unidade === LIMIARES.luz.unidade ? dados.valor : null
}

/**
 * Diz se a sala passa em todos os filtros ligados. Os intervalos contam as duas bordas (RN-14).
 * Um limite null não filtra; com um limite ligado, a sala sem esse valor (null) não passa.
 * "exigirMesaLivre" pede pelo menos uma mesa com 0 pessoas: mesa parcialmente ocupada não
 * conta (RN-06). "somenteFavoritas" deixa só as salas que estão nos favoritos.
 * @param {{ sala: object, classificacao: object, desatualizada: boolean }} item a sala e a sua classificação
 * @param {object} filtros os filtros, no formato do FILTROS_VAZIOS
 * @param {string[]} [favoritos] os ids das salas favoritas
 * @returns {boolean} true se a sala passa
 */
export function itemPassaNosFiltros(item, filtros, favoritos = []) {
  const f = { ...FILTROS_VAZIOS, ...(filtros || {}) } // o que faltar fica sem filtro
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
  // Sem leitura das mesas, mesasVazias é null: não dá para saber se há mesa livre, então não passa.
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

/**
 * Deixa só as salas que passam nos filtros, na mesma ordem em que vieram.
 * Não muda a lista recebida: devolve sempre uma lista nova.
 * @param {object[]} itens os itens { sala, classificacao, desatualizada }
 * @param {object} filtros os filtros, no formato do FILTROS_VAZIOS
 * @param {string[]} [favoritos] os ids das salas favoritas
 * @returns {object[]} os itens que passam (lista vazia se não veio uma lista)
 */
export function filtrarItens(itens, filtros, favoritos = []) {
  if (!Array.isArray(itens)) {
    return []
  }
  return itens.filter((item) => itemPassaNosFiltros(item, filtros, favoritos))
}
