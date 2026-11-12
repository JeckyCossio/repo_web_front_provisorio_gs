// Cada posição de mesas guarda de 0 a 3 pessoas.

export const LUGARES_POR_MESA = 3

// Descreve o tipo recebido na mensagem de erro da ocupação.
function descreverValor(pessoas) {
  if (typeof pessoas === 'string') {
    return `o texto "${pessoas}"`
  }
  const tiposSimples = ['number', 'boolean', 'undefined']
  if (pessoas === null || tiposSimples.includes(typeof pessoas)) {
    return `o valor ${pessoas}`
  }
  return `um valor do tipo ${typeof pessoas}`
}

// Exige pelo menos uma mesa com zero a três pessoas em cada posição.
export function validarMesas(mesas) {
  if (!Array.isArray(mesas)) {
    return { valido: false, erros: ['As mesas precisam vir numa lista (array).'] }
  }
  if (mesas.length === 0) {
    return { valido: false, erros: ['A lista de mesas está vazia: a sala precisa de pelo menos 1 mesa.'] }
  }

  const erros = []
  for (let i = 0; i < mesas.length; i++) {
    const pessoas = mesas[i]
    const ehInteiroDe0a3 = Number.isInteger(pessoas) && pessoas >= 0 && pessoas <= LUGARES_POR_MESA
    if (!ehInteiroDe0a3) {
      erros.push(
        `A mesa ${i + 1} tem ${descreverValor(pessoas)}, mas precisa ser um número inteiro de 0 a ${LUGARES_POR_MESA}.`,
      )
    }
  }
  return { valido: erros.length === 0, erros }
}

// Interrompe o cálculo quando a ocupação das mesas é inválida.
function exigirMesasValidas(mesas) {
  const { valido, erros } = validarMesas(mesas)
  if (!valido) {
    throw new Error(`Mesas inválidas: ${erros.join(' ')}`)
  }
}

// Soma as pessoas sentadas nas mesas válidas.
export function ocupacaoTotal(mesas) {
  exigirMesasValidas(mesas)
  let total = 0
  for (const pessoas of mesas) {
    total = total + pessoas
  }
  return total
}

// Calcula três lugares para cada mesa.
export function capacidadeSala(mesas) {
  exigirMesasValidas(mesas)
  return mesas.length * LUGARES_POR_MESA
}

// Subtrai a ocupação da capacidade da sala.
export function vagasIndividuais(mesas) {
  exigirMesasValidas(mesas)
  return capacidadeSala(mesas) - ocupacaoTotal(mesas)
}

// Uma mesa só é totalmente livre quando não há ninguém sentado.
export function mesasTotalmenteVazias(mesas) {
  exigirMesasValidas(mesas)
  let vazias = 0
  for (const pessoas of mesas) {
    if (pessoas === 0) {
      vazias = vazias + 1
    }
  }
  return vazias
}

// Calcula a porcentagem ocupada sem arredondar.
export function taxaOcupacao(mesas) {
  exigirMesasValidas(mesas)
  const capacidade = capacidadeSala(mesas)
  if (capacidade === 0) {
    return 0
  }
  return (100 * ocupacaoTotal(mesas)) / capacidade
}

// Reúne os totais de pessoas, vagas, mesas vazias e ocupação.
export function resumoOcupacao(mesas) {
  exigirMesasValidas(mesas)
  return {
    total: ocupacaoTotal(mesas),
    capacidade: capacidadeSala(mesas),
    vagas: vagasIndividuais(mesas),
    mesasVazias: mesasTotalmenteVazias(mesas),
    taxa: taxaOcupacao(mesas),
  }
}

// Confere se o índice aponta para uma mesa existente.
function ehIndiceDeMesa(mesas, indice) {
  return Number.isInteger(indice) && indice >= 0 && indice < mesas.length
}

// Adiciona uma pessoa sem ultrapassar três lugares por mesa.
export function entrarNaMesa(mesas, indice) {
  exigirMesasValidas(mesas)
  const novas = [...mesas]
  if (ehIndiceDeMesa(mesas, indice) && novas[indice] < LUGARES_POR_MESA) {
    novas[indice] = novas[indice] + 1
  }
  return novas
}

// Retira uma pessoa sem deixar a ocupação negativa.
export function sairDaMesa(mesas, indice) {
  exigirMesasValidas(mesas)
  const novas = [...mesas]
  if (ehIndiceDeMesa(mesas, indice) && novas[indice] > 0) {
    novas[indice] = novas[indice] - 1
  }
  return novas
}
