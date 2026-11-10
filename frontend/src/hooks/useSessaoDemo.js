import { useState } from 'react'
import { conferirCredenciais } from '../utils/sessao.js'
import { apagarSessao, lerSessao, salvarSessao } from '../services/sessaoDemo.js'

// O login FICTÍCIO da demonstração (RN-13): quem confere a matrícula e a senha é o
// utils/sessao.js, e quem grava no sessionStorage é o services/sessaoDemo.js.
// O sessionStorage (e não o localStorage) faz a sessão sumir ao fechar a aba.

// O navegador pode bloquear o acesso ao storage.
function pegarSessionStorage() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/**
 * A sessão do login fictício: quem entrou, entrar e sair. Some ao fechar a aba.
 * @returns {{ logado: boolean, matricula: string|null,
 *   entrar: (matricula: string, senha: string) => { ok: boolean, erro: string|null }, sair: () => void }}
 */
export function useSessaoDemo() {
  const [matricula, setMatricula] = useState(() => lerSessao(pegarSessionStorage()))

  const entrar = (matriculaDigitada, senha) => {
    const resposta = conferirCredenciais(matriculaDigitada, senha)
    if (!resposta.ok) {
      return resposta
    }
    // Guarda a matrícula do jeito que o conferirCredenciais aceitou: sem espaços e em maiúsculas.
    const matriculaConferida = matriculaDigitada.trim().toUpperCase()
    // Se o navegador não deixar gravar, a pessoa entra do mesmo jeito; só não continua
    // dentro ao recarregar a página. Por isso o resultado do salvarSessao não muda nada aqui.
    salvarSessao(pegarSessionStorage(), matriculaConferida)
    setMatricula(matriculaConferida)
    return resposta
  }

  // Apaga a sessão e volta para a tela de entrada. As listas e os favoritos ficam (são do navegador).
  const sair = () => {
    apagarSessao(pegarSessionStorage())
    setMatricula(null)
  }

  return { logado: matricula !== null, matricula, entrar, sair }
}
