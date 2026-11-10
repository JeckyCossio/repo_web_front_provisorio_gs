import { describe, expect, it } from 'vitest'
import { LEITURAS_DEMO, SALAS } from '../data/salas.js'
import {
  classificarFaixa,
  classificarSala,
  classificarSeveridade,
  estadoGeral,
  indiceRuido,
} from './classificacao.js'

// Os resultados esperados vêm da regra escrita na proposta dos limiares (PROVISÓRIA):
// faixa 'baixo' se v < limiteBaixo; 'alto' se v > limiteAlto; senão 'medio'.
// As comparações são estritas: o número do próprio limite fica em 'medio'.

describe('classificarFaixa: onde o valor está na escala', () => {
  it.each([
    ['temperatura', 20.9, 'baixo'],
    ['temperatura', 21, 'medio'],
    ['temperatura', 26, 'medio'],
    ['temperatura', 26.1, 'alto'],
    ['luz', 299, 'baixo'],
    ['luz', 300, 'medio'],
    ['luz', 750, 'medio'],
    ['luz', 751, 'alto'],
    ['ruido', 39.9, 'baixo'],
    ['ruido', 40, 'medio'],
    ['ruido', 55, 'medio'],
    ['ruido', 55.1, 'alto'],
    ['ocupacao', 34.9, 'baixo'],
    ['ocupacao', 35, 'medio'],
    ['ocupacao', 70, 'medio'],
    ['ocupacao', 70.1, 'alto'],
  ])('%s com %s fica na faixa %s', (indicador, valor, esperado) => {
    expect(classificarFaixa(indicador, valor)).toBe(esperado)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['NaN', NaN],
    ['infinito', Infinity],
    ['um texto, mesmo com número dentro ("22")', '22'],
  ])('valor inválido (%s) não tem faixa: null', (_descricao, valor) => {
    expect(classificarFaixa('temperatura', valor)).toBeNull()
  })

  it('um indicador que não existe é erro de programação', () => {
    expect(() => classificarFaixa('umidade', 50)).toThrow(/Indicador desconhecido/)
    // "toString" existe em todo objeto do JavaScript, mas não é um indicador.
    expect(() => classificarFaixa('toString', 50)).toThrow(/Indicador desconhecido/)
  })
})

// Severidade: 'critico' se passou de um limite crítico; senão 'atencao' se passou de um
// limite de atenção; senão 'adequado'. Limite null = aquele lado não dá problema.
describe('classificarSeveridade: se a sala está boa para usar', () => {
  it.each([
    // Temperatura: frio e calor alertam (RN-09).
    ['temperatura', 17.9, 'critico'],
    ['temperatura', 18, 'atencao'], // 18 °C é atenção, não crítico
    ['temperatura', 20.9, 'atencao'],
    ['temperatura', 21, 'adequado'],
    ['temperatura', 25, 'adequado'],
    ['temperatura', 25.1, 'atencao'],
    ['temperatura', 26, 'atencao'],
    ['temperatura', 26.1, 'critico'],
    // Luz: pouca e muita luz alertam (RN-09).
    ['luz', 0, 'critico'],
    ['luz', 199, 'critico'],
    ['luz', 200, 'atencao'],
    ['luz', 299, 'atencao'],
    ['luz', 300, 'adequado'],
    ['luz', 2000, 'adequado'],
    ['luz', 2001, 'atencao'],
    ['luz', 3000, 'atencao'],
    ['luz', 3001, 'critico'],
    // Ruído: só o barulho alerta. 30 é o começo da escala simulada (RUIDO_DB_MIN);
    // um valor abaixo dele é erro de leitura e já é recusado antes, no normalizar.js.
    ['ruido', 30, 'adequado'],
    ['ruido', 45, 'adequado'],
    ['ruido', 45.1, 'atencao'],
    ['ruido', 65, 'atencao'],
    ['ruido', 65.1, 'critico'],
    // Ocupação (%): só a sala cheia alerta.
    ['ocupacao', 0, 'adequado'],
    ['ocupacao', 50, 'adequado'],
    ['ocupacao', 50.1, 'atencao'],
    ['ocupacao', 90, 'atencao'],
    ['ocupacao', 90.1, 'critico'],
    ['ocupacao', 100, 'critico'],
  ])('%s com %s é %s', (indicador, valor, esperado) => {
    expect(classificarSeveridade(indicador, valor)).toBe(esperado)
  })

  it('faixa e severidade são coisas diferentes (CONTEXTO, §5.2)', () => {
    // 920 lux: faixa alta, mas a luz está boa.
    expect(classificarFaixa('luz', 920)).toBe('alto')
    expect(classificarSeveridade('luz', 920)).toBe('adequado')
    // 10 °C: faixa baixa, e baixo NÃO quer dizer bom (RN-09).
    expect(classificarFaixa('temperatura', 10)).toBe('baixo')
    expect(classificarSeveridade('temperatura', 10)).toBe('critico')
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['NaN', NaN],
    ['infinito', -Infinity],
    ['um texto ("54")', '54'],
  ])('valor inválido (%s) é "invalido"', (_descricao, valor) => {
    expect(classificarSeveridade('ruido', valor)).toBe('invalido')
  })

  it('um indicador que não existe é erro de programação', () => {
    expect(() => classificarSeveridade('umidade', 50)).toThrow(/Indicador desconhecido/)
  })
})

