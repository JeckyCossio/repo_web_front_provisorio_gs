import { useEffect, useState } from 'react'
import { leituraDesatualizada } from '../utils/atualizacao.js'
import { classificarSala } from '../utils/classificacao.js'
import { montarSalas } from '../utils/normalizar.js'
import { lerConfiguracao } from '../services/configuracao.js'
import { criarSimulacaoLocal, INTERVALO_SIMULACAO_MS } from '../services/simulacaoLocal.js'
import {
  INTERVALO_ATUALIZACAO_MS,
  LIMITE_DESATUALIZADO_SEGUNDOS,
  TEMPO_LIMITE_PEDIDO_MS,
  buscarLeituraS01,
} from '../services/telemetria.js'

// Consultas à S01 preservam a última leitura e seu updated_at em caso de falha (RN-11).
// S02 a S09 são independentes da API. O relógio atualiza o aviso de leitura antiga.
const INTERVALO_RELOGIO_MS = 1000

// O pedido que passa do TEMPO_LIMITE_PEDIDO_MS é cancelado (ver o services/telemetria.js).
const ERRO_DEMOROU = `A API demorou mais de ${TEMPO_LIMITE_PEDIDO_MS / 1000} segundos para responder.`
// A API respondeu, mas a lista veio vazia. No Supabase isso acontece quando a linha da S01 não
// existe ou quando o RLS não deixa a chave publicável ler a tabela (ele responde 200 com [], e não um erro).
const ERRO_SEM_LINHA = 'A API não devolveu a leitura da S01 (a linha não existe ou não está liberada para leitura).'
// Os erros do services/telemetria.js já vêm em português; este é só para um erro sem mensagem.
const ERRO_SEM_MENSAGEM = 'Não foi possível buscar a leitura da S01.'

// Para cada sala, diz se a leitura está velha no momento dado (o selo "Desatualizado").
// As salas demo são simulações locais, sem leitura remota: não recebem selo de desatualização.
function marcarDesatualizadas(salas, momento) {
  return salas.map((sala) =>
    sala.origem === 'demo' ? false : leituraDesatualizada(sala.atualizadoEm, momento, LIMITE_DESATUALIZADO_SEGUNDOS),
  )
}

// Diz se, de um momento para o outro, o selo de alguma sala mudou.
function mudouAlgumSelo(salas, antes, depois) {
  const selosAntes = marcarDesatualizadas(salas, antes)
  const selosDepois = marcarDesatualizadas(salas, depois)
  return selosAntes.filter((selo, indice) => selo !== selosDepois[indice]).length > 0
}

/**
 * Combina a última leitura da S01 com a simulação local de S02 a S09.
 * @returns {{ itens: { sala: object, classificacao: object, desatualizada: boolean }[], carregando: boolean,
 *   erro: string|null, modo: 'pendente'|'supabase', aviso: string|null, ultimaBusca: number|null,
 *   atualizarAgora: () => void }} os itens na ordem S01 a S09; carregando só até a primeira resposta
 *   (ou até o primeiro pedido passar do tempo limite); erro é a última falha (os dados de antes
 *   continuam); ultimaBusca é a hora (ms) da última resposta (um pedido cancelado não conta)
 */
