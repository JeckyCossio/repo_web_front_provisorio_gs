import { describe, expect, it } from 'vitest'
import {
  NOME_LISTA_MAX,
  PREFERENCIAS_VAZIAS,
  adicionarSalaNaLista,
  alternarFavorito,
  criarLista,
  excluirLista,
  formatoConhecido,
  removerSalaDaLista,
  renomearLista,
  sanearPreferencias,
  validarNomeLista,
} from './colecoes.js'

// Os favoritos e as listas ficam só no navegador (RN-12), no formato do CONTEXTO, §7.7:
// { schema_version: 1, favorites: ['S01', ...], lists: [{ id, name, room_ids }] }.

const IDS = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09']

describe('PREFERENCIAS_VAZIAS e NOME_LISTA_MAX', () => {
  it('o vazio é a versão 1 sem favoritos e sem listas', () => {
    expect(PREFERENCIAS_VAZIAS).toEqual({ schema_version: 1, favorites: [], lists: [] })
  })

  it('favoritar e criar uma lista preservam o modelo vazio', () => {
    const comFavorito = alternarFavorito(PREFERENCIAS_VAZIAS, 'S01')
    const comLista = criarLista(PREFERENCIAS_VAZIAS, 'Estudo', 'lista-1')
    expect(comFavorito.favorites).toEqual(['S01'])
    expect(comLista.prefs.lists).toHaveLength(1)
    expect(PREFERENCIAS_VAZIAS).toEqual({ schema_version: 1, favorites: [], lists: [] })
  })

  it('o nome da lista tem no máximo 40 caracteres', () => {
    expect(NOME_LISTA_MAX).toBe(40)
  })
})

