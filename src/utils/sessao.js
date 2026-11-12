export const CREDENCIAIS_DEMO = { matricula: 'RM000000', senha: 'salas2026' }

// Mantém valores em texto e substitui os demais por texto vazio.
function comoTexto(valor) {
  return typeof valor === 'string' ? valor : ''
}

// Confere a matrícula e a senha fixas da demonstração.
export function conferirCredenciais(matricula, senha) {
  const matriculaDigitada = comoTexto(matricula).trim().toUpperCase()
  const senhaDigitada = comoTexto(senha)

  if (matriculaDigitada === '' || senhaDigitada.trim() === '') {
    return { ok: false, erro: 'Preencha a matrícula e a senha.' }
  }
  if (matriculaDigitada !== CREDENCIAIS_DEMO.matricula || senhaDigitada !== CREDENCIAIS_DEMO.senha) {
    return { ok: false, erro: 'Matrícula ou senha incorreta. Use o acesso de demonstração.' }
  }
  return { ok: true, erro: null }
}
