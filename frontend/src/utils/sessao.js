// O login FICTÍCIO da demonstração (CONTEXTO, §3.1 item 13, §6.4 e RN-13).
// JavaScript puro: sem React, sem rede, sem sessionStorage. Quem guarda a sessão é o hook.
//
// ATENÇÃO: isto NÃO é segurança. A matrícula e a senha estão escritas aqui, no código
// que vai para o navegador, e qualquer pessoa consegue ler. É só uma tela de entrada para
// a demonstração, igual para todo mundo, sem cadastro e sem ligação com a FIAP.

/**
 * A matrícula e a senha da demonstração, as mesmas para todos.
 * A matrícula é claramente falsa (RM000000): nunca use o RM de um aluno de verdade.
 */
// PROVISÓRIO: a matrícula e a senha da demonstração ainda não foram combinadas com o grupo.
export const CREDENCIAIS_DEMO = { matricula: 'RM000000', senha: 'salas2026' }

// Transforma em texto. Qualquer outra coisa (null, undefined, número) vira texto vazio.
function comoTexto(valor) {
  return typeof valor === 'string' ? valor : ''
}

/**
 * Confere a matrícula e a senha digitadas na tela de entrada.
 * A matrícula tem os espaços cortados e aceita minúsculas ('rm000000').
 * A senha é comparada exatamente como foi digitada.
 * @param {string} matricula o que foi digitado no campo da matrícula
 * @param {string} senha o que foi digitado no campo da senha
 * @returns {{ ok: boolean, erro: string|null }} ok true e erro null quando confere;
 *   senão, ok false e a mensagem para mostrar na tela
 */
export function conferirCredenciais(matricula, senha) {
  const matriculaDigitada = comoTexto(matricula).trim().toUpperCase()
  const senhaDigitada = comoTexto(senha)

  // Senha só com espaços também conta como vazia: a pessoa não digitou nada de verdade.
  if (matriculaDigitada === '' || senhaDigitada.trim() === '') {
    return { ok: false, erro: 'Preencha a matrícula e a senha.' }
  }
  if (matriculaDigitada !== CREDENCIAIS_DEMO.matricula || senhaDigitada !== CREDENCIAIS_DEMO.senha) {
    return { ok: false, erro: 'Matrícula ou senha incorreta. Use o acesso de demonstração.' }
  }
  return { ok: true, erro: null }
}
