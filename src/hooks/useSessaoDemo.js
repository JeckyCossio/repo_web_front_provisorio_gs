import { useState } from 'react'
import { conferirCredenciais } from '../utils/sessao.js'
import { apagarSessao, lerSessao, salvarSessao } from '../services/sessaoDemo.js'

// Obtém o armazenamento da aba ou null se estiver bloqueado.
function pegarSessionStorage() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

// Usa sessao.js para validar o acesso e sessaoDemo.js para guardar a sessão.
export function useSessaoDemo() {
  const [matricula, setMatricula] = useState(() => lerSessao(pegarSessionStorage()))

  // Valida as credenciais e atualiza a matrícula da sessão.
  const entrar = (matriculaDigitada, senha) => {
    const resposta = conferirCredenciais(matriculaDigitada, senha)
    if (!resposta.ok) {
      return resposta
    }
    const matriculaConferida = matriculaDigitada.trim().toUpperCase()
    // Se o armazenamento falhar, permite entrar sem persistir a sessão.
    salvarSessao(pegarSessionStorage(), matriculaConferida)
    setMatricula(matriculaConferida)
    return resposta
  }

  // Apaga a sessão e retorna ao login.
  const sair = () => {
    apagarSessao(pegarSessionStorage())
    setMatricula(null)
  }

  return { logado: matricula !== null, matricula, entrar, sair }
}
