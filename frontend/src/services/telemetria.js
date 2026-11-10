// Consulta somente a S01. A validação dos campos fica em utils/normalizar.js.

import { ehChaveSecreta } from './configuracao.js'

/** De quanto em quanto tempo a web pede a leitura da S01, em milissegundos. */
export const INTERVALO_ATUALIZACAO_MS = 5000 // PROVISÓRIO: depende do intervalo de envio do ESP32 (ainda não definido pelo Edge)

/** Depois de quantos segundos sem leitura nova a S01 mostra "Desatualizado" (o STALE_AFTER_SECONDS do CONTEXTO, §6.5). */
export const LIMITE_DESATUALIZADO_SEGUNDOS = 30 // PROVISÓRIO: tem de ser maior que o intervalo de envio do ESP32, ainda não definido

/**
 * Quanto tempo o hook espera a resposta de um pedido antes de desistir, em milissegundos.
 * É maior que o INTERVALO_ATUALIZACAO_MS de propósito: numa rede lenta que funciona (ex.: a
 * resposta leva 6 s), o pedido não pode ser cancelado só porque chegou a hora do próximo.
 */
export const TEMPO_LIMITE_PEDIDO_MS = 15000 // PROVISÓRIO: três intervalos de hoje; sem medida da rede da FIAP nem do celular na apresentação

// Mensagens de erro em português, para a tela poder mostrar como vierem.
const ERRO_FORMATO = 'A API respondeu num formato inesperado.'
const ERRO_CONEXAO = 'Não foi possível falar com a API. Confira a internet e a URL do Supabase.'
const ERRO_CHAVE_SECRETA = 'A chave do Supabase é SECRETA e não pode ficar no navegador. Use a chave publicável.'

// Aceitar a URL com ou sem /rest/v1 evita duplicar esse trecho no endpoint.
function urlDoProjeto(supabaseUrl) {
  let url = supabaseUrl.trim()
  while (url.slice(-1) === '/') url = url.slice(0, -1)
  if (url.slice(-8).toLowerCase() === '/rest/v1') url = url.slice(0, -8)
  while (url.slice(-1) === '/') url = url.slice(0, -1)
  return url
}

// O cancelamento pelo signal (o hook cancela quando a tela sai ou o pedido passa do
// tempo limite) não é erro de verdade: o AbortError passa como veio, para o hook reconhecer.
function foiCancelado(erro) {
  return Boolean(erro) && erro.name === 'AbortError'
}

/**
 * Busca a linha da S01 na API REST do Supabase, com um GET (CONTEXTO, §6.3; TECHNICAL_ARCHITECTURE, §5).
 * @param {{ supabaseUrl: string, supabaseChave: string, signal?: AbortSignal }} opcoes a URL do projeto
 *   (com ou sem o "/rest/v1" do fim), a chave PUBLICÁVEL (nunca a secreta) e, se quiser, o signal
 *   de um AbortController para cancelar
 * @returns {Promise<object|null>} a linha da S01 (o objeto, não a lista), ou null se a tabela não tiver a S01
 * @throws {Error} se a chave for SECRETA (aí nem pede), se a API responder com erro HTTP, num formato que
 *   não é lista, ou se não der para conectar (o cancelamento pelo signal sai como o AbortError do próprio fetch)
 */
export async function buscarLeituraSupabase({ supabaseUrl, supabaseChave, signal }) {
  // Segunda proteção (a primeira é o lerConfiguracao): a chave secreta dá acesso de administrador
  // e nunca pode sair do navegador num cabeçalho, nem num config montado à mão (CONTEXTO, §6.4).
  if (ehChaveSecreta(supabaseChave)) {
    throw new Error(ERRO_CHAVE_SECRETA)
  }
  const url = `${urlDoProjeto(supabaseUrl)}/rest/v1/room_telemetry?room_id=eq.S01&select=*`

  let resposta
  try {
    resposta = await fetch(url, {
      method: 'GET',
      // O Supabase pede a chave nos dois cabeçalhos. É a chave publicável: pode ir para o navegador.
      headers: { apikey: supabaseChave, Authorization: `Bearer ${supabaseChave}` },
      // A cada pedido queremos a leitura mais nova, nunca uma cópia guardada pelo navegador.
      cache: 'no-store',
      signal,
    })
  } catch (erro) {
    if (foiCancelado(erro)) throw erro
    // O fetch só falha assim sem rede, com a URL errada ou bloqueada. A mensagem é para a tela;
    // o erro original fica no "cause", para quem for investigar no console.
    throw new Error(ERRO_CONEXAO, { cause: erro })
  }

  if (!resposta.ok) {
    throw new Error(`A API respondeu com erro (HTTP ${resposta.status}).`)
  }

  let dados
  try {
    dados = await resposta.json()
  } catch (erro) {
    if (foiCancelado(erro)) throw erro
    throw new Error(ERRO_FORMATO, { cause: erro }) // o corpo não era JSON (ex.: uma página de erro em HTML)
  }

  // O filtro room_id=eq.S01 faz a API devolver uma LISTA com 0 ou 1 linha.
  if (!Array.isArray(dados)) {
    throw new Error(ERRO_FORMATO)
  }
  return dados.length > 0 ? dados[0] : null
}

/**
 * A S01 só recebe leituras do protótipo no Wokwi pela API do Supabase.
 * Sem configuração, não faz pedidos nem gera leituras locais.
 */
export async function buscarLeituraS01(config, { signal } = {}) {
  if (config.modoTelemetria !== 'supabase') {
    return null
  }
  return buscarLeituraSupabase({ supabaseUrl: config.supabaseUrl, supabaseChave: config.supabaseChave, signal })
}