describe('sanearPreferencias: o que veio do localStorage vira preferências válidas', () => {
  it('preferências já válidas saem iguais (o exemplo do CONTEXTO, §7.7)', () => {
    const exemplo = {
      schema_version: 1,
      favorites: ['S01', 'S07'],
      lists: [{ id: 'local-uuid-da-lista', name: 'Para trabalho em grupo', room_ids: ['S02', 'S07', 'S08'] }],
    }
    expect(sanearPreferencias(exemplo, IDS)).toEqual(exemplo)
  })

  it.each([
    ['null (não havia nada salvo)', null],
    ['undefined', undefined],
    ['um texto', 'lixo'],
    ['um número', 42],
    ['uma lista', ['S01']],
    ['um objeto vazio', {}],
    ['outra versão do formato', { schema_version: 2, favorites: ['S01'], lists: [] }],
    ['a versão escrita como texto', { schema_version: '1', favorites: ['S01'], lists: [] }],
  ])('lixo vira o vazio, sem lançar erro: %s', (_descricao, bruto) => {
    expect(sanearPreferencias(bruto, IDS)).toEqual({ schema_version: 1, favorites: [], lists: [] })
  })

  it('o vazio que sai é um objeto novo, que pode ser mudado sem estragar o PREFERENCIAS_VAZIAS', () => {
    const saida = sanearPreferencias(null, IDS)
    expect(saida).not.toBe(PREFERENCIAS_VAZIAS)
    saida.favorites.push('S01')
    expect(PREFERENCIAS_VAZIAS.favorites).toEqual([])
  })

  it('favoritos: tira os repetidos, as salas que não existem e o que não é texto, mantendo a ordem', () => {
    const bruto = { schema_version: 1, favorites: ['S07', 'S99', 'S01', 'S07', 3, null, 's01'], lists: [] }
    expect(sanearPreferencias(bruto, IDS).favorites).toEqual(['S07', 'S01'])
  })

  it('favoritos que não são uma lista viram lista vazia, e as listas continuam', () => {
    const bruto = { schema_version: 1, favorites: 'S01', lists: [{ id: 'a', name: 'Prova', room_ids: ['S02'] }] }
    expect(sanearPreferencias(bruto, IDS)).toEqual({
      schema_version: 1,
      favorites: [],
      lists: [{ id: 'a', name: 'Prova', room_ids: ['S02'] }],
    })
  })

  it('listas que não são uma lista viram lista vazia, e os favoritos continuam', () => {
    const bruto = { schema_version: 1, favorites: ['S02'], lists: { id: 'a' } }
    expect(sanearPreferencias(bruto, IDS)).toEqual({ schema_version: 1, favorites: ['S02'], lists: [] })
  })

  it('salas da lista: tira as repetidas e as que não existem, mantendo a ordem', () => {
    const bruto = { schema_version: 1, favorites: [], lists: [{ id: 'a', name: 'Prova', room_ids: ['S08', 'S08', 'X', 'S02', 5] }] }
    expect(sanearPreferencias(bruto, IDS).lists[0].room_ids).toEqual(['S08', 'S02'])
  })

  it('salas da lista que não são uma lista viram lista vazia (a lista continua)', () => {
    const bruto = { schema_version: 1, favorites: [], lists: [{ id: 'a', name: 'Prova', room_ids: 'S02' }] }
    expect(sanearPreferencias(bruto, IDS).lists).toEqual([{ id: 'a', name: 'Prova', room_ids: [] }])
  })

  it('tira as listas sem id em texto ou sem nome em texto', () => {
    const bruto = {
      schema_version: 1,
      favorites: [],
      lists: [
        { id: 7, name: 'Id número', room_ids: [] },
        { id: '', name: 'Id vazio', room_ids: [] },
        { name: 'Sem id', room_ids: [] },
        { id: 'b', name: '', room_ids: [] },
        { id: 'c', name: '    ', room_ids: [] },
        { id: 'd', name: null, room_ids: [] },
        null,
        'lista',
        { id: 'ok', name: 'Fica', room_ids: [] },
      ],
    }
    expect(sanearPreferencias(bruto, IDS).lists).toEqual([{ id: 'ok', name: 'Fica', room_ids: [] }])
  })

  it('o nome da lista sai sem os espaços em volta e cortado em 40 caracteres', () => {
    const longo = 'L'.repeat(45)
    const bruto = {
      schema_version: 1,
      favorites: [],
      lists: [
        { id: 'a', name: '  Prova de cálculo  ', room_ids: [] },
        { id: 'b', name: longo, room_ids: [] },
      ],
    }
    const listas = sanearPreferencias(bruto, IDS).lists
    expect(listas[0].name).toBe('Prova de cálculo')
    expect(listas[1].name).toBe('L'.repeat(40))
  })

  it('id de lista repetido: fica a primeira', () => {
    const bruto = {
      schema_version: 1,
      favorites: [],
      lists: [
        { id: 'a', name: 'Primeira', room_ids: ['S01'] },
        { id: 'a', name: 'Segunda', room_ids: ['S02'] },
      ],
    }
    expect(sanearPreferencias(bruto, IDS).lists).toEqual([{ id: 'a', name: 'Primeira', room_ids: ['S01'] }])
  })

  it('nome repetido (sem diferenciar maiúsculas nem os espaços em volta): o segundo ganha " (2)"', () => {
    const bruto = {
      schema_version: 1,
      favorites: [],
      lists: [
        { id: 'a', name: 'Grupo', room_ids: ['S01'] },
        { id: 'b', name: '  grupo  ', room_ids: ['S02'] },
        { id: 'c', name: 'GRUPO', room_ids: [] },
      ],
    }
    const prefs = sanearPreferencias(bruto, IDS)
    // Nenhuma lista some: as salas da segunda e da terceira continuam lá.
    expect(prefs.lists).toEqual([
      { id: 'a', name: 'Grupo', room_ids: ['S01'] },
      { id: 'b', name: 'grupo (2)', room_ids: ['S02'] },
      { id: 'c', name: 'GRUPO (3)', room_ids: [] },
    ])
    // E dá para salvar o nome da primeira sem mudar nada (antes, dava "Já existe...").
    expect(renomearLista(prefs, 'a', 'Grupo').erro).toBeNull()
  })

  it('o corte em 40 caracteres também não deixa dois nomes iguais', () => {
    const base = 'x'.repeat(40)
    const bruto = {
      schema_version: 1,
      favorites: [],
      lists: [
        { id: 'a', name: `${base}A`, room_ids: [] },
        { id: 'b', name: `${base}B`, room_ids: [] },
      ],
    }
    const nomes = sanearPreferencias(bruto, IDS).lists.map((lista) => lista.name)
    expect(nomes).toEqual([base, `${'x'.repeat(36)} (2)`])
    for (const nome of nomes) {
      expect(Array.from(nome).length).toBeLessThanOrEqual(NOME_LISTA_MAX)
    }
  })

  it('o nome que o "(2)" ganhou não bate com outra lista que já tinha esse nome', () => {
    const bruto = {
      schema_version: 1,
      favorites: [],
      lists: [
        { id: 'a', name: 'Grupo', room_ids: [] },
        { id: 'b', name: 'Grupo (2)', room_ids: [] },
        { id: 'c', name: 'Grupo', room_ids: [] },
      ],
    }
    expect(sanearPreferencias(bruto, IDS).lists.map((lista) => lista.name)).toEqual(['Grupo', 'Grupo (2)', 'Grupo (3)'])
  })

  it('o corte em 40 conta os emojis como 1 caractere e nunca deixa meio emoji', () => {
    const nome = `a${'😀'.repeat(45)}`
    const bruto = { schema_version: 1, favorites: [], lists: [{ id: '1', name: nome, room_ids: [] }] }
    const salvo = sanearPreferencias(bruto, IDS).lists[0].name
    expect(salvo).toBe(`a${'😀'.repeat(39)}`)
    expect(salvo.isWellFormed()).toBe(true) // sem a metade de um emoji sozinha (o "�")
  })

  it('tira os caracteres invisíveis do nome; a lista só com eles some, como a sem nome', () => {
    const bruto = {
      schema_version: 1,
      favorites: [],
      lists: [
        { id: 'a', name: 'Pro\u200Bva\uFEFF', room_ids: [] },
        { id: 'b', name: '\u200B\u200B', room_ids: [] },
        { id: 'c', name: ' \u200D ', room_ids: [] },
      ],
    }
    expect(sanearPreferencias(bruto, IDS).lists).toEqual([{ id: 'a', name: 'Prova', room_ids: [] }])
  })

  it('campos que não são do formato ficam de fora', () => {
    const bruto = {
      schema_version: 1,
      favorites: [],
      lists: [{ id: 'a', name: 'Prova', room_ids: [], cor: 'azul' }],
      usuario: 'alguém',
    }
    expect(sanearPreferencias(bruto, IDS)).toEqual({
      schema_version: 1,
      favorites: [],
      lists: [{ id: 'a', name: 'Prova', room_ids: [] }],
    })
  })

  it('não muda o objeto recebido', () => {
    const bruto = { schema_version: 1, favorites: ['S01', 'S01'], lists: [{ id: 'a', name: '  X  ', room_ids: ['S01', 'S01'] }] }
    const copia = structuredClone(bruto)
    sanearPreferencias(bruto, IDS)
    expect(bruto).toEqual(copia)
  })

  it('sem a lista dos ids válidos é erro de quem programou (senão apagaria tudo sem avisar)', () => {
    expect(() => sanearPreferencias({ schema_version: 1, favorites: ['S01'], lists: [] })).toThrow(/idsValidos/)
  })
})

