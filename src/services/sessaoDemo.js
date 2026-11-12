// Guarda a sessão de demonstração no sessionStorage, sem autenticação no servidor.

export const CHAVE_SESSAO = 'citizentech_sessao_demo'

// Lê a matrícula salva na aba ou retorna null.
export function lerSessao(armazenamento) {
  let dados
  try {
    const texto = armazenamento.getItem(CHAVE_SESSAO)
    if (texto === null) {
      return null
    }
    dados = JSON.parse(texto)
  } catch {
    return null
  }
  const ehObjeto = typeof dados === 'object' && dados !== null && !Array.isArray(dados)
  if (!ehObjeto || typeof dados.matricula !== 'string' || dados.matricula.trim() === '') {
    return null
  }
  return dados.matricula
}

// Salva a matrícula na aba e informa se conseguiu gravar.
export function salvarSessao(armazenamento, matricula) {
  try {
    armazenamento.setItem(CHAVE_SESSAO, JSON.stringify({ matricula }))
    return true
  } catch {
    return false
  }
}

// Remove apenas os dados da sessão de demonstração.
export function apagarSessao(armazenamento) {
  try {
    armazenamento.removeItem(CHAVE_SESSAO)
    return true
  } catch {
    return false
  }
}
