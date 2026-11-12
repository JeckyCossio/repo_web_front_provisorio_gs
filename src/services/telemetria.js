import { ehChaveSecreta } from './configuracao.js'

export const INTERVALO_ATUALIZACAO_MS = 5000

export const LIMITE_DESATUALIZADO_SEGUNDOS = 30

// O tempo limite é maior que o intervalo para permitir respostas em redes lentas.
export const TEMPO_LIMITE_PEDIDO_MS = 15000

const ERRO_FORMATO = 'A API respondeu num formato inesperado.'
const ERRO_CONEXAO = 'Não foi possível falar com a API. Confira a internet e a URL do Supabase.'
const ERRO_CHAVE_SECRETA = 'A chave do Supabase é SECRETA e não pode ficar no navegador. Use a chave publicável.'

// Retira barras finais e o trecho rest/v1 para montar a URL da consulta.
function urlDoProjeto(supabaseUrl) {
  let url = supabaseUrl.trim()
  while (url.slice(-1) === '/') url = url.slice(0, -1)
  if (url.slice(-8).toLowerCase() === '/rest/v1') url = url.slice(0, -8)
  while (url.slice(-1) === '/') url = url.slice(0, -1)
  return url
}

// Identifica o cancelamento feito pelo AbortController.
function foiCancelado(erro) {
  return Boolean(erro) && erro.name === 'AbortError'
}

// Busca o registro mais recente da S01 no histórico.
export async function buscarLeituraSupabase({ supabaseUrl, supabaseChave, signal }) {
  if (ehChaveSecreta(supabaseChave)) {
    throw new Error(ERRO_CHAVE_SECRETA)
  }
  const url = `${urlDoProjeto(supabaseUrl)}/rest/v1/room_telemetry_history?room_id=eq.S01&select=*&order=measured_at.desc,measurement_id.desc&limit=1`

  let resposta
  const inicioDoPedido = Date.now()
  try {
    resposta = await fetch(url, {
      method: 'GET',
      // Chaves publicáveis usam apikey; o JWT legado também usa Bearer.
      headers: supabaseChave.startsWith('sb_publishable_')
        ? { apikey: supabaseChave }
        : { apikey: supabaseChave, Authorization: `Bearer ${supabaseChave}` },
      cache: 'no-store',
      signal,
    })
  } catch (erro) {
    if (foiCancelado(erro)) throw erro
    throw new Error(ERRO_CONEXAO, { cause: erro })
  }

  const fimDoPedido = Date.now()
  // Estima a diferença entre os relógios usando o ponto médio do pedido.
  const horaDaApi = Date.parse(resposta.headers.get('Date'))
  const diferencaRelogioMs = horaDaApi - (inicioDoPedido + fimDoPedido) / 2

  if (!resposta.ok) {
    throw new Error(`A API respondeu com erro (HTTP ${resposta.status}).`)
  }

  let dados
  try {
    dados = await resposta.json()
  } catch (erro) {
    if (foiCancelado(erro)) throw erro
    throw new Error(ERRO_FORMATO, { cause: erro })
  }

  if (!Array.isArray(dados)) {
    throw new Error(ERRO_FORMATO)
  }
  if (dados.length === 0) return null
  const linha = { ...dados[0], updated_at: dados[0].measured_at }
  if (Number.isFinite(diferencaRelogioMs)) linha.diferencaRelogioMs = diferencaRelogioMs
  return linha
}

// Sem configuração do Supabase, a S01 permanece sem leitura.
export async function buscarLeituraS01(config, { signal } = {}) {
  if (config.modoTelemetria !== 'supabase') {
    return null
  }
  return buscarLeituraSupabase({ supabaseUrl: config.supabaseUrl, supabaseChave: config.supabaseChave, signal })
}
