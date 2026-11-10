import { describe, expect, it } from 'vitest'
import { CREDENCIAIS_DEMO, conferirCredenciais } from './sessao.js'

// O login é FICTÍCIO e só demonstrativo (RN-13): uma matrícula e uma senha fixas,
// iguais para todo mundo, sem cadastro. Não é segurança de verdade.

const ERRO_VAZIO = 'Preencha a matrícula e a senha.'
const ERRO_ERRADO = 'Matrícula ou senha incorreta. Use o acesso de demonstração.'

describe('CREDENCIAIS_DEMO: o acesso fictício da demonstração', () => {
  it('é a matrícula RM000000 (claramente falsa) com a senha salas2026', () => {
    expect(CREDENCIAIS_DEMO).toEqual({ matricula: 'RM000000', senha: 'salas2026' })
  })

  it('tentativas de login não alteram as credenciais da demonstração', () => {
    conferirCredenciais('errado', 'errada')
    conferirCredenciais('rm000000', 'salas2026')
    expect(CREDENCIAIS_DEMO).toEqual({ matricula: 'RM000000', senha: 'salas2026' })
  })
})

describe('conferirCredenciais: confere a matrícula e a senha digitadas', () => {
  it('aceita a matrícula e a senha da demonstração', () => {
    expect(conferirCredenciais('RM000000', 'salas2026')).toEqual({ ok: true, erro: null })
  })

  it.each([
    ['com espaços em volta', '  RM000000  '],
    ['em minúsculas', 'rm000000'],
    ['misturando maiúsculas e minúsculas', 'Rm000000'],
  ])('aceita a matrícula %s', (_descricao, matricula) => {
    expect(conferirCredenciais(matricula, 'salas2026')).toEqual({ ok: true, erro: null })
  })

  it.each([
    ['os dois vazios', '', ''],
    ['sem matrícula', '', 'salas2026'],
    ['sem senha', 'RM000000', ''],
    ['matrícula só com espaços', '   ', 'salas2026'],
    ['senha só com espaços', 'RM000000', '   '],
    ['nada (undefined)', undefined, undefined],
    ['null no lugar do texto', null, null],
  ])('pede para preencher quando falta alguma coisa (%s)', (_descricao, matricula, senha) => {
    expect(conferirCredenciais(matricula, senha)).toEqual({ ok: false, erro: ERRO_VAZIO })
  })

  it.each([
    ['matrícula diferente', 'RM000001', 'salas2026'],
    ['matrícula com espaço no meio', 'RM 000000', 'salas2026'],
    ['senha com letra maiúscula', 'RM000000', 'Salas2026'],
    // A senha não tem os espaços cortados: senha é comparada exatamente como foi digitada.
    ['senha com espaço na frente', 'RM000000', ' salas2026'],
    ['senha trocada com a matrícula', 'salas2026', 'RM000000'],
  ])('recusa credenciais erradas (%s) e lembra do acesso de demonstração', (_descricao, matricula, senha) => {
    expect(conferirCredenciais(matricula, senha)).toEqual({ ok: false, erro: ERRO_ERRADO })
  })
})