// Índice de ruído (CONTEXTO, §5.3): 100 × (dB − 30) ÷ (80 − 30), arredondado e limitado a 0..100.
// 100 = mais ruidoso. Os valores esperados são os da tabela do potenciômetro na proposta.
describe('indiceRuido: a intensidade do ruído de 0 a 100', () => {
  it.each([
    [30, 0], // começo da escala
    [40, 20],
    [45, 30],
    [54, 48], // o exemplo da S01 no CONTEXTO, §6.3
    [55, 50],
    [65, 70],
    [80, 100], // fim da escala
  ])('%s dB simulados viram índice %s', (db, esperado) => {
    expect(indiceRuido(db)).toBe(esperado)
  })

  it('fora da escala, fica preso entre 0 e 100', () => {
    expect(indiceRuido(20)).toBe(0)
    expect(indiceRuido(29.9)).toBe(0)
    expect(indiceRuido(80.1)).toBe(100)
    expect(indiceRuido(120)).toBe(100)
  })

  it('sempre devolve um número inteiro (arredonda; 0,5 sobe)', () => {
    expect(indiceRuido(30.2)).toBe(0) // 0,4 → 0
    expect(indiceRuido(30.25)).toBe(1) // 0,5 → 1
    expect(indiceRuido(30.3)).toBe(1) // 0,6 → 1
    expect(indiceRuido(57)).toBe(54)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['NaN', NaN],
    ['infinito', Infinity],
    ['um texto ("54")', '54'],
  ])('valor inválido (%s) devolve null', (_descricao, db) => {
    expect(indiceRuido(db)).toBeNull()
  })
})

// Estado geral = a regra dos LEDs (RN-08), com a falha à parte (CONTEXTO, §5.2).
describe('estadoGeral: os 4 estados', () => {
  const tudoAdequado = ['adequado', 'adequado', 'adequado', 'adequado']

  it('verde: todos adequados', () => {
    expect(estadoGeral(tudoAdequado, null)).toBe('verde')
    expect(estadoGeral(tudoAdequado, 'ok')).toBe('verde')
    expect(estadoGeral(tudoAdequado)).toBe('verde') // sala demo: sem status
  })

  it('amarelo: nenhum crítico e pelo menos um em atenção', () => {
    expect(estadoGeral(['adequado', 'atencao', 'adequado', 'adequado'], 'ok')).toBe('amarelo')
  })

  it('vermelho: pelo menos um crítico (mesmo com outros em atenção)', () => {
    expect(estadoGeral(['critico', 'atencao', 'adequado', 'adequado'], 'ok')).toBe('vermelho')
  })

  it('falha: alguma leitura inválida, mesmo com o resto adequado', () => {
    expect(estadoGeral(['adequado', 'invalido', 'adequado', 'adequado'], 'ok')).toBe('falha')
  })

  it('falha tem prioridade sobre o vermelho', () => {
    expect(estadoGeral(['critico', 'invalido', 'adequado', 'adequado'], 'ok')).toBe('falha')
    expect(estadoGeral(['critico', 'critico', 'critico', 'critico'], 'sensor_error')).toBe('falha')
  })

  it.each(['offline', 'sensor_error', 'sem_leitura', 'dados_invalidos', 'OK', ''])(
    'falha com o status "%s", mesmo com tudo adequado',
    (status) => {
      expect(estadoGeral(tudoAdequado, status)).toBe('falha')
    },
  )

  it('nunca verde por falta de leitura: lista vazia, ausente ou com severidade desconhecida', () => {
    expect(estadoGeral([], null)).toBe('falha')
    expect(estadoGeral(undefined, null)).toBe('falha')
    expect(estadoGeral('adequado', null)).toBe('falha')
    expect(estadoGeral(['adequado', 'bom'], null)).toBe('falha')
  })
})

