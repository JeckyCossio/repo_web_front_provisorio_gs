import { describe, expect, it } from 'vitest'
import { leituraDesatualizada, lerDataIso } from './atualizacao.js'

describe('lerDataIso: só a data completa, como o Supabase devolve', () => {
  it.each([
    ['com Z (UTC)', '2026-11-08T14:32:00Z', Date.UTC(2026, 10, 8, 14, 32, 0)],
    ['com +00:00', '2026-11-08T14:32:00+00:00', Date.UTC(2026, 10, 8, 14, 32, 0)],
    ['com o fuso de Brasília (-03:00): é o mesmo instante', '2026-11-08T11:32:00-03:00', Date.UTC(2026, 10, 8, 14, 32, 0)],
    ['com milissegundos', '2026-11-08T14:32:00.123Z', Date.UTC(2026, 10, 8, 14, 32, 0, 123)],
    ['com microssegundos, como o Postgres', '2026-11-08T14:32:00.123456+00:00', Date.UTC(2026, 10, 8, 14, 32, 0, 123)],
    ['com só uma casa depois do ponto (.5 = 500 milissegundos)', '2026-11-08T14:32:00.5Z', Date.UTC(2026, 10, 8, 14, 32, 0, 500)],
  ])('aceita a data %s', (_descricao, texto, esperado) => {
    expect(lerDataIso(texto)).toBe(esperado)
  })

  it.each([
    ['"0" (o Date.parse lê como o ano 2000)', '0'],
    ['"99" (o Date.parse lê como 1999)', '99'],
    ['um nome de sala', 'Sala 1'],
    ['só o dia', '2026-11-08'],
    ['sem o fuso', '2026-11-08T14:32:00'],
    ['sem os segundos', '2026-11-08T14:32Z'],
    ['espaço no lugar do T', '2026-11-08 14:32:00Z'],
    ['mês 13', '2026-13-01T00:00:00Z'],
    ['texto vazio', ''],
    ['um número', 1794148320000],
    ['null', null],
    ['undefined', undefined],
  ])('recusa %s: devolve null', (_descricao, texto) => {
    expect(lerDataIso(texto)).toBeNull()
  })
})

// CONTEXTO, §6.5 e RN-11: depois de um tempo sem leitura nova, a tela avisa "Desatualizado".
// O limite (STALE_AFTER_SECONDS) ainda está PENDENTE: os testes usam 30 s só como exemplo.
describe('leituraDesatualizada: a leitura está velha demais?', () => {
  const LEITURA = '2026-11-08T14:32:00Z'
  const HORA_DA_LEITURA = Date.UTC(2026, 10, 8, 14, 32, 0)
  const LIMITE_EXEMPLO = 30 // segundos (exemplo, não é o número do grupo)

  it('logo depois da leitura, não está desatualizada', () => {
    expect(leituraDesatualizada(LEITURA, HORA_DA_LEITURA + 5000, LIMITE_EXEMPLO)).toBe(false)
  })

  it('exatamente no limite ainda não está (a comparação é estrita, como nos limiares)', () => {
    expect(leituraDesatualizada(LEITURA, HORA_DA_LEITURA + 30000, LIMITE_EXEMPLO)).toBe(false)
  })

  it('passou do limite: desatualizada', () => {
    expect(leituraDesatualizada(LEITURA, HORA_DA_LEITURA + 30001, LIMITE_EXEMPLO)).toBe(true)
  })

  it('uma leitura de 2001 com o ESP32 dizendo "ok" está desatualizada', () => {
    expect(leituraDesatualizada('2001-01-01T00:00:00Z', HORA_DA_LEITURA, LIMITE_EXEMPLO)).toBe(true)
  })

  it('um relógio um pouco adiantado (data alguns segundos no futuro) não é problema', () => {
    expect(leituraDesatualizada(LEITURA, HORA_DA_LEITURA - 5000, LIMITE_EXEMPLO)).toBe(false)
  })

  it('uma data mais longe no futuro que o próprio limite não é confiável: desatualizada', () => {
    expect(leituraDesatualizada('2099-01-01T00:00:00Z', HORA_DA_LEITURA, LIMITE_EXEMPLO)).toBe(true)
  })

  it.each([
    ['sem data', null],
    ['data que não é data completa', '99'],
  ])('na dúvida, desatualizada: %s', (_descricao, data) => {
    expect(leituraDesatualizada(data, HORA_DA_LEITURA, LIMITE_EXEMPLO)).toBe(true)
  })

  it.each([
    ['sem limite', undefined],
    ['limite zero', 0],
    ['limite negativo', -30],
    ['limite em texto', '30'],
    ['limite NaN', NaN],
  ])('na dúvida, desatualizada: %s', (_descricao, limite) => {
    expect(leituraDesatualizada(LEITURA, HORA_DA_LEITURA + 1000, limite)).toBe(true)
  })

  it('na dúvida, desatualizada: sem a hora atual', () => {
    expect(leituraDesatualizada(LEITURA, undefined, LIMITE_EXEMPLO)).toBe(true)
    expect(leituraDesatualizada(LEITURA, '2026-11-08T14:32:05Z', LIMITE_EXEMPLO)).toBe(true)
  })
})
