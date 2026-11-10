// Ranking por atividade (RN-06 e RN-15). A mesma entrada produz a mesma ordem.
// Cada item contém sala, classificacao e desatualizada.

import { LIMIARES, RUIDO_DB_MIN } from './limiares.js'

/** Os três atalhos da tela, na ordem em que aparecem. */
export const ATIVIDADES = [
  { id: 'sozinho', nome: 'Estudar sozinho', resumo: 'Um lugar vago, silêncio e conforto' },
  { id: 'grupo', nome: 'Trabalho em grupo', resumo: 'Mesa totalmente livre e ruído até 65 dB simulados' },
  { id: 'video', nome: 'Gravar vídeo', resumo: 'Mesa totalmente livre e silêncio até 45 dB simulados' },
]

/**
 * Quanto cada indicador vale em cada atalho. Os pesos de cada atalho somam 100.
 * "mesasLivres" (no grupo e no vídeo) conta as mesas com 0 pessoas.
 */
// Critérios didáticos do protótipo, atualizados em 10/11/2026 conforme decisão do grupo.
// Não apresentar estas notas como se fossem cientificamente calibradas.
export const PESOS = {
  sozinho: { ruido: 40, temperatura: 20, luz: 20, ocupacao: 20 },
  grupo: { mesasLivres: 35, ocupacao: 25, ruido: 20, temperatura: 10, luz: 10 },
  video: { ruido: 35, mesasLivres: 35, ocupacao: 20, luz: 10 },
}

// Fração do peso atribuída a cada severidade ambiental.
const PARTE_DO_PESO = { adequado: 1, atencao: 0.5, critico: 0 }

// Mesma regra para grupo e vídeo: cada mesa livre soma 1/4 do peso.
// Quatro é o máximo de mesas por sala no protótipo; mesas adicionais sempre ajudam.
const MESAS_LIVRES_PARA_O_PESO_INTEIRO = 4

export const LIMITES_RUIDO_ATIVIDADE = {
  grupo: LIMIARES.ruido.criticoAcima, // 65 dB simulados: tolera conversa moderada
  video: LIMIARES.ruido.atencaoAcima, // 45 dB simulados: exige silêncio
}

// Leitura antiga continua elegível, com aviso e desconto de 15 pontos.
const PONTOS_A_MENOS_SE_DESATUALIZADA = 15

// Os estados de uma sala com leitura. 'falha' (ou qualquer outra coisa) quer dizer que não dá
// para confiar nos números.
const ESTADOS_COM_LEITURA = ['verde', 'amarelo', 'vermelho']

// Só os três atalhos da tela podem escolher os pesos.
function pesosDe(atividadeId) {
  if (!['sozinho', 'grupo', 'video'].includes(atividadeId)) {
    throw new Error(`Atividade desconhecida: "${atividadeId}". Use sozinho, grupo ou video.`)
  }
  // O indicador que o atalho não usa vale 0 (ex.: mesasLivres no sozinho).
  return { ruido: 0, temperatura: 0, luz: 0, ocupacao: 0, mesasLivres: 0, ...PESOS[atividadeId] }
}

// Diz por que a sala sai do atalho, ou null se ela pode entrar. A ordem importa: a primeira
// regra que pegar é a que aparece na tela.
function motivoDaEliminacao(atividadeId, classificacao) {
  if (!ESTADOS_COM_LEITURA.includes(classificacao.estado)) {
    return 'Sem leitura confiável'
  }
  const ocupacao = classificacao.ocupacao || {}
  const ruido = classificacao.ruido || {}
  const precisaDeLugar = atividadeId === 'sozinho'
  // "!(x >= 1)" também pega o null e o undefined: sem número, não dá para dizer que há lugar.
  if (precisaDeLugar && !(ocupacao.vagas >= 1)) {
    return 'Sala lotada'
  }
  // Grupo e vídeo exigem uma mesa com 0 pessoas, mesmo havendo cadeiras vagas.
  if ((atividadeId === 'grupo' || atividadeId === 'video') && !(ocupacao.mesasVazias >= 1)) {
    return 'Nenhuma mesa totalmente livre'
  }
  const limiteRuido = LIMITES_RUIDO_ATIVIDADE[atividadeId]
  if (limiteRuido !== undefined && !(typeof ruido.valor === 'number' && ruido.valor <= limiteRuido)) {
    return atividadeId === 'video'
      ? `Ruído acima de ${limiteRuido} dB simulados para gravar`
      : `Ruído acima de ${limiteRuido} dB simulados para trabalhar em grupo`
  }
  return null
}