describe('formatoConhecido: o que foi salvo está num formato que esta versão lê?', () => {
  it('um objeto com schema_version 1, mesmo sem favoritos e sem listas', () => {
    expect(formatoConhecido({ schema_version: 1, favorites: [], lists: [] })).toBe(true)
    expect(formatoConhecido({ schema_version: 1 })).toBe(true)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['um texto', 'lixo'],
    ['um número', 42],
    ['uma lista', ['S01']],
    ['um objeto sem versão', { favorites: ['S01'] }],
    ['outra versão', { schema_version: 2, favorites: ['S01'], lists: [] }],
    ['a versão como texto', { schema_version: '1' }],
  ])('não: %s', (_descricao, bruto) => {
    expect(formatoConhecido(bruto)).toBe(false)
  })

  it('é o que decide se o sanearPreferencias descarta tudo', () => {
    const outraVersao = { schema_version: 2, favorites: ['S01'], lists: [] }
    expect(formatoConhecido(outraVersao)).toBe(false)
    expect(sanearPreferencias(outraVersao, IDS)).toEqual({ schema_version: 1, favorites: [], lists: [] })
  })
})

// Preferências de exemplo para os testes do CRUD (já no formato válido).
function exemplo() {
  return {
    schema_version: 1,
    favorites: ['S01', 'S07'],
    lists: [
      { id: 'L1', name: 'Para trabalho em grupo', room_ids: ['S02', 'S07', 'S08'] },
      { id: 'L2', name: 'Silenciosas', room_ids: [] },
    ],
  }
}

