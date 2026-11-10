import { describe, expect, it } from 'vitest'
import { SALAS } from '../data/salas.js'
import { PREFERENCIAS_VAZIAS } from '../utils/colecoes.js'
import { CHAVE_PREFERENCIAS, lerPreferencias, salvarPreferencias } from './colecoesLocais.js'

const IDS_VALIDOS = SALAS.map((sala) => sala.id) // S01 a S09
const AVISO_LEITURA = 'Não foi possível ler suas listas salvas; começamos do zero.'

// O exemplo de dados locais do CONTEXTO, §7.7.
const PREFS_EXEMPLO = {
  schema_version: 1,
  favorites: ['S01', 'S07'],
  lists: [{ id: 'local-uuid-da-lista', name: 'Para trabalho em grupo', room_ids: ['S02', 'S07', 'S08'] }],
}

// Um armazenamento falso, feito à mão, com o mesmo getItem/setItem do localStorage.
// Como o de verdade, guarda tudo como texto e devolve null para a chave que não existe.
function criarArmazenamentoFalso(inicial = {}) {
  const dados = new Map(Object.entries(inicial))
  return {
    getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
    setItem: (chave, valor) => {
      dados.set(chave, String(valor))
    },
    dados, // para o teste espiar o que ficou guardado
  }
}

// Um armazenamento que lança erro, como o localStorage bloqueado pelo navegador ou cheio.
const ARMAZENAMENTO_BLOQUEADO = {
  getItem: () => {
    throw new DOMException('O acesso ao armazenamento foi negado.', 'SecurityError')
  },
  setItem: () => {
    throw new DOMException('O armazenamento está cheio.', 'QuotaExceededError')
  },
}

describe('CHAVE_PREFERENCIAS', () => {
  it('é a chave decidida no CONTEXTO, §7.7 (mudar apagaria as listas de quem já usa)', () => {
    expect(CHAVE_PREFERENCIAS).toBe('citizentech_user_preferences_v1')
  })
})

