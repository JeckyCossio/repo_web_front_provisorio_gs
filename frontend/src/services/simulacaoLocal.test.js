import { describe, expect, it } from 'vitest'
import { LEITURAS_DEMO } from '../data/salas.js'
import { montarSalas } from '../utils/normalizar.js'
import { criarSimulacaoLocal } from './simulacaoLocal.js'

const ids = Object.keys(LEITURAS_DEMO)
const soma = (valores) => valores.reduce((a, b) => a + b, 0)

function avancar(simulacao, passos) {
  let leitura = simulacao.leituraInicial
  for (let i = 0; i < passos; i++) leitura = simulacao.proximaLeitura()
  return leitura
}

describe('simulações locais graduais S02–S09', () => {
  it('começam nos valores existentes e nunca incluem a S01', () => {
    const simulacao = criarSimulacaoLocal()
    expect(simulacao.leituraInicial).toEqual(LEITURAS_DEMO)
    expect(Object.keys(simulacao.proximaLeitura())).toEqual(ids)
    expect(simulacao.leituraInicial.S01).toBeUndefined()
  })

  it('não muda temperatura nem luz nos primeiros 170 segundos', () => {
    const depois = avancar(criarSimulacaoLocal(() => 0.99), 17)
    for (const id of ids) {
      expect(depois[id].temperaturaC).toBe(LEITURAS_DEMO[id].temperaturaC)
      expect(depois[id].luz).toEqual(LEITURAS_DEMO[id].luz)
    }
  })

  it('a primeira mudança de temperatura é de 0,1 °C em uma sala, após 3 minutos', () => {
    const depois = avancar(criarSimulacaoLocal(() => 0.99), 18)
    expect(depois.S02.temperaturaC).toBe(22.1)
    expect(depois.S03.temperaturaC).toBe(18)
    expect(depois.S09.temperaturaC).toBe(28)
  })

  it('a luz permanece igual até 230 segundos, depois muda só 1 lux na primeira sala', () => {
    const simulacao = criarSimulacaoLocal(() => 0.99)
    const antes = avancar(simulacao, 23)
    for (const id of ids) expect(antes[id].luz).toEqual(LEITURAS_DEMO[id].luz)
    const depois = simulacao.proximaLeitura()
    expect(depois.S02.luz.valor).toBe(411)
    expect(depois.S03.luz.valor).toBe(920)
  })

  it('a ocupação só começa a mudar após um minuto, com uma pessoa em uma mesa', () => {
    const simulacao = criarSimulacaoLocal(() => 0.99)
    const antes = avancar(simulacao, 5)
    for (const id of ids) expect(antes[id].mesas).toEqual(LEITURAS_DEMO[id].mesas)
    const depois = simulacao.proximaLeitura()
    expect(soma(depois.S02.mesas) - soma(antes.S02.mesas)).toBe(1)
    for (const id of ids) expect(Math.abs(soma(depois[id].mesas) - soma(antes[id].mesas))).toBe(1)
  })

  it('muda o ruído em todas as salas a cada 10 segundos, mantendo temperatura e luz', () => {
    const depois = criarSimulacaoLocal(() => 0.5).proximaLeitura()
    for (const id of ids) {
      expect(Math.abs(depois[id].ruidoDb - LEITURAS_DEMO[id].ruidoDb)).toBeGreaterThanOrEqual(1)
      expect(depois[id].temperaturaC).toBe(LEITURAS_DEMO[id].temperaturaC)
      expect(depois[id].luz).toEqual(LEITURAS_DEMO[id].luz)
    }
  })

  it('inverte a direção em salas cheias ou vazias para haver um evento por minuto', () => {
    expect(soma(avancar(criarSimulacaoLocal(() => 0.99), 6).S03.mesas)).toBe(5)
    const simulacao = criarSimulacaoLocal(() => 0.01)
    expect(soma(avancar(simulacao, 6).S02.mesas)).toBe(1)
    expect(soma(avancar(simulacao, 6).S02.mesas)).toBe(0)
    expect(soma(avancar(simulacao, 6).S02.mesas)).toBe(1)
  })

  it.each([0.01, 0.5, 0.99])('mantém limites e passos pequenos por uma hora (sorteio %s)', (valor) => {
    const simulacao = criarSimulacaoLocal(() => valor)
    let anterior = simulacao.leituraInicial
    for (let passo = 1; passo <= 360; passo++) {
      const atual = simulacao.proximaLeitura()
      for (const [indice, id] of ids.entries()) {
        const a = atual[id], b = anterior[id], base = LEITURAS_DEMO[id]
        expect(a.mesas).toHaveLength(base.mesas.length)
        for (const pessoas of a.mesas) expect(Number.isInteger(pessoas) && pessoas >= 0 && pessoas <= 3).toBe(true)
        const mudancaMesas = soma(a.mesas.map((pessoas, i) => Math.abs(pessoas - b.mesas[i])))
        expect(mudancaMesas).toBeLessThanOrEqual(1)
        expect(mudancaMesas).toBe(passo % 6 === 0 ? 1 : 0)
        expect(Math.abs(a.temperaturaC - b.temperaturaC)).toBeLessThanOrEqual(0.100001)
        expect(Math.abs(a.temperaturaC - base.temperaturaC)).toBeLessThanOrEqual(0.600001)
        if (passo % (18 + indice) !== 0) expect(a.temperaturaC).toBe(b.temperaturaC)
        expect(Math.abs(a.luz.valor - b.luz.valor)).toBeLessThanOrEqual(1)
        expect(Math.abs(a.luz.valor - base.luz.valor)).toBeLessThanOrEqual(Math.max(2, Math.round(base.luz.valor * 0.01)))
        if (passo % (24 + indice) !== 0) expect(a.luz.valor).toBe(b.luz.valor)
        expect(Math.abs(a.ruidoDb - b.ruidoDb)).toBeGreaterThanOrEqual(1)
        expect(Math.abs(a.ruidoDb - b.ruidoDb)).toBeLessThanOrEqual(2)
        expect(Math.abs(a.ruidoDb - base.ruidoDb)).toBeLessThanOrEqual(8)
        expect(a.ruidoDb).toBeGreaterThanOrEqual(30)
        expect(a.ruidoDb).toBeLessThanOrEqual(80)
      }
      anterior = atual
    }
  })

  it.each([0.01, 0.5, 0.99])('preserva mesa livre nas salas grandes por 24 h, inclusive no início (sorteio %s)', (valor) => {
    const simulacao = criarSimulacaoLocal(() => valor)
    let leitura = simulacao.leituraInicial
    for (let passo = 0; passo <= 8640; passo++) {
      for (const id of ['S08', 'S09']) {
        expect(leitura[id].mesas).toContain(0)
        expect(soma(leitura[id].mesas)).toBeLessThanOrEqual(9)
      }
      leitura = simulacao.proximaLeitura()
    }
  })

  it('não altera os seeds, as leituras devolvidas nem a S01 ao montar o painel', () => {
    const seedsAntes = structuredClone(LEITURAS_DEMO)
    const simulacao = criarSimulacaoLocal(() => 0.99)
    const primeira = simulacao.proximaLeitura()
    const copia = structuredClone(primeira)
    const depois = avancar(simulacao, 30)
    expect(primeira).toEqual(copia)
    expect(LEITURAS_DEMO).toEqual(seedsAntes)
    depois.S02.mesas[0] = 99
    expect(simulacao.proximaLeitura().S02.mesas[0]).toBeLessThanOrEqual(3)
    const linha = { room_id: 'S01', occupancy_by_table: [1, 0, 0], temperature_c: 22.8,
      light_value: 410, light_unit: 'lux_estimado', noise_db_simulated: 54,
      device_status: 'ok', updated_at: '2026-11-09T15:00:00Z' }
    const s01 = montarSalas(linha)[0]
    expect(montarSalas(linha, 'iot', simulacao.proximaLeitura())[0]).toEqual(s01)
    expect(montarSalas(null, 'iot', simulacao.proximaLeitura())[0].statusDispositivo).toBe('sem_leitura')
    const segunda = criarSimulacaoLocal()
    expect(segunda.leituraInicial).toEqual(seedsAntes)
  })
})
