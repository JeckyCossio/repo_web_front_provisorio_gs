import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buscarLeituraS01,
  buscarLeituraSupabase,
  INTERVALO_ATUALIZACAO_MS,
  LIMITE_DESATUALIZADO_SEGUNDOS,
  TEMPO_LIMITE_PEDIDO_MS,
} from './telemetria.js'

// A linha da tabela room_telemetry com o exemplo FICTÍCIO do CONTEXTO, §6.3.
const LINHA_S01 = {
  room_id: 'S01',
  occupancy_by_table: [1, 2, 0],
  temperature_c: 22.8,
  light_value: 410,
  light_unit: 'lux_estimado',
  noise_db_simulated: 54,
  device_status: 'ok',
  updated_at: '2026-11-08T14:32:00Z',
}

const CONFIG_SUPABASE = { supabaseUrl: 'https://exemplo.supabase.co', supabaseChave: 'sb_publishable_abc' }
const URL_ESPERADA = 'https://exemplo.supabase.co/rest/v1/room_telemetry?room_id=eq.S01&select=*'

// Troca o fetch do navegador por um falso, que devolve sempre a mesma resposta.
// O Response é o mesmo objeto que o fetch de verdade devolve (o Node também tem).
function fetchFalsoQueResponde(corpo, status = 200) {
  const fetchFalso = vi.fn(async () => new Response(corpo, { status }))
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

afterEach(() => {
  vi.unstubAllGlobals() // devolve o fetch de verdade depois de cada teste
})

describe('buscarLeituraSupabase: o GET na API do Supabase', () => {
  it('pede a linha da S01 na URL certa, com a chave publicável nos dois cabeçalhos', async () => {
    const fetchFalso = fetchFalsoQueResponde(JSON.stringify([LINHA_S01]))
    await buscarLeituraSupabase(CONFIG_SUPABASE)

    expect(fetchFalso).toHaveBeenCalledTimes(1)
    const [url, opcoes] = fetchFalso.mock.calls[0]
    expect(url).toBe(URL_ESPERADA)
    expect(opcoes.method).toBe('GET')
    expect(opcoes.headers).toEqual({ apikey: 'sb_publishable_abc', Authorization: 'Bearer sb_publishable_abc' })
  })

  it('não pede uma cópia guardada pelo navegador (a leitura tem de ser a mais nova)', async () => {
    const fetchFalso = fetchFalsoQueResponde('[]')
    await buscarLeituraSupabase(CONFIG_SUPABASE)
    expect(fetchFalso.mock.calls[0][1].cache).toBe('no-store')
  })

  it('não deixa barra dupla quando a URL termina com "/"', async () => {
    const fetchFalso = fetchFalsoQueResponde('[]')
    await buscarLeituraSupabase({ ...CONFIG_SUPABASE, supabaseUrl: 'https://exemplo.supabase.co/' })
    expect(fetchFalso.mock.calls[0][0]).toBe(URL_ESPERADA)
  })

  it.each([
    ['com "/rest/v1/" (como a página da API do Supabase mostra)', 'https://exemplo.supabase.co/rest/v1/'],
    ['com "/rest/v1" sem a barra', 'https://exemplo.supabase.co/rest/v1'],
    ['com espaços em volta e barras repetidas', '  https://exemplo.supabase.co/rest/v1//  '],
  ])('a URL %s não repete o caminho', async (_descricao, supabaseUrl) => {
    const fetchFalso = fetchFalsoQueResponde('[]')
    await buscarLeituraSupabase({ ...CONFIG_SUPABASE, supabaseUrl })
    expect(fetchFalso.mock.calls[0][0]).toBe(URL_ESPERADA)
  })

  it.each([
    ['a nova (sb_secret_)', 'sb_secret_abc'],
    // Um JWT antigo com "role": "service_role" dentro (o mesmo teste do configuracao.test.js).
    ['a antiga (JWT com service_role)', `x.${btoa(JSON.stringify({ role: 'service_role' }))}.y`],
  ])('chave SECRETA (%s): lança erro e nem chega a pedir (a chave não sai do navegador)', async (_descricao, chave) => {
    const fetchFalso = fetchFalsoQueResponde('[]')
    await expect(buscarLeituraSupabase({ ...CONFIG_SUPABASE, supabaseChave: chave })).rejects.toThrow(
      'A chave do Supabase é SECRETA e não pode ficar no navegador. Use a chave publicável.',
    )
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('repassa o signal ao fetch, para o hook poder cancelar o pedido', async () => {
    const fetchFalso = fetchFalsoQueResponde('[]')
    const controle = new AbortController()
    await buscarLeituraSupabase({ ...CONFIG_SUPABASE, signal: controle.signal })
    expect(fetchFalso.mock.calls[0][1].signal).toBe(controle.signal)
  })

  it('devolve a linha da S01 (o objeto, não a lista)', async () => {
    fetchFalsoQueResponde(JSON.stringify([LINHA_S01]))
    expect(await buscarLeituraSupabase(CONFIG_SUPABASE)).toEqual(LINHA_S01)
  })

  it('devolve null quando a tabela não tem a S01 (lista vazia)', async () => {
    fetchFalsoQueResponde('[]')
    expect(await buscarLeituraSupabase(CONFIG_SUPABASE)).toBeNull()
  })

  it.each([
    [401, 'A API respondeu com erro (HTTP 401).'],
    [404, 'A API respondeu com erro (HTTP 404).'],
    [500, 'A API respondeu com erro (HTTP 500).'],
  ])('resposta com erro HTTP %i: lança um erro com o código', async (status, mensagem) => {
    fetchFalsoQueResponde(JSON.stringify({ message: 'erro' }), status)
    await expect(buscarLeituraSupabase(CONFIG_SUPABASE)).rejects.toThrow(mensagem)
  })

  it.each([
    ['um objeto no lugar da lista', JSON.stringify(LINHA_S01)],
    ['um texto que não é JSON', '<html>página de erro</html>'],
    ['null', 'null'],
  ])('resposta com %s: lança "formato inesperado"', async (_descricao, corpo) => {
    fetchFalsoQueResponde(corpo)
    await expect(buscarLeituraSupabase(CONFIG_SUPABASE)).rejects.toThrow('A API respondeu num formato inesperado.')
  })

  it('sem internet (o fetch falha): lança um erro em português, não o "Failed to fetch"', async () => {
    const erroDoFetch = new TypeError('Failed to fetch')
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw erroDoFetch
    }))
    const promessa = buscarLeituraSupabase(CONFIG_SUPABASE)
    await expect(promessa).rejects.toThrow('Não foi possível falar com a API. Confira a internet e a URL do Supabase.')
    await expect(promessa).rejects.toMatchObject({ cause: erroDoFetch }) // o original fica guardado para o console
  })

  it('pedido cancelado pelo signal: repassa o AbortError como veio, para o hook reconhecer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new DOMException('This operation was aborted', 'AbortError')
    }))
    await expect(buscarLeituraSupabase(CONFIG_SUPABASE)).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('buscarLeituraS01: somente dados do protótipo via Supabase', () => {
  it('sem conexão configurada, não usa a rede nem inventa uma leitura', async () => {
    const fetchFalso = vi.fn()
    vi.stubGlobal('fetch', fetchFalso)
    expect(await buscarLeituraS01({ modoTelemetria: 'pendente' })).toBeNull()
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('um config antigo de mock também não gera dados locais', async () => {
    const fetchFalso = vi.fn()
    vi.stubGlobal('fetch', fetchFalso)
    expect(await buscarLeituraS01({ modoTelemetria: 'mock' })).toBeNull()
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('com o Wokwi parado, consultas repetidas preservam os valores e a hora da última linha', async () => {
    const fetchFalso = fetchFalsoQueResponde(JSON.stringify([LINHA_S01]))
    const config = { modoTelemetria: 'supabase', ...CONFIG_SUPABASE }
    const primeira = await buscarLeituraS01(config)
    const segunda = await buscarLeituraS01(config)
    expect(fetchFalso).toHaveBeenCalledTimes(2)
    expect(primeira).toEqual(LINHA_S01)
    expect(segunda).toEqual(primeira)
    expect(segunda.updated_at).toBe('2026-11-08T14:32:00Z')
  })

  it('quando chegam dados novos do protótipo, devolve a nova linha', async () => {
    const nova = { ...LINHA_S01, temperature_c: 24, updated_at: '2026-11-08T14:33:00Z' }
    const fetchFalso = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([LINHA_S01])))
      .mockResolvedValueOnce(new Response(JSON.stringify([nova])))
    vi.stubGlobal('fetch', fetchFalso)
    const config = { modoTelemetria: 'supabase', ...CONFIG_SUPABASE }
    expect(await buscarLeituraS01(config)).toEqual(LINHA_S01)
    expect(await buscarLeituraS01(config)).toEqual(nova)
  })

  it('repassa o cancelamento para a API', async () => {
    const fetchFalso = fetchFalsoQueResponde(JSON.stringify([LINHA_S01]))
    const controle = new AbortController()
    await buscarLeituraS01({ modoTelemetria: 'supabase', ...CONFIG_SUPABASE }, { signal: controle.signal })
    expect(fetchFalso.mock.calls[0][1].signal).toBe(controle.signal)
  })
})

describe('os tempos do polling (PROVISÓRIOS: dependem do intervalo de envio do ESP32)', () => {
  it('o limite de "Desatualizado" é maior que o intervalo entre dois pedidos', () => {
    // Se fosse menor, a leitura ficaria "Desatualizado" antes mesmo do próximo pedido.
    expect(LIMITE_DESATUALIZADO_SEGUNDOS * 1000).toBeGreaterThan(INTERVALO_ATUALIZACAO_MS)
  })

  it('o intervalo é um número de milissegundos maior que zero', () => {
    expect(Number.isInteger(INTERVALO_ATUALIZACAO_MS) && INTERVALO_ATUALIZACAO_MS > 0).toBe(true)
  })

  it('o tempo limite de um pedido é maior que o intervalo (a rede lenta que funciona não perde a resposta)', () => {
    // Se fosse igual ou menor, uma API que sempre leva um pouco mais que o intervalo nunca
    // teria uma resposta aceita.
    expect(Number.isInteger(TEMPO_LIMITE_PEDIDO_MS)).toBe(true)
    expect(TEMPO_LIMITE_PEDIDO_MS).toBeGreaterThan(INTERVALO_ATUALIZACAO_MS)
  })
})
