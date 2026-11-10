import { describe, expect, it } from 'vitest'
import { LUGARES_POR_MESA, mesasTotalmenteVazias, ocupacaoTotal, validarMesas } from '../utils/ocupacao.js'
import { LEITURAS_DEMO, MESAS_POR_PORTE, SALAS } from './salas.js'

// Os números esperados vêm do CONTEXTO, §4.1 (salas) e §7.6 (seeds fictícios).

describe('as nove salas (CONTEXTO, §4.1)', () => {
  it('são 9 salas, de S01 a S09, com o nome "Sala de Estudo NN"', () => {
    expect(SALAS.map((sala) => sala.id)).toEqual([
      'S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09',
    ])
    expect(SALAS[0].nome).toBe('Sala de Estudo 01')
    expect(SALAS[8].nome).toBe('Sala de Estudo 09')
  })

  it('somam 27 mesas e 81 lugares', () => {
    let mesas = 0
    for (const sala of SALAS) {
      mesas = mesas + sala.quantidadeMesas
    }
    expect(mesas).toBe(27)
    expect(mesas * LUGARES_POR_MESA).toBe(81)
  })

  it('são 2 pequenas, 5 médias e 2 grandes', () => {
    const contar = (porte) => SALAS.filter((sala) => sala.porte === porte).length
    expect(contar('pequena')).toBe(2)
    expect(contar('media')).toBe(5)
    expect(contar('grande')).toBe(2)
  })

  it('cada porte tem o número certo de mesas: pequena 2, média 3, grande 4', () => {
    expect(MESAS_POR_PORTE).toEqual({ pequena: 2, media: 3, grande: 4 })
    for (const sala of SALAS) {
      expect(sala.quantidadeMesas).toBe(MESAS_POR_PORTE[sala.porte])
    }
  })

  it('só a S01 vem do IoT; as outras oito são demonstrativas (RN-10)', () => {
    expect(SALAS.find((sala) => sala.id === 'S01').origem).toBe('iot')
    const demo = SALAS.filter((sala) => sala.origem === 'demo').map((sala) => sala.id)
    expect(demo).toEqual(['S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09'])
  })
})

describe('as leituras fictícias (CONTEXTO, §7.6)', () => {
  it('existem só para S02 a S09; a S01 não tem leitura fixa', () => {
    expect(Object.keys(LEITURAS_DEMO).sort()).toEqual([
      'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09',
    ])
    expect(LEITURAS_DEMO.S01).toBeUndefined()
  })

  it('cada leitura tem uma mesa por mesa da sala, e todas válidas (0 a 3)', () => {
    for (const [id, leitura] of Object.entries(LEITURAS_DEMO)) {
      const sala = SALAS.find((s) => s.id === id)
      expect(leitura.mesas.length).toBe(sala.quantidadeMesas)
      expect(validarMesas(leitura.mesas)).toEqual({ valido: true, erros: [] })
    }
  })

  it('os totais batem com a tabela do §7.6', () => {
    const totais = {}
    for (const [id, leitura] of Object.entries(LEITURAS_DEMO)) {
      totais[id] = ocupacaoTotal(leitura.mesas)
    }
    expect(totais).toEqual({ S02: 2, S03: 6, S04: 3, S05: 6, S06: 5, S07: 1, S08: 6, S09: 9 })
  })

  it('a coluna "Mesa vazia?" do §7.6 bate com as mesas', () => {
    const temMesaVazia = {}
    for (const [id, leitura] of Object.entries(LEITURAS_DEMO)) {
      temMesaVazia[id] = mesasTotalmenteVazias(leitura.mesas) > 0
    }
    expect(temMesaVazia).toEqual({
      S02: true, S03: false, S04: false, S05: true, S06: false, S07: true, S08: true, S09: true,
    })
  })

  it('a luz está sempre em lux estimado', () => {
    for (const leitura of Object.values(LEITURAS_DEMO)) {
      expect(leitura.luz.unidade).toBe('lux_estimado')
    }
  })
})