describe('alternarFavorito: favoritar e desfavoritar', () => {
  it('uma sala que não é favorita entra no fim dos favoritos', () => {
    expect(alternarFavorito(exemplo(), 'S03').favorites).toEqual(['S01', 'S07', 'S03'])
  })

  it('uma sala favorita sai dos favoritos', () => {
    expect(alternarFavorito(exemplo(), 'S01').favorites).toEqual(['S07'])
  })

  it('duas vezes seguidas volta ao que era', () => {
    expect(alternarFavorito(alternarFavorito(exemplo(), 'S03'), 'S03')).toEqual(exemplo())
  })

  it('não muda as listas', () => {
    expect(alternarFavorito(exemplo(), 'S03').lists).toEqual(exemplo().lists)
  })

  it('funciona a partir do PREFERENCIAS_VAZIAS (que é congelado)', () => {
    expect(alternarFavorito(PREFERENCIAS_VAZIAS, 'S05')).toEqual({ schema_version: 1, favorites: ['S05'], lists: [] })
    expect(PREFERENCIAS_VAZIAS.favorites).toEqual([])
  })

  it('não muda as preferências recebidas: devolve um objeto novo', () => {
    const prefs = exemplo()
    const resultado = alternarFavorito(prefs, 'S01')
    expect(resultado).not.toBe(prefs)
    expect(prefs).toEqual(exemplo())
  })

  it.each([
    ['texto vazio', ''],
    ['null', null],
    ['número', 1],
  ])('um id que não é texto (%s) não muda nada', (_descricao, id) => {
    expect(alternarFavorito(exemplo(), id)).toEqual(exemplo())
  })
})

describe('validarNomeLista: confere o nome antes de criar ou renomear', () => {
  it('um nome bom sai sem os espaços em volta', () => {
    expect(validarNomeLista(exemplo(), '  Prova de física  ')).toEqual({ ok: true, nome: 'Prova de física', erro: null })
  })

  it.each([
    ['vazio', ''],
    ['só espaços', '    '],
    ['null', null],
    ['undefined', undefined],
  ])('sem nome (%s): pede um nome', (_descricao, nome) => {
    expect(validarNomeLista(exemplo(), nome)).toEqual({ ok: false, nome: '', erro: 'Dê um nome para a lista.' })
  })

  it('40 caracteres pode; 41 é demais', () => {
    expect(validarNomeLista(exemplo(), 'A'.repeat(40))).toEqual({ ok: true, nome: 'A'.repeat(40), erro: null })
    expect(validarNomeLista(exemplo(), 'A'.repeat(41))).toEqual({ ok: false, nome: 'A'.repeat(41), erro: 'Use até 40 caracteres.' })
  })

  it('os espaços em volta não contam no tamanho', () => {
    expect(validarNomeLista(exemplo(), `  ${'A'.repeat(40)}  `).ok).toBe(true)
  })

  it('um emoji conta como 1 caractere: 40 emojis pode, 41 é demais', () => {
    // O "texto.length" do JavaScript daria 80 e 82 (cada emoji tem duas metades).
    expect(validarNomeLista(exemplo(), '😀'.repeat(21)).ok).toBe(true)
    expect(validarNomeLista(exemplo(), '😀'.repeat(40)).ok).toBe(true)
    expect(validarNomeLista(exemplo(), '😀'.repeat(41)).erro).toBe('Use até 40 caracteres.')
  })

  it.each([
    ['espaço de largura zero', '\u200B'],
    ['vários invisíveis e espaços', ' \u200B\u2060\uFEFF '],
    ['só o juntador de emojis (ZWJ)', '\u200D'],
  ])('nome que não aparece na tela (%s): pede um nome', (_descricao, nome) => {
    expect(validarNomeLista(exemplo(), nome)).toEqual({ ok: false, nome: '', erro: 'Dê um nome para a lista.' })
  })

  it('o espaço de largura zero no meio de um nome sai (não aparece e enganaria a conferência do repetido)', () => {
    expect(validarNomeLista(PREFERENCIAS_VAZIAS, 'Pro\u200Bva')).toEqual({ ok: true, nome: 'Prova', erro: null })
    expect(validarNomeLista(exemplo(), 'Silen\u200Bciosas').erro).toBe('Já existe uma lista com esse nome.')
  })

  it('o emoji com ZWJ (a família) continua inteiro no nome', () => {
    const familia = '👨\u200D👩\u200D👧'
    expect(validarNomeLista(PREFERENCIAS_VAZIAS, `Grupo ${familia}`).nome).toBe(`Grupo ${familia}`)
  })

  it('nome que já existe em outra lista, sem diferenciar maiúsculas, não pode', () => {
    const erro = { ok: false, nome: 'silenciosas', erro: 'Já existe uma lista com esse nome.' }
    expect(validarNomeLista(exemplo(), 'silenciosas')).toEqual(erro)
    expect(validarNomeLista(exemplo(), '  SILENCIOSAS ').erro).toBe('Já existe uma lista com esse nome.')
  })

  it('ao renomear, a própria lista é ignorada (dá para só trocar maiúsculas)', () => {
    expect(validarNomeLista(exemplo(), 'SILENCIOSAS', 'L2')).toEqual({ ok: true, nome: 'SILENCIOSAS', erro: null })
    // Mas o nome de OUTRA lista continua proibido.
    expect(validarNomeLista(exemplo(), 'para trabalho em grupo', 'L2').ok).toBe(false)
  })

  it('sem listas, qualquer nome bom pode', () => {
    expect(validarNomeLista(PREFERENCIAS_VAZIAS, 'Silenciosas').ok).toBe(true)
  })
})

