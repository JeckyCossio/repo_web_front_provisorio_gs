import { describe, expect, it } from 'vitest'
import {
  LUGARES_POR_MESA,
  capacidadeSala,
  entrarNaMesa,
  mesasTotalmenteVazias,
  ocupacaoTotal,
  resumoOcupacao,
  sairDaMesa,
  taxaOcupacao,
  vagasIndividuais,
  validarMesas,
} from './ocupacao.js'

describe('regras de contagem (CONTEXTO, §4.2)', () => {
  it('cada mesa tem 3 lugares (RN-01)', () => {
    expect(LUGARES_POR_MESA).toBe(3)
  })

  it('exemplo do CONTEXTO: [1, 1, 1] tem 3 pessoas, 6 vagas e nenhuma mesa vazia', () => {
    const mesas = [1, 1, 1]
    expect(ocupacaoTotal(mesas)).toBe(3)
    expect(capacidadeSala(mesas)).toBe(9)
    expect(vagasIndividuais(mesas)).toBe(6)
    // Mesa com 1 pessoa não conta como vazia para o grupo (RN-06).
    expect(mesasTotalmenteVazias(mesas)).toBe(0)
  })

  it('o resumo junta tudo num objeto só', () => {
    expect(resumoOcupacao([1, 1, 1])).toEqual({
      total: 3, capacidade: 9, vagas: 6, mesasVazias: 0, taxa: 100 / 3,
    })
  })

  it('sala vazia [0, 0, 0]: ninguém, 9 vagas, 3 mesas vazias, taxa 0', () => {
    expect(resumoOcupacao([0, 0, 0])).toEqual({
      total: 0, capacidade: 9, vagas: 9, mesasVazias: 3, taxa: 0,
    })
  })

  it('sala cheia [3, 3, 3]: 9 pessoas, nenhuma vaga, nenhuma mesa vazia, taxa 100', () => {
    expect(resumoOcupacao([3, 3, 3])).toEqual({
      total: 9, capacidade: 9, vagas: 0, mesasVazias: 0, taxa: 100,
    })
  })

  it('taxa com 4 mesas (sala grande, capacidade 12)', () => {
    // [3, 2, 1, 0] = 6 de 12 lugares = 50%.
    expect(taxaOcupacao([3, 2, 1, 0])).toBe(50)
    // [3, 3, 3, 2] = 11 de 12 lugares = 91,666...%, sem arredondar.
    expect(taxaOcupacao([3, 3, 3, 2])).toBeCloseTo(91.6667, 4)
  })
})

describe('validarMesas', () => {
  it('aceita uma lista de inteiros de 0 a 3', () => {
    expect(validarMesas([0, 1, 2, 3])).toEqual({ valido: true, erros: [] })
  })

  it.each([
    ['uma mesa com 4 pessoas (passa de 3)', [1, 4, 0]],
    ['uma mesa negativa', [1, -1, 0]],
    ['meia pessoa', [1, 1.5, 0]],
    ['um texto no lugar do número', [1, '2', 0]],
    ['uma lista vazia', []],
    ['algo que não é lista', '1,1,1'],
    ['nada (undefined)', undefined],
  ])('recusa %s', (_descricao, mesas) => {
    const resultado = validarMesas(mesas)
    expect(resultado.valido).toBe(false)
    expect(resultado.erros.length).toBeGreaterThan(0)
  })

  it('diz qual mesa está errada', () => {
    expect(validarMesas([1, 4]).erros[0]).toMatch(/mesa 2/)
  })

  it('a mensagem mostra o número como número e o texto entre aspas', () => {
    expect(validarMesas([4]).erros).toEqual([
      'A mesa 1 tem o valor 4, mas precisa ser um número inteiro de 0 a 3.',
    ])
    // "2" (texto) e 2 (número) parecem iguais; as aspas mostram que veio texto.
    expect(validarMesas(['2']).erros).toEqual([
      'A mesa 1 tem o texto "2", mas precisa ser um número inteiro de 0 a 3.',
    ])
  })

  it('com várias mesas erradas, dá um erro para cada uma', () => {
    const { valido, erros } = validarMesas([4, 1, -1])
    expect(valido).toBe(false)
    expect(erros).toHaveLength(2)
    expect(erros[0]).toMatch(/^A mesa 1 tem o valor 4/)
    expect(erros[1]).toMatch(/^A mesa 3 tem o valor -1/)
  })

  // Valores que não viram texto sozinhos (Symbol, objeto sem protótipo) ou que viram um
  // texto enganoso (1n parece 1; [1] parece 1): a mensagem diz só o tipo, e nada quebra.
  it.each([
    ['um Symbol', Symbol('x'), 'symbol'],
    ['um objeto sem protótipo', Object.create(null), 'object'],
    ['um BigInt (1n)', 1n, 'bigint'],
    ['uma lista dentro da lista', [1], 'object'],
  ])('não lança erro com %s, e a mensagem diz o tipo', (_descricao, valor, tipo) => {
    expect(() => validarMesas([valor])).not.toThrow()
    expect(validarMesas([valor])).toEqual({
      valido: false,
      erros: [`A mesa 1 tem um valor do tipo ${tipo}, mas precisa ser um número inteiro de 0 a 3.`],
    })
  })
})

