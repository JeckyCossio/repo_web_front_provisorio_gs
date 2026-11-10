import { describe, expect, it } from 'vitest'
import { LEITURA_POSSIVEL, LIMIARES, RUIDO_DB_MAX, RUIDO_DB_MIN } from './limiares.js'

// Estes testes não conferem os números um a um (isso fica nos testes da classificação,
// pelas bordas). Eles conferem se a tabela faz sentido, para um número digitado errado
// não passar despercebido quando o grupo mudar algum limite.

const NOMES = ['temperatura', 'luz', 'ruido', 'ocupacao']

describe('a tabela de limiares (PROVISÓRIA)', () => {
  it('tem os quatro indicadores do CONTEXTO, §5.2', () => {
    expect(Object.keys(LIMIARES)).toEqual(NOMES)
  })

  it('cada indicador diz a sua unidade', () => {
    expect(LIMIARES.temperatura.unidade).toBe('°C')
    expect(LIMIARES.luz.unidade).toBe('lux_estimado')
    expect(LIMIARES.ruido.unidade).toBe('dB_simulados')
    expect(LIMIARES.ocupacao.unidade).toBe('%')
  })

  for (const nome of NOMES) {
    it(`${nome}: limiteBaixo e limiteAlto são números, e limiteBaixo <= limiteAlto`, () => {
      const { limiteBaixo, limiteAlto } = LIMIARES[nome]
      expect(typeof limiteBaixo).toBe('number')
      expect(typeof limiteAlto).toBe('number')
      expect(limiteBaixo).toBeLessThanOrEqual(limiteAlto)
    })

    it(`${nome}: criticoAbaixo <= atencaoAbaixo <= atencaoAcima <= criticoAcima (pulando os null)`, () => {
      const l = LIMIARES[nome]
      const emOrdem = [l.criticoAbaixo, l.atencaoAbaixo, l.atencaoAcima, l.criticoAcima]
      // Cada limite é um número ou null (null = "este lado não dá problema").
      for (const limite of emOrdem) {
        expect(limite === null || typeof limite === 'number').toBe(true)
      }
      const semNulos = emOrdem.filter((limite) => limite !== null)
      for (let i = 1; i < semNulos.length; i++) {
        expect(semNulos[i - 1]).toBeLessThanOrEqual(semNulos[i])
      }
    })
  }

  it('pouco ruído e pouca gente não são problema: os limites de baixo são null', () => {
    expect(LIMIARES.ruido.criticoAbaixo).toBeNull()
    expect(LIMIARES.ruido.atencaoAbaixo).toBeNull()
    expect(LIMIARES.ocupacao.criticoAbaixo).toBeNull()
    expect(LIMIARES.ocupacao.atencaoAbaixo).toBeNull()
  })

  it('frio e escuro demais alertam (RN-09): temperatura e luz têm limite de baixo', () => {
    expect(LIMIARES.temperatura.criticoAbaixo).not.toBeNull()
    expect(LIMIARES.temperatura.atencaoAbaixo).not.toBeNull()
    expect(LIMIARES.luz.criticoAbaixo).not.toBeNull()
    expect(LIMIARES.luz.atencaoAbaixo).not.toBeNull()
  })

  it('a ocupação fica entre 0 e 100 %', () => {
    const l = LIMIARES.ocupacao
    for (const limite of [l.limiteBaixo, l.limiteAlto, l.atencaoAcima, l.criticoAcima]) {
      expect(limite).toBeGreaterThanOrEqual(0)
      expect(limite).toBeLessThanOrEqual(100)
    }
  })
})

describe('a escala do ruído simulado', () => {
  it('RUIDO_DB_MIN é menor que RUIDO_DB_MAX', () => {
    expect(RUIDO_DB_MIN).toBeLessThan(RUIDO_DB_MAX)
  })

  it('os limites do ruído ficam dentro da escala (senão o índice 0 a 100 não os mostraria)', () => {
    const l = LIMIARES.ruido
    for (const limite of [l.limiteBaixo, l.limiteAlto, l.atencaoAcima, l.criticoAcima]) {
      expect(limite).toBeGreaterThanOrEqual(RUIDO_DB_MIN)
      expect(limite).toBeLessThanOrEqual(RUIDO_DB_MAX)
    }
  })
})

describe('a faixa de leitura possível (PROVISÓRIA): fora dela é erro de leitura', () => {
  it('tem os três indicadores medidos pelo sensor, com os números da proposta', () => {
    expect(LEITURA_POSSIVEL).toEqual({
      temperatura: { minimo: -40, maximo: 80 },
      luz: { minimo: 0, maximo: 100000 },
      ruido: { minimo: 30, maximo: 80 },
    })
  })

  it('a faixa do ruído é a mesma escala do índice (RUIDO_DB_MIN a RUIDO_DB_MAX)', () => {
    expect(LEITURA_POSSIVEL.ruido).toEqual({ minimo: RUIDO_DB_MIN, maximo: RUIDO_DB_MAX })
  })

  for (const nome of ['temperatura', 'luz', 'ruido']) {
    it(`${nome}: o mínimo é menor que o máximo, e todos os limiares ficam dentro da faixa`, () => {
      const { minimo, maximo } = LEITURA_POSSIVEL[nome]
      expect(minimo).toBeLessThan(maximo)
      const l = LIMIARES[nome]
      const limites = [l.limiteBaixo, l.limiteAlto, l.criticoAbaixo, l.atencaoAbaixo, l.atencaoAcima, l.criticoAcima]
      for (const limite of limites.filter((valor) => valor !== null)) {
        expect(limite).toBeGreaterThanOrEqual(minimo)
        expect(limite).toBeLessThanOrEqual(maximo)
      }
    })
  }
})