export function useSalas() {
  // A configuração e o simulador permanecem estáveis durante a montagem do painel.
  const [config] = useState(() => lerConfiguracao(import.meta.env))
  const [simulacaoLocal] = useState(() => criarSimulacaoLocal())
  const [leiturasDemo, setLeiturasDemo] = useState(() => simulacaoLocal.leituraInicial)
  const [linha, setLinha] = useState(null) // a última linha da S01 que chegou (null: nenhuma ainda)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [ultimaBusca, setUltimaBusca] = useState(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [pedidosManuais, setPedidosManuais] = useState(0) // conta os cliques em "atualizar agora"

  const modo = config.modoTelemetria
  const origemDaS01 = 'iot'

  // O simulador avança só no timer, nunca no render nem no updater do React.
  // Assim, o polling da S01 e o StrictMode não aceleram as mudanças locais.
  useEffect(() => {
    const timer = setInterval(() => {
      setLeiturasDemo(simulacaoLocal.proximaLeitura())
    }, INTERVALO_SIMULACAO_MS)
    return () => clearInterval(timer)
  }, [simulacaoLocal])

  // Ao desmontar ou reiniciar a consulta, cancelar o pedido e os temporizadores.
  useEffect(() => {
    let ligado = true // vira false no return: depois disso, nenhuma resposta muda a tela
    let pedidoEmAndamento = null // o AbortController do pedido que ainda não voltou

    async function buscar() {
      // O pedido anterior ainda não voltou: pula esta vez, sem cancelar o anterior. Quem cancela
      // um pedido que demora é o tempo limite dele, maior que o intervalo: assim, numa rede lenta
      // que funciona (a resposta leva 6 s, por exemplo), as respostas continuam chegando.
      if (pedidoEmAndamento !== null) {
        return
      }
      const controlador = new AbortController()
      pedidoEmAndamento = controlador
      const tempoLimite = setTimeout(() => controlador.abort(), TEMPO_LIMITE_PEDIDO_MS)

      // O estado só muda depois do await (quando a resposta chega), nunca na hora do efeito.
      try {
        const novaLinha = await buscarLeituraS01(config, { signal: controlador.signal })
        if (!ligado) {
          return // a tela saiu (ou foi pedido "atualizar agora") antes de a resposta chegar
        }
        if (novaLinha === null) {
          // Veio a lista vazia: null não é uma linha. A última linha continua (RN-11) e, depois
          // do limite, o leituraDesatualizada marca a S01 como "Desatualizado", sem inventar nada.
          setErro(modo === 'supabase' ? ERRO_SEM_LINHA : null)
        } else {
          setLinha(novaLinha)
          setErro(null)
        }
      } catch (falha) {
        if (!ligado) {
          return // o cancelamento do return do efeito não é erro
        }
        // Com a tela aberta, o único cancelamento é o do tempo limite: o pedido demorou demais.
        // Não chegou resposta nenhuma, então a ultimaBusca não muda; a linha antiga continua (RN-11).
        if (falha && falha.name === 'AbortError') {
          setErro(ERRO_DEMOROU)
          setCarregando(false) // a tela sai do "carregando" e mostra a S01 como está, com o erro
          return
        }
        setErro(falha instanceof Error && falha.message ? falha.message : ERRO_SEM_MENSAGEM)
      } finally {
        clearTimeout(tempoLimite)
        if (pedidoEmAndamento === controlador) {
          pedidoEmAndamento = null // este voltou; o próximo pode ir
        }
      }

      // Chegou uma resposta (com a linha, com a lista vazia ou com o erro da API).
      const horaDaResposta = Date.now()
      setUltimaBusca(horaDaResposta)
      setAgora(horaDaResposta)
      setCarregando(false)
    }

    // A primeira busca vai num setTimeout de 0, e não direto aqui. Em desenvolvimento, o
    // StrictMode roda este efeito, desfaz (o return) e roda de novo, na mesma hora. Chamada
    // direto, seriam dois GET. Com o timer, o return do primeiro efeito limpa a busca
    // antes de ela rodar.
    const primeiraBusca = setTimeout(buscar, 0)
    const timer = modo === 'supabase' ? setInterval(buscar, INTERVALO_ATUALIZACAO_MS) : null

    return () => {
      ligado = false
      clearTimeout(primeiraBusca)
      clearInterval(timer)
      if (pedidoEmAndamento !== null) {
        pedidoEmAndamento.abort()
      }
    }
  }, [config, modo, pedidosManuais])

  // React Hook useEffect: executa quando chega outra linha da S01 e por isso liga o relógio que,
  // a cada segundo, confere se o selo "Desatualizado" de alguma sala mudou. O "agora" só anda
  // quando o selo muda: com o mesmo valor, o React não desenha a página inteira de novo à toa.
  // O return desliga o relógio (quando a tela sai ou antes de ligar o da linha nova).
  useEffect(() => {
    const salas = montarSalas(linha, origemDaS01)
    const relogio = setInterval(() => {
      const momento = Date.now()
      setAgora((anterior) => (mudouAlgumSelo(salas, anterior, momento) ? momento : anterior))
    }, INTERVALO_RELOGIO_MS)
    return () => clearInterval(relogio)
  }, [linha, origemDaS01])

  // Recomeça o efeito da busca: cancela o pedido que estava no caminho, busca já e
  // recomeça a contagem do intervalo.
  const atualizarAgora = () => {
    setPedidosManuais((quantos) => quantos + 1)
  }

  // As salas são montadas a cada desenho, e não guardadas: assim o "Desatualizado" acompanha o
  // "agora" do relógio e nunca fica velho.
  const salas = montarSalas(linha, origemDaS01, leiturasDemo)
  const selos = marcarDesatualizadas(salas, agora)
  const itens = salas.map((sala, indice) => ({
    sala,
    classificacao: classificarSala(sala),
    desatualizada: selos[indice],
  }))

  return { itens, carregando, erro, modo, aviso: config.aviso, ultimaBusca, atualizarAgora }
}