describe('as contas recusam mesas inválidas', () => {
  const contas = [
    ocupacaoTotal, capacidadeSala, vagasIndividuais,
    mesasTotalmenteVazias, taxaOcupacao, resumoOcupacao,
  ]
  const invalidas = [[4], [-1], [1.5], ['2'], [], 'não é lista', null]

  for (const conta of contas) {
    it(`${conta.name} lança erro em português`, () => {
      for (const mesas of invalidas) {
        expect(() => conta(mesas)).toThrow(/Mesas inválidas/)
      }
    })
  }
})

describe('botões de entrar e sair (RN-05)', () => {
  it('entrar soma 1 pessoa na mesa escolhida', () => {
    expect(entrarNaMesa([0, 1, 2], 1)).toEqual([0, 2, 2])
  })

  it('entrar numa mesa cheia não passa de 3', () => {
    expect(entrarNaMesa([3, 0, 0], 0)).toEqual([3, 0, 0])
  })

  it('sair tira 1 pessoa da mesa escolhida', () => {
    expect(sairDaMesa([0, 1, 2], 2)).toEqual([0, 1, 1])
  })

  it('sair de uma mesa vazia não fica negativo', () => {
    expect(sairDaMesa([0, 1, 2], 0)).toEqual([0, 1, 2])
  })

  it('entrar e sair não mudam a lista original (devolvem uma lista nova)', () => {
    const original = [1, 1, 1]
    const depoisDeEntrar = entrarNaMesa(original, 0)
    const depoisDeSair = sairDaMesa(original, 0)
    expect(original).toEqual([1, 1, 1])
    expect(depoisDeEntrar).not.toBe(original)
    expect(depoisDeSair).not.toBe(original)
  })

  it('mesmo quando nada muda, devolve uma cópia e não a mesma lista', () => {
    const cheia = [3, 3]
    const resultado = entrarNaMesa(cheia, 0)
    expect(resultado).toEqual([3, 3])
    expect(resultado).not.toBe(cheia)
  })

  it.each([
    ['negativo (-1)', -1],
    ['depois da última mesa (3)', 3],
    ['quebrado (1.5)', 1.5],
    ['texto ("0")', '0'],
    ['ausente (undefined)', undefined],
  ])('índice %s devolve uma cópia igual', (_descricao, indice) => {
    const mesas = [0, 1, 2]
    expect(entrarNaMesa(mesas, indice)).toEqual([0, 1, 2])
    expect(sairDaMesa(mesas, indice)).toEqual([0, 1, 2])
    expect(entrarNaMesa(mesas, indice)).not.toBe(mesas)
  })

  it('com mesas inválidas, entrar e sair também lançam erro', () => {
    expect(() => entrarNaMesa([4, 0], 1)).toThrow(/Mesas inválidas/)
    expect(() => sairDaMesa('1,1', 0)).toThrow(/Mesas inválidas/)
  })
})