describe('criarLista: a lista nova vai para o fim', () => {
  it('cria a lista vazia, com o nome sem os espaços em volta', () => {
    const { prefs, erro } = criarLista(exemplo(), '  Prova de física ', 'L3')
    expect(erro).toBeNull()
    expect(prefs.lists).toEqual([...exemplo().lists, { id: 'L3', name: 'Prova de física', room_ids: [] }])
    expect(prefs.favorites).toEqual(exemplo().favorites)
  })

  it('cria a primeira lista a partir do vazio', () => {
    const { prefs } = criarLista(PREFERENCIAS_VAZIAS, 'Grupo', 'L1')
    expect(prefs).toEqual({ schema_version: 1, favorites: [], lists: [{ id: 'L1', name: 'Grupo', room_ids: [] }] })
  })

  it('não muda as preferências recebidas', () => {
    const recebidas = exemplo()
    criarLista(recebidas, 'Nova', 'L3')
    expect(recebidas).toEqual(exemplo())
  })

  it.each([
    ['sem nome', '', 'Dê um nome para a lista.'],
    ['nome longo demais', 'A'.repeat(41), 'Use até 40 caracteres.'],
    ['nome repetido', 'SILENCIOSAS', 'Já existe uma lista com esse nome.'],
  ])('com erro (%s), devolve as mesmas preferências e a mensagem', (_descricao, nome, mensagem) => {
    const recebidas = exemplo()
    const { prefs, erro } = criarLista(recebidas, nome, 'L3')
    expect(erro).toBe(mensagem)
    expect(prefs).toBe(recebidas)
  })

  it.each([
    ['id repetido', 'L1'],
    ['id vazio', ''],
    ['id que não é texto', 3],
  ])('com um id que não serve (%s), não cria e avisa', (_descricao, id) => {
    const recebidas = exemplo()
    const { prefs, erro } = criarLista(recebidas, 'Nova', id)
    expect(erro).toBe('Não foi possível criar a lista. Tente de novo.')
    expect(prefs).toBe(recebidas)
  })
})