// Os pontos de um indicador pela severidade: o peso inteiro, a metade ou nada.
function pontosPelaSeveridade(indicador, peso) {
  const severidade = (indicador || {}).severidade
  if (!['adequado', 'atencao', 'critico'].includes(severidade)) {
    return 0 // sem leitura ('invalido'): nenhum ponto
  }
  return PARTE_DO_PESO[severidade] * peso
}

// Usar vagas/capacidade evita o erro de arredondamento de 1 - taxa/100
// quando a taxa é uma dízima, como 16,666...%.
function pontosPelaOcupacao(ocupacao, peso) {
  if (typeof ocupacao.vagas !== 'number' || !(ocupacao.capacidade > 0)) {
    return 0
  }
  return (peso * ocupacao.vagas) / ocupacao.capacidade
}

// Mesas totalmente livres: a mesma escala de 1 a 4 mesas para grupo e vídeo.
function pontosPelasMesasLivres(ocupacao, peso) {
  const vazias = typeof ocupacao.mesasVazias === 'number' ? ocupacao.mesasVazias : 0
  return (peso * Math.min(vazias, MESAS_LIVRES_PARA_O_PESO_INTEIRO)) / MESAS_LIVRES_PARA_O_PESO_INTEIRO
}

// Soma os pontos de todos os indicadores e arredonda para um inteiro de 0 a 100.
function calcularPontuacao(pesos, classificacao, desatualizada, atividadeId) {
  const ocupacao = classificacao.ocupacao || {}
  let soma = 0
  // No vídeo, discrimina o silêncio mesmo entre salas elegíveis: 30 dB ganha o peso
  // inteiro, 45 dB ganha zero; entre eles a pontuação cai linearmente. Não mede saúde.
  soma = soma + (atividadeId === 'video'
    ? pesos.ruido * Math.min(1, Math.max(0,
      (LIMITES_RUIDO_ATIVIDADE.video - classificacao.ruido.valor)
      / (LIMITES_RUIDO_ATIVIDADE.video - RUIDO_DB_MIN)))
    : pontosPelaSeveridade(classificacao.ruido, pesos.ruido))
  soma = soma + pontosPelaSeveridade(classificacao.temperatura, pesos.temperatura)
  soma = soma + pontosPelaSeveridade(classificacao.luz, pesos.luz)
  soma = soma + pontosPelaOcupacao(ocupacao, pesos.ocupacao)
  soma = soma + pontosPelasMesasLivres(ocupacao, pesos.mesasLivres)
  let pontuacao = Math.round(soma)
  if (desatualizada) {
    pontuacao = Math.max(0, pontuacao - PONTOS_A_MENOS_SE_DESATUALIZADA)
  }
  return pontuacao
}

// No máximo 4 frases de motivo, para caber no card.
const MAXIMO_DE_MOTIVOS = 4

// Escreve o número do jeito brasileiro, com no máximo 1 casa: 22.8 vira '22,8'; 22 fica '22'.
function escreverNumero(numero) {
  return String(Math.round(numero * 10) / 10).replace('.', ',')
}

// Diz se a leitura do indicador é um número (numa sala que entrou no ranking, sempre é).
function temValor(indicador) {
  return typeof (indicador || {}).valor === 'number'
}

function fraseDoRuido(ruido) {
  if (!temValor(ruido)) {
    return 'Ruído sem leitura'
  }
  const medida = `${escreverNumero(ruido.valor)} dB simulados`
  if (ruido.severidade === 'adequado') {
    return `Silenciosa (${medida})`
  }
  if (ruido.severidade === 'atencao') {
    return `Um pouco barulhenta (${medida})`
  }
  return `Barulhenta (${medida})`
}

// Frio e calor demais são ruins (RN-09). Abaixo da faixa adequada é o lado frio.
function fraseDaTemperatura(temperatura) {
  if (!temValor(temperatura)) {
    return 'Temperatura sem leitura'
  }
  const medida = `${escreverNumero(temperatura.valor)} °C`
  const ladoFrio = temperatura.valor < LIMIARES.temperatura.atencaoAbaixo
  if (temperatura.severidade === 'adequado') {
    return `Temperatura confortável (${medida})`
  }
  if (temperatura.severidade === 'atencao') {
    return ladoFrio ? `Um pouco fria (${medida})` : `Um pouco quente (${medida})`
  }
  return ladoFrio ? `Fria demais (${medida})` : `Quente demais (${medida})`
}

