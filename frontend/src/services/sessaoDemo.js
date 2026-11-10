// Guarda a sessão do login FICTÍCIO (RN-13) no armazenamento da aba do navegador.
// No app é o window.sessionStorage: a sessão some ao fechar a aba (DECISIONS.md), e cada aba
// entra de novo. Quem confere a matrícula e a senha é o utils/sessao.js; aqui só se guarda.
// O armazenamento chega como parâmetro para os testes poderem usar um falso.
//
// ATENÇÃO: isto não é segurança. Qualquer pessoa pode escrever nesta chave pelo console do navegador.
// Nenhuma destas funções lança erro: com o armazenamento bloqueado, a pessoa entra do mesmo
// jeito, só não continua dentro ao recarregar a página.

/** A chave da sessão da demonstração no sessionStorage. */
export const CHAVE_SESSAO = 'citizentech_sessao_demo'

/**
 * Lê a matrícula de quem entrou nesta aba.
 * @param {{ getItem: (chave: string) => string|null }|null} armazenamento o window.sessionStorage (ou um falso, nos testes)
 * @returns {string|null} a matrícula, ou null se ninguém entrou (ou se o que está salvo não serve)
 */
export function lerSessao(armazenamento) {
  let dados
  try {
    const texto = armazenamento.getItem(CHAVE_SESSAO)
    if (texto === null) {
      return null // ninguém entrou nesta aba
    }
    dados = JSON.parse(texto)
  } catch {
    // O getItem lança erro com o armazenamento bloqueado (ou null); o JSON.parse, com o texto quebrado.
    return null
  }
  // Só serve um objeto com a matrícula em texto (null, lista ou texto solto não servem).
  const ehObjeto = typeof dados === 'object' && dados !== null && !Array.isArray(dados)
  if (!ehObjeto || typeof dados.matricula !== 'string' || dados.matricula.trim() === '') {
    return null
  }
  return dados.matricula
}

/**
 * Grava a matrícula de quem entrou, em JSON, na chave CHAVE_SESSAO.
 * @param {{ setItem: (chave: string, valor: string) => void }|null} armazenamento o window.sessionStorage (ou um falso, nos testes)
 * @param {string} matricula a matrícula já conferida pelo conferirCredenciais
 * @returns {boolean} true se gravou; false se o armazenamento recusou (bloqueado ou cheio), sem lançar erro
 */
export function salvarSessao(armazenamento, matricula) {
  try {
    armazenamento.setItem(CHAVE_SESSAO, JSON.stringify({ matricula }))
    return true
  } catch {
    return false
  }
}

/**
 * Apaga a sessão (o "Sair"). As outras chaves, como a das listas, ficam como estão.
 * @param {{ removeItem: (chave: string) => void }|null} armazenamento o window.sessionStorage (ou um falso, nos testes)
 * @returns {boolean} true se apagou; false se o armazenamento recusou, sem lançar erro
 */
export function apagarSessao(armazenamento) {
  try {
    armazenamento.removeItem(CHAVE_SESSAO)
    return true
  } catch {
    return false
  }
}
