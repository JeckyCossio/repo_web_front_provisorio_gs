// Salva listas e favoritos apenas no localStorage deste navegador.

import { PREFERENCIAS_VAZIAS, formatoConhecido, sanearPreferencias } from '../utils/colecoes.js'

export const CHAVE_PREFERENCIAS = 'citizentech_user_preferences_v1'

const AVISO_LEITURA = 'Não foi possível ler suas listas salvas; começamos do zero.'

// Lê e valida as preferências salvas no navegador.
export function lerPreferencias(armazenamento, idsValidos) {
  let dados
  try {
    const texto = armazenamento.getItem(CHAVE_PREFERENCIAS)
    if (texto === null || texto === undefined) {
      return { prefs: PREFERENCIAS_VAZIAS, aviso: null }
    }
    dados = JSON.parse(texto)
  } catch {
    // JSON inválido ou armazenamento bloqueado devolvem preferências vazias com um aviso.
    return { prefs: PREFERENCIAS_VAZIAS, aviso: AVISO_LEITURA }
  }
  // A validação fica fora do try para não esconder erros de programação.
  const prefs = sanearPreferencias(dados, idsValidos)
  return { prefs, aviso: formatoConhecido(dados) ? null : AVISO_LEITURA }
}

// Grava as preferências em JSON e informa se conseguiu salvar.
export function salvarPreferencias(armazenamento, prefs) {
  try {
    armazenamento.setItem(CHAVE_PREFERENCIAS, JSON.stringify(prefs))
    return true
  } catch {
    return false
  }
}