// Pouca e muita luz são ruins (RN-09). Abaixo da faixa adequada é o lado escuro.
function fraseDaLuz(luz) {
  if (!temValor(luz)) {
    return 'Luz sem leitura'
  }
  const medida = `${escreverNumero(luz.valor)} lux estimado`
  const ladoEscuro = luz.valor < LIMIARES.luz.atencaoAbaixo
  if (luz.severidade === 'adequado') {
    return `Boa iluminação (${medida})`
  }
  if (luz.severidade === 'atencao') {
    return ladoEscuro ? `Pouca luz (${medida})` : `Luz forte (${medida})`
  }
  return ladoEscuro ? `Escura demais (${medida})` : `Clara demais (${medida})`
}

function fraseDasVagas(ocupacao) {
  return ocupacao.vagas === 1 ? '1 lugar vago' : `${ocupacao.vagas} lugares vagos`
}

function fraseDasMesasLivres(ocupacao) {
  if (ocupacao.mesasVazias === 1) {
    return '1 mesa totalmente livre'
  }
  return `${ocupacao.mesasVazias} mesas totalmente livres`
}

function fraseDaOcupacao(ocupacao) {
  if (ocupacao.total === 0) {
    return 'Sala vazia'
  }
  return `${ocupacao.total} de ${ocupacao.capacidade} lugares ocupados`
}

// As frases de cada atalho, do indicador que mais pesa para o que menos pesa.
// No grupo, a luz (peso 10, igual ao da temperatura) fica de fora para caber em 4 frases.
function frasesDoAtalho(atividadeId, classificacao) {
  const ocupacao = classificacao.ocupacao || {}
  if (atividadeId === 'sozinho') {
    return [fraseDoRuido(classificacao.ruido), fraseDasVagas(ocupacao), fraseDaTemperatura(classificacao.temperatura), fraseDaLuz(classificacao.luz)]
  }
  if (atividadeId === 'grupo') {
    return [fraseDasMesasLivres(ocupacao), fraseDaOcupacao(ocupacao), fraseDoRuido(classificacao.ruido), fraseDaTemperatura(classificacao.temperatura)]
  }
  return [fraseDoRuido(classificacao.ruido), fraseDasMesasLivres(ocupacao), fraseDaOcupacao(ocupacao), fraseDaLuz(classificacao.luz)]
}

// Os motivos que vão para a tela. O aviso de leitura velha vem primeiro, para não passar
// despercebido, e ocupa o lugar da última frase (sempre no máximo 4).
function montarMotivos(atividadeId, classificacao, desatualizada) {
  const frases = frasesDoAtalho(atividadeId, classificacao)
  if (desatualizada) {
    return ['Leitura desatualizada', ...frases.slice(0, MAXIMO_DE_MOTIVOS - 1)]
  }
  return frases.slice(0, MAXIMO_DE_MOTIVOS)
}

/**
 * Avalia uma sala para um atalho: se ela entra, a nota de 0 a 100 e o porquê.
 * Sai a sala sem leitura confiável; no sozinho, a lotada; no grupo e no vídeo, a sem
 * mesa livre ou acima do limite de ruído da atividade. A desatualizada continua com 15 pontos a menos.
 * @param {{ sala: object, classificacao: object, desatualizada: boolean }} item a sala e a sua classificação
 * @param {'sozinho'|'grupo'|'video'} atividadeId o atalho escolhido
 * @returns {{ elegivel: boolean, pontuacao: number|null, motivos: string[], eliminadaPor: string|null }}
 *   a pontuação é um inteiro de 0 a 100 (null se a sala saiu); os motivos são de 2 a 4 frases
 *   curtas (lista vazia se a sala saiu: o porquê está em eliminadaPor)
 * @throws {Error} se o atalho não existir
 */
export function avaliarItem(item, atividadeId) {
  const pesos = pesosDe(atividadeId)
  const dados = item || {}
  const classificacao = dados.classificacao || {}

  const eliminadaPor = motivoDaEliminacao(atividadeId, classificacao)
  if (eliminadaPor !== null) {
    return { elegivel: false, pontuacao: null, motivos: [], eliminadaPor }
  }
  const desatualizada = dados.desatualizada === true
  return {
    elegivel: true,
    pontuacao: calcularPontuacao(pesos, classificacao, desatualizada, atividadeId),
    motivos: montarMotivos(atividadeId, classificacao, desatualizada),
    eliminadaPor: null,
  }
}

