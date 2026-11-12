import { LIMIARES, RUIDO_DB_MIN } from './limiares.js'

export const ATIVIDADES = [
  { id: 'sozinho', nome: 'Estudar sozinho', resumo: 'Um lugar vago, silêncio e conforto' },
  { id: 'grupo', nome: 'Trabalho em grupo', resumo: 'Mesa totalmente livre e ruído até 65 dB simulados' },
  { id: 'video', nome: 'Gravar vídeo', resumo: 'Mesa totalmente livre e silêncio até 45 dB simulados' },
]

// Os pesos de cada atividade somam 100.
export const PESOS = {
  sozinho: { ruido: 40, temperatura: 20, luz: 20, ocupacao: 20 },
  grupo: { mesasLivres: 35, ocupacao: 25, ruido: 20, temperatura: 10, luz: 10 },
  video: { ruido: 35, mesasLivres: 35, ocupacao: 20, luz: 10 },
}

const PARTE_DO_PESO = { adequado: 1, atencao: 0.5, critico: 0 }

const MESAS_LIVRES_PARA_O_PESO_INTEIRO = 4

export const LIMITES_RUIDO_ATIVIDADE = {
  grupo: LIMIARES.ruido.criticoAcima,
  video: LIMIARES.ruido.atencaoAcima,
}

const PONTOS_A_MENOS_SE_DESATUALIZADA = 15

const ESTADOS_COM_LEITURA = ['verde', 'amarelo', 'vermelho']

// Valida a atividade e usa peso zero nos critérios que ela não considera.
function pesosDe(atividadeId) {
  if (!['sozinho', 'grupo', 'video'].includes(atividadeId)) {
    throw new Error(`Atividade desconhecida: "${atividadeId}". Use sozinho, grupo ou video.`)
  }
  return { ruido: 0, temperatura: 0, luz: 0, ocupacao: 0, mesasLivres: 0, ...PESOS[atividadeId] }
}

