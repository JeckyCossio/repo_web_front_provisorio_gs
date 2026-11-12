export const PREFERENCIAS_VAZIAS = {
  schema_version: 1,
  favorites: [],
  lists: [],
}

export const NOME_LISTA_MAX = 40

// Confere se o valor é um objeto, sem aceitar null ou arrays.
function ehObjeto(valor) {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

// Confere se o texto contém algo além de espaços.
function ehTextoPreenchido(valor) {
  return typeof valor === 'string' && valor.trim() !== ''
}

// Cria preferências vazias sem compartilhar os arrays.
function preferenciasVazias() {
  return { schema_version: 1, favorites: [], lists: [] }
}

// Mantém os IDs de salas existentes, sem repetição.
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

const INVISIVEIS = ['\u200B', '\u2060', '\uFEFF']

// Preserva os juntadores usados em emojis e na escrita de algumas línguas.
const JUNTADORES = ['\u200C', '\u200D']

// Remove os caracteres indicados e os espaços nas pontas.
function tirarCaracteres(texto, ignorados) {
  let resultado = ''
  for (const caractere of texto) {
    if (!ignorados.includes(caractere)) resultado += caractere
  }
  return resultado.trim()
}

// Retira caracteres invisíveis que não fazem parte do nome.
function semInvisiveis(nome) {
  return tirarCaracteres(nome, INVISIVEIS)
}

// Confere se o nome tem conteúdo além de juntadores invisíveis.
function temAlgoVisivel(nome) {
  return tirarCaracteres(nome, JUNTADORES) !== ''
}

// Percorre o texto sem separar os pares de código usados por emojis.
function caracteres(texto) {
  const resultado = []
  for (const caractere of texto) resultado.push(caractere)
  return resultado
}

// Prepara o nome para comparar sem diferenciar maiúsculas.
function nomeParaComparar(nome) {
  return semInvisiveis(nome).toLowerCase()
}

// Limpa o nome e limita seu tamanho.
function limparNome(nome) {
  return caracteres(semInvisiveis(nome)).slice(0, NOME_LISTA_MAX).join('').trim()
}

// Acrescenta um sufixo numérico aos nomes repetidos.
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

// Confere se os dados usam a versão de preferências aceita.
export function formatoConhecido(bruto) {
  return ehObjeto(bruto) && bruto.schema_version === 1
}

// Remove salas inválidas e ajusta nomes ao carregar as preferências salvas.
export function sanearPreferencias(bruto, idsValidos) {
  if (!Array.isArray(idsValidos)) {
    throw new Error('sanearPreferencias precisa da lista dos ids válidos (idsValidos), ex.: SALAS.map((sala) => sala.id).')
  }
  if (!formatoConhecido(bruto)) {
    return preferenciasVazias()
  }

  const listas = []
  const idsJaUsados = []
  const nomesJaUsados = []
  const listasRecebidas = Array.isArray(bruto.lists) ? bruto.lists : []
  for (const lista of listasRecebidas) {
    const temIdENome = ehObjeto(lista) && ehTextoPreenchido(lista.id) && typeof lista.name === 'string'
    const nome = temIdENome ? limparNome(lista.name) : ''
    if (temIdENome && temAlgoVisivel(nome) && !idsJaUsados.includes(lista.id)) {
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

// Obtém favoritos e listas, usando arrays vazios quando faltarem.
function partesDe(prefs) {
  const dados = prefs || {}
  return {
    favoritos: Array.isArray(dados.favorites) ? dados.favorites : [],
    listas: Array.isArray(dados.lists) ? dados.lists : [],
  }
}

// Monta novas preferências com cópias dos arrays.
function montar(favoritos, listas) {
  return { schema_version: 1, favorites: [...favoritos], lists: [...listas] }
}

// Adiciona ou retira a sala dos favoritos.
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

// Recusa nomes vazios, longos ou repetidos em outra lista.
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

// Confere se há uma lista com o ID informado.
function existeLista(listas, listaId) {
  return listas.filter((lista) => ehObjeto(lista) && lista.id === listaId).length > 0
}

// Atualiza apenas a lista correspondente ao ID.
function mudarLista(prefs, listaId, mudar) {
  const { favoritos, listas } = partesDe(prefs)
  const novas = listas.map((lista) => (ehObjeto(lista) && lista.id === listaId ? mudar(lista) : lista))
  return montar(favoritos, novas)
}

// Obtém as salas da lista ou um array vazio.
function salasDa(lista) {
  return Array.isArray(lista.room_ids) ? lista.room_ids : []
}

// Valida o nome e cria uma lista vazia.
export function criarLista(prefs, nome, novoId) {
  const validacao = validarNomeLista(prefs, nome)
  if (!validacao.ok) {
    return { prefs, erro: validacao.erro }
  }
  const { favoritos, listas } = partesDe(prefs)
  if (!ehTextoPreenchido(novoId) || existeLista(listas, novoId)) {
    return { prefs, erro: 'Não foi possível criar a lista. Tente de novo.' }
  }
  const nova = { id: novoId, name: validacao.nome, room_ids: [] }
  return { prefs: montar(favoritos, [...listas, nova]), erro: null }
}

// Valida o novo nome e atualiza a lista.
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

// Remove a lista e mantém os favoritos.
export function excluirLista(prefs, listaId) {
  const { favoritos, listas } = partesDe(prefs)
  return montar(favoritos, listas.filter((lista) => !(ehObjeto(lista) && lista.id === listaId)))
}

// Inclui a sala sem duplicar o ID na lista.
export function adicionarSalaNaLista(prefs, listaId, salaId) {
  if (!ehTextoPreenchido(salaId)) {
    return mudarLista(prefs, listaId, (lista) => lista)
  }
  return mudarLista(prefs, listaId, (lista) => {
    const salas = salasDa(lista)
    return salas.includes(salaId) ? lista : { ...lista, room_ids: [...salas, salaId] }
  })
}

// Remove o ID da sala sem alterar a lista recebida.
export function removerSalaDaLista(prefs, listaId, salaId) {
  return mudarLista(prefs, listaId, (lista) => ({ ...lista, room_ids: salasDa(lista).filter((id) => id !== salaId) }))
}