// O id da sala do item, ou '' se não tiver.
function idDoItem(item) {
  const sala = (item && item.sala) || {}
  return typeof sala.id === 'string' ? sala.id : ''
}

// Compara dois valores e devolve -1 (a vem antes), 1 (b vem antes) ou 0 (empate).
// Com < e > (e não com a − b), um valor que faltar nunca vira NaN e bagunça a ordem.
// Os ids são comparados como texto ('S01' antes de 'S02'), do mesmo jeito em todo navegador.
function compararValores(a, b) {
  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }
  return 0
}

// A taxa de ocupação e as mesas vazias do item, para o desempate. Se faltarem (não acontece
// numa sala elegível), contam como o pior caso: sala cheia e nenhuma mesa vazia.
function taxaDoItem(item) {
  const ocupacao = (item.classificacao && item.classificacao.ocupacao) || {}
  return typeof ocupacao.taxa === 'number' ? ocupacao.taxa : 100
}

function mesasVaziasDoItem(item) {
  const ocupacao = (item.classificacao && item.classificacao.ocupacao) || {}
  return typeof ocupacao.mesasVazias === 'number' ? ocupacao.mesasVazias : 0
}

// A ordem das salas elegíveis (RN-15): maior nota; no empate, menor taxa de ocupação;
// depois mais mesas totalmente livres; por fim o id. Nunca sobra empate entre salas diferentes.
function compararElegiveis(a, b) {
  const porNota = compararValores(b.avaliacao.pontuacao, a.avaliacao.pontuacao) // b antes de a: maior primeiro
  if (porNota !== 0) {
    return porNota
  }
  const porTaxa = compararValores(taxaDoItem(a), taxaDoItem(b)) // menor primeiro
  if (porTaxa !== 0) {
    return porTaxa
  }
  const porMesas = compararValores(mesasVaziasDoItem(b), mesasVaziasDoItem(a)) // mais primeiro
  if (porMesas !== 0) {
    return porMesas
  }
  return compararValores(idDoItem(a), idDoItem(b))
}

/**
 * Ordena as salas para o atalho escolhido (RN-15: a mesma entrada dá sempre a mesma ordem).
 * Sem atalho (null), fica a ordem de entrada (S01 a S09), sem avaliação e sem posição.
 * Com atalho: primeiro as elegíveis, da maior nota para a menor (desempate: menor taxa de
 * ocupação, mais mesas totalmente livres, menor id), com a posição 1, 2, 3...; depois as que
 * saíram, por id, com a posição null. Não muda a lista recebida.
 * @param {object[]} itens os itens { sala, classificacao, desatualizada }
 * @param {'sozinho'|'grupo'|'video'|null} atividadeId o atalho escolhido, ou null se nenhum
 * @returns {object[]} uma lista nova de { ...item, avaliacao, posicao } (avaliacao é o
 *   resultado do avaliarItem, ou null sem atalho)
 * @throws {Error} se o atalho não existir
 */
export function ranquearItens(itens, atividadeId) {
  const semAtalho = atividadeId === null || atividadeId === undefined
  if (!semAtalho) {
    pesosDe(atividadeId) // confere o atalho antes, mesmo que a lista venha vazia
  }
  if (!Array.isArray(itens)) {
    return []
  }
  if (semAtalho) {
    return itens.map((item) => ({ ...item, avaliacao: null, posicao: null }))
  }

  const avaliados = itens.map((item) => ({ ...item, avaliacao: avaliarItem(item, atividadeId) }))
  // O filter já devolve uma lista nova, então o sort não mexe na lista recebida.
  const elegiveis = avaliados.filter((item) => item.avaliacao.elegivel).sort(compararElegiveis)
  const queSairam = avaliados
    .filter((item) => !item.avaliacao.elegivel)
    .sort((a, b) => compararValores(idDoItem(a), idDoItem(b)))

  return [
    ...elegiveis.map((item, indice) => ({ ...item, posicao: indice + 1 })),
    ...queSairam.map((item) => ({ ...item, posicao: null })),
  ]
}