// Uma sala normalizada (o formato do normalizar.js), com o exemplo FICTÍCIO do CONTEXTO, §6.3.
function salaExemploS01(mudancas) {
  return {
    id: 'S01',
    nome: 'Sala de Estudo 01',
    porte: 'media',
    mesas: [1, 2, 0],
    temperaturaC: 22.8,
    luz: { valor: 410, unidade: 'lux_estimado' },
    ruidoDb: 54,
    origem: 'iot',
    statusDispositivo: 'ok',
    atualizadoEm: '2026-11-08T14:32:00Z',
    ...mudancas,
  }
}

describe('classificarSala: a sala inteira de uma vez', () => {
  it('o exemplo da S01 (CONTEXTO, §6.3) fica amarelo por causa do ruído', () => {
    expect(classificarSala(salaExemploS01())).toEqual({
      temperatura: { valor: 22.8, faixa: 'medio', severidade: 'adequado' },
      luz: { valor: 410, unidade: 'lux_estimado', faixa: 'medio', severidade: 'adequado' },
      ruido: { valor: 54, faixa: 'medio', severidade: 'atencao', indice: 48 },
      ocupacao: {
        total: 3, capacidade: 9, vagas: 6, mesasVazias: 1,
        taxa: expect.closeTo(33.333, 3), // 3 de 9 lugares
        faixa: 'baixo', severidade: 'adequado',
      },
      estado: 'amarelo',
    })
  })

  it('frio demais não é verde (RN-09): 10 °C com o resto adequado fica vermelho', () => {
    const sala = salaExemploS01({ temperaturaC: 10, ruidoDb: 40 })
    const resultado = classificarSala(sala)
    expect(resultado.temperatura).toEqual({ valor: 10, faixa: 'baixo', severidade: 'critico' })
    expect(resultado.estado).toBe('vermelho')
  })

  it('escuro demais também não é verde: 150 lux fica vermelho', () => {
    const sala = salaExemploS01({ luz: { valor: 150, unidade: 'lux_estimado' }, ruidoDb: 40 })
    expect(classificarSala(sala).estado).toBe('vermelho')
  })

  it('com tudo adequado e o status "ok", fica verde', () => {
    expect(classificarSala(salaExemploS01({ ruidoDb: 40 })).estado).toBe('verde')
  })

  it('falha com o status "offline", mesmo com tudo adequado', () => {
    const sala = salaExemploS01({ ruidoDb: 40, statusDispositivo: 'offline' })
    const resultado = classificarSala(sala)
    expect(resultado.temperatura.severidade).toBe('adequado')
    expect(resultado.ruido.severidade).toBe('adequado')
    expect(resultado.estado).toBe('falha')
  })

  it.each([
    ['uma mesa com 4 pessoas', [4, 0, 0]],
    ['uma mesa negativa', [1, -1, 0]],
    ['nenhuma lista (null)', null],
    ['lista vazia', []],
  ])('mesas inválidas (%s): ocupação "invalido" e estado "falha", sem lançar erro', (_d, mesas) => {
    const resultado = classificarSala(salaExemploS01({ mesas }))
    expect(resultado.ocupacao).toEqual({
      total: null, capacidade: null, vagas: null, mesasVazias: null, taxa: null,
      faixa: null, severidade: 'invalido',
    })
    expect(resultado.estado).toBe('falha')
  })

  it('leitura que falta vira "invalido" e a sala fica em "falha"', () => {
    const resultado = classificarSala(salaExemploS01({ temperaturaC: null }))
    expect(resultado.temperatura).toEqual({ valor: null, faixa: null, severidade: 'invalido' })
    expect(resultado.estado).toBe('falha')
  })

  it('luz em outra unidade ("indice") não é comparada com limites em lux: "invalido"', () => {
    const resultado = classificarSala(salaExemploS01({ luz: { valor: 410, unidade: 'indice' } }))
    expect(resultado.luz).toEqual({ valor: 410, unidade: 'indice', faixa: null, severidade: 'invalido' })
    expect(resultado.estado).toBe('falha')
  })

  it('o ruído traz o índice 0 a 100 junto', () => {
    expect(classificarSala(salaExemploS01({ ruidoDb: 71 })).ruido).toEqual({
      valor: 71, faixa: 'alto', severidade: 'critico', indice: 82,
    })
  })

  it('mesas com valores que nem viram texto (Symbol, objeto sem protótipo) não fazem lançar erro', () => {
    for (const mesa of [Symbol('x'), Object.create(null)]) {
      expect(() => classificarSala(salaExemploS01({ mesas: [mesa, 0, 0] }))).not.toThrow()
      expect(classificarSala(salaExemploS01({ mesas: [mesa, 0, 0] })).estado).toBe('falha')
    }
  })

  it('sem sala nenhuma (null), não lança erro: tudo "invalido" e estado "falha"', () => {
    const resultado = classificarSala(null)
    expect(resultado.temperatura.severidade).toBe('invalido')
    expect(resultado.luz.severidade).toBe('invalido')
    expect(resultado.ruido).toEqual({ valor: null, faixa: null, severidade: 'invalido', indice: null })
    expect(resultado.ocupacao.severidade).toBe('invalido')
    expect(resultado.estado).toBe('falha')
  })
})

