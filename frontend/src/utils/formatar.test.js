import { describe, expect, it } from 'vitest'
import { contar, formatarHora, formatarNumero, formatarPorcento } from './formatar.js'

describe('formatarNumero', () => {
  it('usa vírgula e no máximo uma casa', () => {
    expect(formatarNumero(22.84)).toBe('22,8')
    expect(formatarNumero(22)).toBe('22')
    expect(formatarNumero(410)).toBe('410')
  })

  it('sem valor (null, NaN, texto) mostra o traço', () => {
    expect(formatarNumero(null)).toBe('—')
    expect(formatarNumero(Number.NaN)).toBe('—')
    expect(formatarNumero('22')).toBe('—')
  })
})

describe('formatarPorcento', () => {
  it('arredonda para inteiro', () => {
    expect(formatarPorcento(33.333)).toBe('33%')
    expect(formatarPorcento(91.7)).toBe('92%')
    expect(formatarPorcento(null)).toBe('—')
  })
})

describe('formatarHora', () => {
  it('mostra hora e minuto com dois dígitos (24 h)', () => {
    const ms = new Date(2026, 10, 8, 9, 5, 7).getTime()
    expect(formatarHora(ms)).toBe('09:05')
    expect(formatarHora(ms, true)).toBe('09:05:07')
  })

  it('sem data mostra o traço', () => {
    expect(formatarHora(null)).toBe('—')
  })
})

describe('contar', () => {
  it('escolhe singular ou plural', () => {
    expect(contar(1, 'mesa', 'mesas')).toBe('1 mesa')
    expect(contar(0, 'mesa', 'mesas')).toBe('0 mesas')
    expect(contar(2, 'mesa', 'mesas')).toBe('2 mesas')
  })
})
