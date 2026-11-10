// Os favoritos e as listas do estudante (CONTEXTO, §7.7; RN-12): as regras do CRUD.
// services/; quem guarda no estado é o hook. Aqui só se calcula a versão nova das preferências.
//
// Regra principal: NUNCA mudar o que foi recebido. Cada função devolve um objeto novo
// (é o que o React precisa para perceber que mudou e mostrar de novo).
//
// O formato é o do CONTEXTO, §7.7, com os nomes em inglês do JSON salvo:
// { schema_version: 1, favorites: ['S01', 'S07'], lists: [{ id, name, room_ids: ['S02'] }] }

/** As preferências de quem ainda não salvou nada: versão 1, sem favoritos e sem listas. */
export const PREFERENCIAS_VAZIAS = {
  schema_version: 1,
  favorites: [],
  lists: [],
}

/** O tamanho máximo do nome de uma lista (escolha da parte web: o nome cabe no card). */
export const NOME_LISTA_MAX = 40

// Um objeto de verdade: não é null, nem lista, nem texto, nem número.
function ehObjeto(valor) {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

// Um texto com alguma coisa além de espaços.
function ehTextoPreenchido(valor) {
  return typeof valor === 'string' && valor.trim() !== ''
}

// Sempre um objeto novo, para ninguém mexer no PREFERENCIAS_VAZIAS sem querer.
function preferenciasVazias() {
  return { schema_version: 1, favorites: [], lists: [] }
}

// Deixa só os ids de sala que são texto e existem, sem repetir, na ordem em que vieram.
function idsDeSalasValidos(lista, idsValidos) {
  if (!Array.isArray(lista)) {
    return []
  }
  const resultado = []
  for (const id of lista) {
    if (typeof id === 'string' && idsValidos.includes(id) && !resultado.includes(id)) {
      resultado.push(id)
    }
  }
  return resultado
}

// Caracteres que não aparecem na tela e não servem para nada num nome: o espaço de largura
// zero (U+200B), o "word joiner" (U+2060) e o BOM (U+FEFF). Num nome colado de outro lugar
// eles vêm juntos sem a pessoa ver; saem do nome em qualquer posição.
const INVISIVEIS = ['\u200B', '\u2060', '\uFEFF']

// O ZWNJ (U+200C) e o ZWJ (U+200D) também não aparecem, mas ficam no nome: o ZWJ junta emojis
// (a família de emojis é homem + ZWJ + mulher + ZWJ + menina) e o ZWNJ é usado na escrita de
// algumas línguas. Só não contam como "tem alguma coisa escrita".
const JUNTADORES = ['\u200C', '\u200D']

function tirarCaracteres(texto, ignorados) {
  let resultado = ''
  for (const caractere of texto) {
    if (!ignorados.includes(caractere)) resultado += caractere
  }
  return resultado.trim()
}

// O nome sem os invisíveis e sem os espaços em volta (o que vai para a tela e para o JSON).
function semInvisiveis(nome) {
  return tirarCaracteres(nome, INVISIVEIS)
}

// Diz se sobrou alguma coisa que dá para ver. Sem isso, a lista ficaria "sem nome" na tela.
function temAlgoVisivel(nome) {
  return tirarCaracteres(nome, JUNTADORES) !== ''
}

// Os caracteres do texto, um por item. O texto.length do JavaScript conta um emoji como 2
// (ele guarda o emoji em duas metades), e o slice pode cortar entre as duas metades, deixando
// um "�" no fim. O for...of percorre os caracteres sem separar essas metades.
function caracteres(texto) {
  const resultado = []
  for (const caractere of texto) resultado.push(caractere)
  return resultado
}

// O nome do jeito que é comparado: sem invisíveis, sem espaços em volta e em minúsculas.
function nomeParaComparar(nome) {
  return semInvisiveis(nome).toLowerCase()
}

// O nome limpo (semInvisiveis) e com no máximo NOME_LISTA_MAX caracteres.
// O trim do fim tira um espaço que tenha ficado no fim depois do corte.
function limparNome(nome) {
  return caracteres(semInvisiveis(nome)).slice(0, NOME_LISTA_MAX).join('').trim()
}

// Um nome que ainda não está em nomesUsados (comparando como o validarNomeLista compara).
// Se já estiver, ganha " (2)", " (3)"... no fim, cortando o nome para tudo caber em
// NOME_LISTA_MAX. Ex.: duas listas "Grupo" salvas viram "Grupo" e "Grupo (2)".
function nomeSemRepetir(nome, nomesUsados) {
  let candidato = nome
  let numero = 2
  while (nomesUsados.includes(nomeParaComparar(candidato))) {
    const sufixo = ` (${numero})`
    const base = caracteres(nome).slice(0, NOME_LISTA_MAX - sufixo.length).join('').trim()
    candidato = `${base}${sufixo}`
    numero = numero + 1
  }
  return candidato
}

/**
 * Diz se o que veio do localStorage (já passado pelo JSON.parse) está num formato que esta
 * versão sabe ler: um objeto com schema_version 1. Se não estiver, o sanearPreferencias
 * descarta tudo, e quem leu pode avisar a pessoa em vez de começar do zero em silêncio.
 * @param {unknown} bruto o que foi lido do localStorage
 * @returns {boolean} true se é um objeto com schema_version 1
 */
export function formatoConhecido(bruto) {
  return ehObjeto(bruto) && bruto.schema_version === 1
}

/**
 * Transforma o que veio do localStorage (já passado pelo JSON.parse) em preferências válidas.
 * Lixo (null, texto, lista, outra versão) vira o vazio, sem lançar erro (o formatoConhecido diz
 * quando foi isso). Nos favoritos e nas salas de cada lista, ficam só os ids válidos, sem repetir.
 * Uma lista sem id em texto ou sem nome que dê para ver some; com id repetido, fica a primeira.
 * O nome sai como o validarNomeLista deixaria: sem os caracteres invisíveis, cortado em
 * NOME_LISTA_MAX caracteres e sem repetir o de outra lista (o repetido ganha " (2)", " (3)"...).
 * @param {unknown} bruto o que foi lido do localStorage
 * @param {string[]} idsValidos os ids das salas que existem (ex.: SALAS.map((sala) => sala.id))
 * @returns {{ schema_version: 1, favorites: string[], lists: { id: string, name: string, room_ids: string[] }[] }}
 * @throws {Error} se idsValidos não for uma lista (erro de quem programou: sem ela, tudo seria apagado)
 */
export function sanearPreferencias(bruto, idsValidos) {
  if (!Array.isArray(idsValidos)) {
    throw new Error('sanearPreferencias precisa da lista dos ids válidos (idsValidos), ex.: SALAS.map((sala) => sala.id).')
  }
  // Outra versão do formato pode querer dizer outra coisa: na dúvida, começa do vazio.
  if (!formatoConhecido(bruto)) {
    return preferenciasVazias()
  }

  const listas = []
  const idsJaUsados = []
  const nomesJaUsados = [] // já no jeito de comparar (nomeParaComparar)
  const listasRecebidas = Array.isArray(bruto.lists) ? bruto.lists : []
  for (const lista of listasRecebidas) {
    const temIdENome = ehObjeto(lista) && ehTextoPreenchido(lista.id) && typeof lista.name === 'string'
    const nome = temIdENome ? limparNome(lista.name) : ''
    if (temIdENome && temAlgoVisivel(nome) && !idsJaUsados.includes(lista.id)) {
      // O corte em NOME_LISTA_MAX também pode deixar dois nomes iguais: por isso a conferência é depois dele.
      const nomeFinal = nomeSemRepetir(nome, nomesJaUsados)
      idsJaUsados.push(lista.id)
      nomesJaUsados.push(nomeParaComparar(nomeFinal))
      listas.push({
        id: lista.id,
        name: nomeFinal,
        room_ids: idsDeSalasValidos(lista.room_ids, idsValidos),
      })
    }
  }

  return {
    schema_version: 1,
    favorites: idsDeSalasValidos(bruto.favorites, idsValidos),
    lists: listas,
  }
}

// As duas listas das preferências recebidas. Se alguma faltar, conta como vazia.
function partesDe(prefs) {
  const dados = prefs || {}
  return {
    favoritos: Array.isArray(dados.favorites) ? dados.favorites : [],
    listas: Array.isArray(dados.lists) ? dados.lists : [],
  }
}

// Monta as preferências novas. As listas são copiadas ([...]): assim a saída nunca é a
// mesma lista da entrada (nem a do PREFERENCIAS_VAZIAS).
function montar(favoritos, listas) {
  return { schema_version: 1, favorites: [...favoritos], lists: [...listas] }
}

/**
 * Favorita a sala (se ainda não era) ou desfavorita (se já era). A nova vai para o fim.
 * Um id que não é texto não muda nada.
 * @param {object} prefs as preferências atuais
 * @param {string} salaId o id da sala (ex.: 'S07')
 * @returns {object} as preferências novas (a recebida não muda)
 */
export function alternarFavorito(prefs, salaId) {
  const { favoritos, listas } = partesDe(prefs)
  if (!ehTextoPreenchido(salaId)) {
    return montar(favoritos, listas)
  }
  if (favoritos.includes(salaId)) {
    return montar(favoritos.filter((id) => id !== salaId), listas)
  }
  return montar([...favoritos, salaId], listas)
}

/**
 * Confere o nome de uma lista antes de criar ou renomear. Corta os espaços em volta e tira os
 * caracteres invisíveis (como o espaço de largura zero de um texto colado).
 * Não pode ficar vazio (nem só com invisíveis), passar de NOME_LISTA_MAX caracteres (um emoji
 * conta como 1) nem repetir o nome de outra lista (sem diferenciar maiúsculas de minúsculas).
 * @param {object} prefs as preferências atuais
 * @param {string} nome o nome digitado
 * @param {string|null} [ignorarListaId] ao renomear, o id da própria lista, que não conta como repetida
 * @returns {{ ok: boolean, nome: string, erro: string|null }} o nome já sem os espaços em volta
 *   e, se não puder, a mensagem para mostrar na tela
 */
export function validarNomeLista(prefs, nome, ignorarListaId = null) {
  const limpo = typeof nome === 'string' ? semInvisiveis(nome) : ''
  if (!temAlgoVisivel(limpo)) {
    return { ok: false, nome: '', erro: 'Dê um nome para a lista.' }
  }
  if (caracteres(limpo).length > NOME_LISTA_MAX) {
    return { ok: false, nome: limpo, erro: `Use até ${NOME_LISTA_MAX} caracteres.` }
  }
  const { listas } = partesDe(prefs)
  const jaExiste = listas.filter(
    (lista) =>
      ehObjeto(lista) &&
      lista.id !== ignorarListaId &&
      typeof lista.name === 'string' &&
      nomeParaComparar(lista.name) === nomeParaComparar(limpo),
  ).length > 0
  if (jaExiste) {
    return { ok: false, nome: limpo, erro: 'Já existe uma lista com esse nome.' }
  }
  return { ok: true, nome: limpo, erro: null }
}

// Diz se já existe uma lista com esse id.
function existeLista(listas, listaId) {
  return listas.filter((lista) => ehObjeto(lista) && lista.id === listaId).length > 0
}

// Troca só a lista com esse id pelo que a função "mudar" devolver. As outras ficam como estão.
function mudarLista(prefs, listaId, mudar) {
  const { favoritos, listas } = partesDe(prefs)
  const novas = listas.map((lista) => (ehObjeto(lista) && lista.id === listaId ? mudar(lista) : lista))
  return montar(favoritos, novas)
}

// As salas de uma lista; se não for uma lista de verdade, nenhuma.
function salasDa(lista) {
  return Array.isArray(lista.room_ids) ? lista.room_ids : []
}

/**
 * Cria uma lista vazia no fim, depois de conferir o nome (validarNomeLista).
 * @param {object} prefs as preferências atuais
 * @param {string} nome o nome digitado
 * @param {string} novoId o id da lista nova (o hook gera com crypto.randomUUID())
 * @returns {{ prefs: object, erro: string|null }} erro null quando deu certo; com erro, as
 *   mesmas preferências recebidas e a mensagem para mostrar na tela
 */
export function criarLista(prefs, nome, novoId) {
  const validacao = validarNomeLista(prefs, nome)
  if (!validacao.ok) {
    return { prefs, erro: validacao.erro }
  }
  const { favoritos, listas } = partesDe(prefs)
  // Sem id, ou com um id que já existe, não dá para achar a lista depois: não cria.
  if (!ehTextoPreenchido(novoId) || existeLista(listas, novoId)) {
    return { prefs, erro: 'Não foi possível criar a lista. Tente de novo.' }
  }
  const nova = { id: novoId, name: validacao.nome, room_ids: [] }
  return { prefs: montar(favoritos, [...listas, nova]), erro: null }
}

/**
 * Troca o nome de uma lista, depois de conferir o nome novo (validarNomeLista).
 * A lista continua no mesmo lugar e com as mesmas salas.
 * @param {object} prefs as preferências atuais
 * @param {string} listaId o id da lista
 * @param {string} nome o nome novo
 * @returns {{ prefs: object, erro: string|null }} erro null quando deu certo; com erro, as
 *   mesmas preferências recebidas e a mensagem para mostrar na tela
 */
export function renomearLista(prefs, listaId, nome) {
  if (!existeLista(partesDe(prefs).listas, listaId)) {
    return { prefs, erro: 'Lista não encontrada.' }
  }
  const validacao = validarNomeLista(prefs, nome, listaId)
  if (!validacao.ok) {
    return { prefs, erro: validacao.erro }
  }
  return { prefs: mudarLista(prefs, listaId, (lista) => ({ ...lista, name: validacao.nome })), erro: null }
}

/**
 * Exclui uma lista. Os favoritos não mudam. A tela pede a confirmação antes de chamar.
 * @param {object} prefs as preferências atuais
 * @param {string} listaId o id da lista
 * @returns {object} as preferências novas (igual às de antes se a lista não existir)
 */
export function excluirLista(prefs, listaId) {
  const { favoritos, listas } = partesDe(prefs)
  return montar(favoritos, listas.filter((lista) => !(ehObjeto(lista) && lista.id === listaId)))
}

/**
 * Coloca a sala no fim de uma lista, sem duplicar.
 * @param {object} prefs as preferências atuais
 * @param {string} listaId o id da lista
 * @param {string} salaId o id da sala (ex.: 'S07')
 * @returns {object} as preferências novas (igual às de antes se a sala já estiver lá,
 *   se a lista não existir ou se o id da sala não for texto)
 */
export function adicionarSalaNaLista(prefs, listaId, salaId) {
  if (!ehTextoPreenchido(salaId)) {
    return mudarLista(prefs, listaId, (lista) => lista)
  }
  return mudarLista(prefs, listaId, (lista) => {
    const salas = salasDa(lista)
    return salas.includes(salaId) ? lista : { ...lista, room_ids: [...salas, salaId] }
  })
}

/**
 * Tira a sala de uma lista.
 * @param {object} prefs as preferências atuais
 * @param {string} listaId o id da lista
 * @param {string} salaId o id da sala
 * @returns {object} as preferências novas (igual às de antes se a sala não estiver lá)
 */
export function removerSalaDaLista(prefs, listaId, salaId) {
  return mudarLista(prefs, listaId, (lista) => ({ ...lista, room_ids: salasDa(lista).filter((id) => id !== salaId) }))
}