describe('lerPreferencias: lê as listas e os favoritos salvos', () => {
  it('sem nada salvo, devolve as preferências vazias e nenhum aviso', () => {
    expect(lerPreferencias(criarArmazenamentoFalso(), IDS_VALIDOS)).toEqual({ prefs: PREFERENCIAS_VAZIAS, aviso: null })
  })

  it('lê o que está salvo na chave CHAVE_PREFERENCIAS', () => {
    const armazenamento = criarArmazenamentoFalso({ citizentech_user_preferences_v1: JSON.stringify(PREFS_EXEMPLO) })
    expect(lerPreferencias(armazenamento, IDS_VALIDOS)).toEqual({ prefs: PREFS_EXEMPLO, aviso: null })
  })

  it('não lê outra chave', () => {
    const armazenamento = criarArmazenamentoFalso({ outra_chave: JSON.stringify(PREFS_EXEMPLO) })
    expect(lerPreferencias(armazenamento, IDS_VALIDOS).prefs).toEqual(PREFERENCIAS_VAZIAS)
  })

  it('passa pelo sanearPreferencias: tira a sala que não existe e o favorito repetido', () => {
    const salvo = {
      schema_version: 1,
      favorites: ['S01', 'S99', 'S01'],
      lists: [{ id: 'a', name: 'Grupo', room_ids: ['S02', 'S99'] }],
    }
    const armazenamento = criarArmazenamentoFalso({ [CHAVE_PREFERENCIAS]: JSON.stringify(salvo) })
    expect(lerPreferencias(armazenamento, IDS_VALIDOS)).toEqual({
      prefs: { schema_version: 1, favorites: ['S01'], lists: [{ id: 'a', name: 'Grupo', room_ids: ['S02'] }] },
      aviso: null,
    })
  })

  it('JSON quebrado: começa do vazio e avisa', () => {
    const armazenamento = criarArmazenamentoFalso({ [CHAVE_PREFERENCIAS]: '{"schema_version": 1, "favorites": [' })
    expect(lerPreferencias(armazenamento, IDS_VALIDOS)).toEqual({ prefs: PREFERENCIAS_VAZIAS, aviso: AVISO_LEITURA })
  })

  it('JSON quebrado: ler não apaga o que estava salvo (ainda dá para recuperar à mão)', () => {
    const quebrado = '{"schema_version": 1, "favorites": ['
    const armazenamento = criarArmazenamentoFalso({ [CHAVE_PREFERENCIAS]: quebrado })
    lerPreferencias(armazenamento, IDS_VALIDOS)
    expect(armazenamento.dados.get(CHAVE_PREFERENCIAS)).toBe(quebrado)
  })

  it.each([
    ['outra versão do formato', JSON.stringify({ schema_version: 2, favorites: ['S01'], lists: [{ id: 'a', name: 'Minha', room_ids: ['S02'] }] })],
    ['um objeto sem schema_version', JSON.stringify({ favorites: ['S01'], lists: [] })],
    ['uma lista', JSON.stringify(['S01'])],
    ['null', 'null'],
    ['um número', '42'],
    ['um texto', '"lixo"'],
  ])('JSON certo num formato desconhecido (%s): começa do vazio e avisa', (_descricao, texto) => {
    const armazenamento = criarArmazenamentoFalso({ [CHAVE_PREFERENCIAS]: texto })
    expect(lerPreferencias(armazenamento, IDS_VALIDOS)).toEqual({ prefs: PREFERENCIAS_VAZIAS, aviso: AVISO_LEITURA })
    expect(armazenamento.dados.get(CHAVE_PREFERENCIAS)).toBe(texto) // e ler não apaga o que estava salvo
  })

  it('formato conhecido mas sem nada dentro: o vazio, sem aviso (não se perdeu nada)', () => {
    const armazenamento = criarArmazenamentoFalso({ [CHAVE_PREFERENCIAS]: JSON.stringify(PREFERENCIAS_VAZIAS) })
    expect(lerPreferencias(armazenamento, IDS_VALIDOS)).toEqual({ prefs: PREFERENCIAS_VAZIAS, aviso: null })
  })

  it('formato conhecido com salas que não existem mais: tira as salas, sem aviso', () => {
    const salvo = { schema_version: 1, favorites: ['S99'], lists: [] }
    const armazenamento = criarArmazenamentoFalso({ [CHAVE_PREFERENCIAS]: JSON.stringify(salvo) })
    expect(lerPreferencias(armazenamento, IDS_VALIDOS)).toEqual({ prefs: PREFERENCIAS_VAZIAS, aviso: null })
  })

  it('um armazenamento falso sobre um Map (o get devolve undefined): é "nada salvo", sem aviso', () => {
    const mapa = new Map()
    const armazenamento = { getItem: (chave) => mapa.get(chave), setItem: (chave, valor) => mapa.set(chave, valor) }
    expect(lerPreferencias(armazenamento, IDS_VALIDOS)).toEqual({ prefs: PREFERENCIAS_VAZIAS, aviso: null })
  })

  it('armazenamento bloqueado (o getItem lança erro): começa do vazio e avisa', () => {
    expect(lerPreferencias(ARMAZENAMENTO_BLOQUEADO, IDS_VALIDOS)).toEqual({ prefs: PREFERENCIAS_VAZIAS, aviso: AVISO_LEITURA })
  })

  it('sem armazenamento nenhum (null): começa do vazio e avisa, sem quebrar', () => {
    expect(lerPreferencias(null, IDS_VALIDOS)).toEqual({ prefs: PREFERENCIAS_VAZIAS, aviso: AVISO_LEITURA })
  })

  it('sem a lista dos ids válidos, lança o erro do domain (é erro de quem programou, não vira aviso)', () => {
    const armazenamento = criarArmazenamentoFalso({ [CHAVE_PREFERENCIAS]: JSON.stringify(PREFS_EXEMPLO) })
    expect(() => lerPreferencias(armazenamento)).toThrow(/idsValidos/)
  })
})

describe('salvarPreferencias: grava as listas e os favoritos', () => {
  it('grava em JSON na chave CHAVE_PREFERENCIAS e devolve true', () => {
    const armazenamento = criarArmazenamentoFalso()
    expect(salvarPreferencias(armazenamento, PREFS_EXEMPLO)).toBe(true)
    expect(JSON.parse(armazenamento.dados.get(CHAVE_PREFERENCIAS))).toEqual(PREFS_EXEMPLO)
  })

  it('o que foi salvo volta igual na leitura', () => {
    const armazenamento = criarArmazenamentoFalso()
    salvarPreferencias(armazenamento, PREFS_EXEMPLO)
    expect(lerPreferencias(armazenamento, IDS_VALIDOS)).toEqual({ prefs: PREFS_EXEMPLO, aviso: null })
  })

  it('salvar de novo troca o que estava salvo', () => {
    const armazenamento = criarArmazenamentoFalso({ [CHAVE_PREFERENCIAS]: JSON.stringify(PREFS_EXEMPLO) })
    salvarPreferencias(armazenamento, PREFERENCIAS_VAZIAS)
    expect(lerPreferencias(armazenamento, IDS_VALIDOS).prefs).toEqual(PREFERENCIAS_VAZIAS)
  })

  it('armazenamento cheio ou bloqueado (o setItem lança erro): devolve false, sem quebrar', () => {
    expect(salvarPreferencias(ARMAZENAMENTO_BLOQUEADO, PREFS_EXEMPLO)).toBe(false)
  })

  it('sem armazenamento nenhum (null): devolve false, sem quebrar', () => {
    expect(salvarPreferencias(null, PREFS_EXEMPLO)).toBe(false)
  })
})