// [Dado fictício] As oito salas de demonstração (CONTEXTO, §7.6). O esperado é a tabela
// de conferência da proposta dos limiares, feita à mão (faixa e severidade de cada indicador).
describe('as 8 salas demo classificadas', () => {
  const esperado = {
    //    temperatura          luz                  ruído                ocupação             estado
    S02: ['medio adequado', 'medio adequado', 'medio adequado', 'baixo adequado', 'verde'],
    S03: ['baixo atencao', 'alto adequado', 'alto critico', 'alto critico', 'vermelho'],
    S04: ['medio adequado', 'medio adequado', 'medio atencao', 'baixo adequado', 'amarelo'],
    S05: ['medio adequado', 'medio adequado', 'alto atencao', 'medio atencao', 'amarelo'],
    S06: ['baixo atencao', 'baixo critico', 'alto atencao', 'medio atencao', 'vermelho'],
    S07: ['medio adequado', 'medio adequado', 'baixo adequado', 'baixo adequado', 'verde'],
    S08: ['medio adequado', 'medio adequado', 'medio atencao', 'medio adequado', 'amarelo'],
    S09: ['alto critico', 'alto adequado', 'alto critico', 'alto atencao', 'vermelho'],
  }

  for (const sala of SALAS.filter((s) => s.origem === 'demo')) {
    it(`${sala.id} sai como na tabela, sem erro`, () => {
      const salaDemo = { ...sala, ...LEITURAS_DEMO[sala.id], statusDispositivo: null }
      const r = classificarSala(salaDemo)
      const juntar = (indicador) => `${indicador.faixa} ${indicador.severidade}`
      expect([juntar(r.temperatura), juntar(r.luz), juntar(r.ruido), juntar(r.ocupacao), r.estado])
        .toEqual(esperado[sala.id])
    })
  }

  it('dão 2 verdes, 3 amarelas e 3 vermelhas', () => {
    const contagem = { verde: 0, amarelo: 0, vermelho: 0, falha: 0 }
    for (const sala of SALAS.filter((s) => s.origem === 'demo')) {
      const estado = classificarSala({ ...sala, ...LEITURAS_DEMO[sala.id] }).estado
      contagem[estado] = contagem[estado] + 1
    }
    expect(contagem).toEqual({ verde: 2, amarelo: 3, vermelho: 3, falha: 0 })
  })
})
