// Regras de ocupação das salas (CONTEXTO, §4.2 e regras RN-01 a RN-07 do §8.3).
//
// "mesas" é sempre uma lista com quantas pessoas estão sentadas em cada mesa.
// Exemplo: [1, 2, 0] = mesa 1 com 1 pessoa, mesa 2 com 2 pessoas, mesa 3 vazia.

/** Quantos lugares cada mesa tem no modelo do grupo (RN-01). */
export const LUGARES_POR_MESA = 3

// Distinguir tipos na mensagem evita confundir "2", 2, [2] e 2n.
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

/**
 * Confere se as mesas fazem sentido: uma lista não vazia, e cada mesa com
 * um número inteiro de 0 a 3 pessoas (RN-01 e RN-05).
 * @param {unknown} mesas o que veio (do Supabase, do data/ ou da tela)
 * @returns {{ valido: boolean, erros: string[] }} se é válido e, se não for, os motivos
 */
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

// Usada no começo de cada conta: se as mesas forem inválidas, para tudo com um erro claro.
// Não é exportada porque é um detalhe interno deste arquivo.
function exigirMesasValidas(mesas) {
  const { valido, erros } = validarMesas(mesas)
  if (!valido) {
    throw new Error(`Mesas inválidas: ${erros.join(' ')}`)
  }
}

/**
 * Soma as pessoas de todas as mesas (RN-03).
 * @param {number[]} mesas pessoas em cada mesa
 * @returns {number} total de pessoas na sala
 * @throws {Error} se as mesas forem inválidas
 */
export function ocupacaoTotal(mesas) {
  exigirMesasValidas(mesas)
  let total = 0
  for (const pessoas of mesas) {
    total = total + pessoas
  }
  return total
}

/**
 * Calcula quantos lugares a sala tem: 3 por mesa (RN-02).
 * @param {number[]} mesas pessoas em cada mesa
 * @returns {number} capacidade sentada da sala
 * @throws {Error} se as mesas forem inválidas
 */
export function capacidadeSala(mesas) {
  exigirMesasValidas(mesas)
  return mesas.length * LUGARES_POR_MESA
}

/**
 * Calcula quantos lugares individuais ainda estão livres.
 * @param {number[]} mesas pessoas em cada mesa
 * @returns {number} capacidade menos o total de pessoas
 * @throws {Error} se as mesas forem inválidas
 */
export function vagasIndividuais(mesas) {
  exigirMesasValidas(mesas)
  return capacidadeSala(mesas) - ocupacaoTotal(mesas)
}

/**
 * Conta as mesas sem ninguém. Mesa com 1 ou 2 pessoas NÃO conta (RN-06).
 * @param {number[]} mesas pessoas em cada mesa
 * @returns {number} quantas mesas têm 0 pessoas
 * @throws {Error} se as mesas forem inválidas
 */
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

/**
 * Calcula a porcentagem de lugares ocupados (0 a 100), sem arredondar.
 * Quem mostra na tela é que decide quantas casas decimais exibir.
 * @param {number[]} mesas pessoas em cada mesa
 * @returns {number} 100 × total ÷ capacidade (0 se a capacidade for 0)
 * @throws {Error} se as mesas forem inválidas
 */
export function taxaOcupacao(mesas) {
  exigirMesasValidas(mesas)
  const capacidade = capacidadeSala(mesas)
  // Proteção extra contra divisão por zero. Hoje ela nunca acontece, porque a lista
  // vazia (capacidade 0) já é recusada acima; fica aqui caso essa regra mude um dia.
  if (capacidade === 0) {
    return 0
  }
  return (100 * ocupacaoTotal(mesas)) / capacidade
}

/**
 * Junta todos os números da ocupação num objeto só, para a tela usar.
 * @param {number[]} mesas pessoas em cada mesa
 * @returns {{ total: number, capacidade: number, vagas: number, mesasVazias: number, taxa: number }}
 * @throws {Error} se as mesas forem inválidas
 */
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

// Diz se o índice aponta para uma mesa que existe (0, 1, 2... até a última).
// Não é exportada porque é um detalhe interno deste arquivo.
function ehIndiceDeMesa(mesas, indice) {
  return Number.isInteger(indice) && indice >= 0 && indice < mesas.length
}

/**
 * Botão "+": uma pessoa senta na mesa, só se a mesa tiver menos de 3 (RN-05).
 * Não muda a lista recebida: devolve sempre uma lista nova.
 * @param {number[]} mesas pessoas em cada mesa
 * @param {number} indice posição da mesa na lista (a primeira é 0)
 * @returns {number[]} nova lista; igual à anterior se a mesa estiver cheia ou o índice não existir
 * @throws {Error} se as mesas forem inválidas
 */
export function entrarNaMesa(mesas, indice) {
  exigirMesasValidas(mesas)
  const novas = [...mesas] // cópia: a lista original continua igual
  if (ehIndiceDeMesa(mesas, indice) && novas[indice] < LUGARES_POR_MESA) {
    novas[indice] = novas[indice] + 1
  }
  return novas
}

/**
 * Botão "-": uma pessoa sai da mesa, só se a mesa tiver pelo menos 1 (RN-05).
 * Não muda a lista recebida: devolve sempre uma lista nova.
 * @param {number[]} mesas pessoas em cada mesa
 * @param {number} indice posição da mesa na lista (a primeira é 0)
 * @returns {number[]} nova lista; igual à anterior se a mesa estiver vazia ou o índice não existir
 * @throws {Error} se as mesas forem inválidas
 */
export function sairDaMesa(mesas, indice) {
  exigirMesasValidas(mesas)
  const novas = [...mesas] // cópia: a lista original continua igual
  if (ehIndiceDeMesa(mesas, indice) && novas[indice] > 0) {
    novas[indice] = novas[indice] - 1
  }
  return novas
}
