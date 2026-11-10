// Lê e grava as listas e os favoritos no armazenamento do navegador (CONTEXTO, §7.7).
// Só no navegador de quem usa: nada disso vai para o Supabase. Outro navegador (ou outro perfil)
// tem as suas próprias listas, e limpar os dados do navegador apaga tudo.
// O armazenamento chega como parâmetro (no app, o window.localStorage) para os testes poderem
// usar um falso. As regras (o que é uma lista válida) ficam no utils/colecoes.js.

import { PREFERENCIAS_VAZIAS, formatoConhecido, sanearPreferencias } from '../utils/colecoes.js'

/** A chave das preferências no localStorage. O "_v1" é a versão do formato (schema_version 1). */
export const CHAVE_PREFERENCIAS = 'citizentech_user_preferences_v1'

const AVISO_LEITURA = 'Não foi possível ler suas listas salvas; começamos do zero.'

/**
 * Lê as listas e os favoritos salvos e passa pelo sanearPreferencias (só ficam salas que existem,
 * sem repetir). Nunca quebra a tela: sem nada salvo, devolve o vazio; com o texto salvo quebrado,
 * num formato que esta versão não conhece (ex.: outra schema_version) ou com o armazenamento
 * bloqueado, devolve o vazio com um aviso. Só lê: o que estava salvo não muda.
 * @param {{ getItem: (chave: string) => string|null }} armazenamento o window.localStorage (ou um falso, nos testes)
 * @param {string[]} idsValidos os ids das salas que existem (ex.: SALAS.map((sala) => sala.id))
 * @returns {{ prefs: object, aviso: string|null }} as preferências e, se não deu para ler, o aviso para a tela
 * @throws {Error} se idsValidos não for uma lista (o erro do sanearPreferencias: é erro de quem programou)
 */
export function lerPreferencias(armazenamento, idsValidos) {
  let dados
  try {
    const texto = armazenamento.getItem(CHAVE_PREFERENCIAS)
    // O localStorage devolve null para a chave que não existe. O undefined é o mesmo caso num
    // armazenamento falso feito sobre um Map (o map.get devolve undefined).
    if (texto === null || texto === undefined) {
      return { prefs: PREFERENCIAS_VAZIAS, aviso: null } // nunca salvou nada: não é erro
    }
    dados = JSON.parse(texto)
  } catch {
    // O getItem lança erro quando o navegador bloqueia o armazenamento; o JSON.parse, quando o
    // texto salvo está quebrado. Nos dois casos a tela começa do zero e avisa.
    return { prefs: PREFERENCIAS_VAZIAS, aviso: AVISO_LEITURA }
  }
  // Fora do try de propósito: um erro aqui é de programação e não pode virar só um aviso.
  const prefs = sanearPreferencias(dados, idsValidos)
  // Um JSON certo, mas num formato desconhecido (outra versão, uma lista, null...), também vira o
  // vazio. Sem o aviso, a pessoa perderia as listas sem saber: na primeira mudança, o hook grava
  // o vazio por cima. Com o aviso, é o mesmo caso do JSON quebrado.
  return { prefs, aviso: formatoConhecido(dados) ? null : AVISO_LEITURA }
}

/**
 * Grava as listas e os favoritos, em JSON, na chave CHAVE_PREFERENCIAS (troca o que estava lá).
 * @param {{ setItem: (chave: string, valor: string) => void }} armazenamento o window.localStorage (ou um falso, nos testes)
 * @param {object} prefs as preferências no formato do utils/colecoes.js
 * @returns {boolean} true se gravou; false se o armazenamento recusou (cheio ou bloqueado), sem lançar erro
 */
export function salvarPreferencias(armazenamento, prefs) {
  try {
    armazenamento.setItem(CHAVE_PREFERENCIAS, JSON.stringify(prefs))
    return true
  } catch {
    return false
  }
}
