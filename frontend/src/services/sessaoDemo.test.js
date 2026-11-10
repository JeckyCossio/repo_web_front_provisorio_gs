import { describe, expect, it } from 'vitest'
import { CHAVE_SESSAO, apagarSessao, lerSessao, salvarSessao } from './sessaoDemo.js'

// Um armazenamento falso, feito à mão, com o mesmo getItem/setItem/removeItem do sessionStorage.
// Como o de verdade, guarda tudo como texto e devolve null para a chave que não existe.
function criarArmazenamentoFalso(inicial = {}) {
  const dados = new Map(Object.entries(inicial))
  return {
    getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
    setItem: (chave, valor) => {
      dados.set(chave, String(valor))
    },
    removeItem: (chave) => {
      dados.delete(chave)
    },
    dados, // para o teste espiar o que ficou guardado
  }
}

describe('CHAVE_SESSAO', () => {
  it('é a chave combinada para a sessão da demonstração', () => {
    expect(CHAVE_SESSAO).toBe('citizentech_sessao_demo')
  })
})

describe('lerSessao e salvarSessao: a matrícula de quem entrou', () => {
  it('sem nada salvo, ninguém entrou: devolve null', () => {
    expect(lerSessao(criarArmazenamentoFalso())).toBe(null)
  })

  it('o que o salvarSessao grava, o lerSessao lê de volta', () => {
    const armazenamento = criarArmazenamentoFalso()
    expect(salvarSessao(armazenamento, 'RM000000')).toBe(true)
    expect(lerSessao(armazenamento)).toBe('RM000000')
  })

  it('grava em JSON, na chave CHAVE_SESSAO', () => {
    const armazenamento = criarArmazenamentoFalso()
    salvarSessao(armazenamento, 'RM000000')
    expect(JSON.parse(armazenamento.dados.get(CHAVE_SESSAO))).toEqual({ matricula: 'RM000000' })
  })
})

describe('apagarSessao: o "Sair"', () => {
  it('apaga a sessão: depois dele, ninguém entrou', () => {
    const armazenamento = criarArmazenamentoFalso()
    salvarSessao(armazenamento, 'RM000000')
    expect(apagarSessao(armazenamento)).toBe(true)
    expect(lerSessao(armazenamento)).toBe(null)
    expect(armazenamento.dados.has(CHAVE_SESSAO)).toBe(false)
  })

  it('não mexe nas outras chaves (as listas ficam em outra)', () => {
    const armazenamento = criarArmazenamentoFalso({ outra_chave: 'fica' })
    salvarSessao(armazenamento, 'RM000000')
    apagarSessao(armazenamento)
    expect(armazenamento.dados.get('outra_chave')).toBe('fica')
  })
})

// Um armazenamento que lança erro em tudo, como o do navegador que bloqueia os dados do site.
const ARMAZENAMENTO_BLOQUEADO = {
  getItem: () => {
    throw new DOMException('O acesso ao armazenamento foi negado.', 'SecurityError')
  },
  setItem: () => {
    throw new DOMException('O armazenamento está cheio.', 'QuotaExceededError')
  },
  removeItem: () => {
    throw new DOMException('O acesso ao armazenamento foi negado.', 'SecurityError')
  },
}

describe('sessaoDemo: nunca quebra a tela', () => {
  it('texto salvo que não é JSON: conta como ninguém entrou', () => {
    expect(lerSessao(criarArmazenamentoFalso({ [CHAVE_SESSAO]: '{"matricula": ' }))).toBe(null)
  })

  it('JSON válido em outro formato: conta como ninguém entrou', () => {
    const formatos = ['null', '"RM000000"', '[]', '{}', '{"matricula": 123}', '{"matricula": ""}', '{"matricula": "   "}']
    for (const texto of formatos) {
      expect(lerSessao(criarArmazenamentoFalso({ [CHAVE_SESSAO]: texto }))).toBe(null)
    }
  })

  it('armazenamento bloqueado: ler dá null, gravar e apagar dão false, sem lançar erro', () => {
    expect(lerSessao(ARMAZENAMENTO_BLOQUEADO)).toBe(null)
    expect(salvarSessao(ARMAZENAMENTO_BLOQUEADO, 'RM000000')).toBe(false)
    expect(apagarSessao(ARMAZENAMENTO_BLOQUEADO)).toBe(false)
  })

  it('sem armazenamento (null: o navegador nem deixou pegar o sessionStorage): o mesmo', () => {
    expect(lerSessao(null)).toBe(null)
    expect(salvarSessao(null, 'RM000000')).toBe(false)
    expect(apagarSessao(null)).toBe(false)
  })
})