describe('renomearLista', () => {
  it('troca o nome e mantém a lista no mesmo lugar, com as mesmas salas', () => {
    const { prefs, erro } = renomearLista(exemplo(), 'L1', '  Grupo de cálculo ')
    expect(erro).toBeNull()
    expect(prefs.lists).toEqual([
      { id: 'L1', name: 'Grupo de cálculo', room_ids: ['S02', 'S07', 'S08'] },
      { id: 'L2', name: 'Silenciosas', room_ids: [] },
    ])
  })

  it('pode só trocar maiúsculas do próprio nome', () => {
    expect(renomearLista(exemplo(), 'L2', 'SILENCIOSAS').prefs.lists[1].name).toBe('SILENCIOSAS')
  })

  it('não pode usar o nome de outra lista', () => {
    const recebidas = exemplo()
    const { prefs, erro } = renomearLista(recebidas, 'L2', 'para trabalho em grupo')
    expect(erro).toBe('Já existe uma lista com esse nome.')
    expect(prefs).toBe(recebidas)
  })

  it('não pode ficar sem nome', () => {
    expect(renomearLista(exemplo(), 'L2', '   ').erro).toBe('Dê um nome para a lista.')
  })

  it('lista que não existe: avisa e não muda nada', () => {
    const recebidas = exemplo()
    const { prefs, erro } = renomearLista(recebidas, 'L9', 'Qualquer')
    expect(erro).toBe('Lista não encontrada.')
    expect(prefs).toBe(recebidas)
  })

  it('não muda as preferências recebidas', () => {
    const recebidas = exemplo()
    renomearLista(recebidas, 'L1', 'Outro nome')
    expect(recebidas).toEqual(exemplo())
  })
})

describe('excluirLista', () => {
  it('tira só a lista com aquele id', () => {
    expect(excluirLista(exemplo(), 'L1').lists).toEqual([{ id: 'L2', name: 'Silenciosas', room_ids: [] }])
  })

  it('não mexe nos favoritos (as salas continuam favoritas)', () => {
    expect(excluirLista(exemplo(), 'L1').favorites).toEqual(['S01', 'S07'])
  })

  it('lista que não existe: nada muda', () => {
    expect(excluirLista(exemplo(), 'L9')).toEqual(exemplo())
  })

  it('não muda as preferências recebidas: devolve um objeto novo', () => {
    const recebidas = exemplo()
    const resultado = excluirLista(recebidas, 'L1')
    expect(resultado).not.toBe(recebidas)
    expect(recebidas).toEqual(exemplo())
  })
})

describe('adicionarSalaNaLista e removerSalaDaLista', () => {
  it('adiciona a sala no fim da lista certa, sem mexer nas outras', () => {
    const prefs = adicionarSalaNaLista(exemplo(), 'L2', 'S07')
    expect(prefs.lists).toEqual([
      { id: 'L1', name: 'Para trabalho em grupo', room_ids: ['S02', 'S07', 'S08'] },
      { id: 'L2', name: 'Silenciosas', room_ids: ['S07'] },
    ])
  })

  it('não duplica uma sala que já está na lista', () => {
    expect(adicionarSalaNaLista(exemplo(), 'L1', 'S07')).toEqual(exemplo())
  })

  it('lista que não existe ou id de sala que não é texto: nada muda', () => {
    expect(adicionarSalaNaLista(exemplo(), 'L9', 'S03')).toEqual(exemplo())
    expect(adicionarSalaNaLista(exemplo(), 'L2', '')).toEqual(exemplo())
    expect(adicionarSalaNaLista(exemplo(), 'L2', null)).toEqual(exemplo())
  })

  it('remove a sala da lista certa', () => {
    expect(removerSalaDaLista(exemplo(), 'L1', 'S07').lists[0].room_ids).toEqual(['S02', 'S08'])
  })

  it('remover uma sala que não está na lista (ou de uma lista que não existe): nada muda', () => {
    expect(removerSalaDaLista(exemplo(), 'L1', 'S05')).toEqual(exemplo())
    expect(removerSalaDaLista(exemplo(), 'L9', 'S02')).toEqual(exemplo())
  })

  it('adicionar e depois remover volta ao que era', () => {
    const prefs = removerSalaDaLista(adicionarSalaNaLista(exemplo(), 'L2', 'S04'), 'L2', 'S04')
    expect(prefs).toEqual(exemplo())
  })

  it('não muda as preferências recebidas, nem a lista de salas de dentro', () => {
    const recebidas = exemplo()
    const salasAntes = recebidas.lists[0].room_ids
    adicionarSalaNaLista(recebidas, 'L1', 'S03')
    removerSalaDaLista(recebidas, 'L1', 'S02')
    expect(recebidas).toEqual(exemplo())
    expect(recebidas.lists[0].room_ids).toBe(salasAntes)
  })
})