// Devolve o primeiro motivo que impede a sala de participar.
function motivoDaEliminacao(atividadeId, classificacao) {
  if (!ESTADOS_COM_LEITURA.includes(classificacao.estado)) {
    return 'Sem leitura confiável'
  }
  const ocupacao = classificacao.ocupacao || {}
  const ruido = classificacao.ruido || {}
  const precisaDeLugar = atividadeId === 'sozinho'
  if (precisaDeLugar && !(ocupacao.vagas >= 1)) {
    return 'Sala lotada'
  }
  // Grupo e vídeo exigem uma mesa vazia, além das cadeiras disponíveis.
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

// Aplica o peso inteiro, metade ou zero conforme a severidade.
function pontosPelaSeveridade(indicador, peso) {
  const severidade = (indicador || {}).severidade
  if (!['adequado', 'atencao', 'critico'].includes(severidade)) {
    return 0
  }
  return PARTE_DO_PESO[severidade] * peso
}

// Pontua a proporção de lugares vagos na sala.
function pontosPelaOcupacao(ocupacao, peso) {
  if (typeof ocupacao.vagas !== 'number' || !(ocupacao.capacidade > 0)) {
    return 0
  }
  return (peso * ocupacao.vagas) / ocupacao.capacidade
}

// Distribui o peso das mesas livres até o máximo de quatro.
function pontosPelasMesasLivres(ocupacao, peso) {
  const vazias = typeof ocupacao.mesasVazias === 'number' ? ocupacao.mesasVazias : 0
  return (peso * Math.min(vazias, MESAS_LIVRES_PARA_O_PESO_INTEIRO)) / MESAS_LIVRES_PARA_O_PESO_INTEIRO
}

// Soma os critérios e desconta 15 pontos de leituras antigas.
function calcularPontuacao(pesos, classificacao, desatualizada, atividadeId) {
  const ocupacao = classificacao.ocupacao || {}
  let soma = 0
  // No vídeo, o peso do silêncio cai linearmente de 30 a 45 dB.
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

const MAXIMO_DE_MOTIVOS = 4

// Arredonda para uma casa decimal e usa vírgula.
function escreverNumero(numero) {
  return String(Math.round(numero * 10) / 10).replace('.', ',')
}

// Confere se o indicador tem um valor numérico.
function temValor(indicador) {
  return typeof (indicador || {}).valor === 'number'
}

// Descreve o nível de ruído e sua medida.
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

// Descreve a temperatura, distinguindo frio e calor.
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

// Descreve a iluminação, distinguindo falta e excesso de luz.
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

// Informa a quantidade de cadeiras vagas.
function fraseDasVagas(ocupacao) {
  return ocupacao.vagas === 1 ? '1 lugar vago' : `${ocupacao.vagas} lugares vagos`
}

// Informa a quantidade de mesas totalmente vazias.
function fraseDasMesasLivres(ocupacao) {
  if (ocupacao.mesasVazias === 1) {
    return '1 mesa totalmente livre'
  }
  return `${ocupacao.mesasVazias} mesas totalmente livres`
}

// Descreve quantos lugares estão ocupados.
function fraseDaOcupacao(ocupacao) {
  if (ocupacao.total === 0) {
    return 'Sala vazia'
  }
  return `${ocupacao.total} de ${ocupacao.capacidade} lugares ocupados`
}

// Seleciona os motivos mais relevantes para a atividade.
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

// Limita os motivos a quatro, priorizando o aviso de leitura antiga.
function montarMotivos(atividadeId, classificacao, desatualizada) {
  const frases = frasesDoAtalho(atividadeId, classificacao)
  if (desatualizada) {
    return ['Leitura desatualizada', ...frases.slice(0, MAXIMO_DE_MOTIVOS - 1)]
  }
  return frases.slice(0, MAXIMO_DE_MOTIVOS)
}

// Verifica a elegibilidade e calcula a nota e os motivos da sala.
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

// Obtém o ID da sala ou um texto vazio.
function idDoItem(item) {
  const sala = (item && item.sala) || {}
  return typeof sala.id === 'string' ? sala.id : ''
}

// Compara dois valores para definir sua ordem.
function compararValores(a, b) {
  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }
  return 0
}

// Obtém a taxa de ocupação e assume sala cheia se ela faltar.
function taxaDoItem(item) {
  const ocupacao = (item.classificacao && item.classificacao.ocupacao) || {}
  return typeof ocupacao.taxa === 'number' ? ocupacao.taxa : 100
}

// Obtém o número de mesas vazias e usa zero se ele faltar.
function mesasVaziasDoItem(item) {
  const ocupacao = (item.classificacao && item.classificacao.ocupacao) || {}
  return typeof ocupacao.mesasVazias === 'number' ? ocupacao.mesasVazias : 0
}

// Desempata por menor ocupação, mais mesas vazias e, por último, ID da sala.
function compararElegiveis(a, b) {
  const porNota = compararValores(b.avaliacao.pontuacao, a.avaliacao.pontuacao)
  if (porNota !== 0) {
    return porNota
  }
  const porTaxa = compararValores(taxaDoItem(a), taxaDoItem(b))
  if (porTaxa !== 0) {
    return porTaxa
  }
  const porMesas = compararValores(mesasVaziasDoItem(b), mesasVaziasDoItem(a))
  if (porMesas !== 0) {
    return porMesas
  }
  return compararValores(idDoItem(a), idDoItem(b))
}

// Lista primeiro as salas elegíveis; as demais ficam no fim com o motivo da exclusão.
export function ranquearItens(itens, atividadeId) {
  const semAtalho = atividadeId === null || atividadeId === undefined
  if (!semAtalho) {
    pesosDe(atividadeId)
  }
  if (!Array.isArray(itens)) {
    return []
  }
  if (semAtalho) {
    return itens.map((item) => ({ ...item, avaliacao: null, posicao: null }))
  }

  const avaliados = itens.map((item) => ({ ...item, avaliacao: avaliarItem(item, atividadeId) }))
  const elegiveis = avaliados.filter((item) => item.avaliacao.elegivel).sort(compararElegiveis)
  const queSairam = avaliados
    .filter((item) => !item.avaliacao.elegivel)
    .sort((a, b) => compararValores(idDoItem(a), idDoItem(b)))

  return [
    ...elegiveis.map((item, indice) => ({ ...item, posicao: indice + 1 })),
    ...queSairam.map((item) => ({ ...item, posicao: null })),
  ]
}
