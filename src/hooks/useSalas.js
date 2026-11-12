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

const INTERVALO_RELOGIO_MS = 1000

const ERRO_DEMOROU = `A API demorou mais de ${TEMPO_LIMITE_PEDIDO_MS / 1000} segundos para responder.`
const ERRO_SEM_LINHA = 'A API não devolveu a leitura da S01 (a linha não existe ou não está liberada para leitura).'
const ERRO_SEM_MENSAGEM = 'Não foi possível buscar a leitura da S01.'

// Confere a idade das leituras remotas; simulações locais não vencem.
function marcarDesatualizadas(salas, momento, diferencaRelogioMs = 0) {
  return salas.map((sala) =>
    sala.origem === 'demo' ? false : leituraDesatualizada(sala.atualizadoEm, momento, LIMITE_DESATUALIZADO_SEGUNDOS, diferencaRelogioMs),
  )
}

// Compara os avisos de leitura antiga entre dois instantes.
function mudouAlgumSelo(salas, antes, depois, diferencaRelogioMs) {
  const selosAntes = marcarDesatualizadas(salas, antes, diferencaRelogioMs)
  const selosDepois = marcarDesatualizadas(salas, depois, diferencaRelogioMs)
  return selosAntes.filter((selo, indice) => selo !== selosDepois[indice]).length > 0
}

// Combina a leitura remota da S01 com a simulação local de S02 a S09.
export function useSalas() {
  const [config] = useState(() => lerConfiguracao(import.meta.env))
  const [simulacaoLocal] = useState(() => criarSimulacaoLocal())
  const [leiturasDemo, setLeiturasDemo] = useState(() => simulacaoLocal.leituraInicial)
  const [linha, setLinha] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [ultimaBusca, setUltimaBusca] = useState(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [pedidosManuais, setPedidosManuais] = useState(0)

  const modo = config.modoTelemetria
  const origemDaS01 = 'iot'

  // O simulador avança no timer para não depender dos renders ou das consultas à API.
  useEffect(() => {
    const timer = setInterval(() => {
      setLeiturasDemo(simulacaoLocal.proximaLeitura())
    }, INTERVALO_SIMULACAO_MS)
    return () => clearInterval(timer)
  }, [simulacaoLocal])

  useEffect(() => {
    let ligado = true
    let pedidoEmAndamento = null

    // Consulta a S01 sem sobrepor pedidos nem apagar a última leitura em falhas.
    async function buscar() {
      if (pedidoEmAndamento !== null) {
        return
      }
      const controlador = new AbortController()
      pedidoEmAndamento = controlador
      const tempoLimite = setTimeout(() => controlador.abort(), TEMPO_LIMITE_PEDIDO_MS)

      try {
        const novaLinha = await buscarLeituraS01(config, { signal: controlador.signal })
        if (!ligado) {
          return
        }
        if (novaLinha === null) {
          setErro(modo === 'supabase' ? ERRO_SEM_LINHA : null)
        } else {
          setLinha(novaLinha)
          setErro(null)
        }
      } catch (falha) {
        if (!ligado) {
          return
        }
        if (falha && falha.name === 'AbortError') {
          setErro(ERRO_DEMOROU)
          setCarregando(false)
          return
        }
        setErro(falha instanceof Error && falha.message ? falha.message : ERRO_SEM_MENSAGEM)
      } finally {
        clearTimeout(tempoLimite)
        if (pedidoEmAndamento === controlador) {
          pedidoEmAndamento = null
        }
      }

      const horaDaResposta = Date.now()
      setUltimaBusca(horaDaResposta)
      setAgora(horaDaResposta)
      setCarregando(false)
    }

    // O timer evita duplicar a primeira consulta no StrictMode.
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

  // Atualiza o estado apenas quando o aviso de leitura antiga mudar.
  useEffect(() => {
    const salas = montarSalas(linha, origemDaS01)
    const relogio = setInterval(() => {
      const momento = Date.now()
      setAgora((anterior) => (mudouAlgumSelo(salas, anterior, momento, linha?.diferencaRelogioMs) ? momento : anterior))
    }, INTERVALO_RELOGIO_MS)
    return () => clearInterval(relogio)
  }, [linha, origemDaS01])

  // Reinicia o efeito de consulta para buscar uma leitura imediatamente.
  const atualizarAgora = () => {
    setPedidosManuais((quantos) => quantos + 1)
  }

  const salas = montarSalas(linha, origemDaS01, leiturasDemo)
  const selos = marcarDesatualizadas(salas, agora, linha?.diferencaRelogioMs)
  const itens = salas.map((sala, indice) => ({
    sala,
    classificacao: classificarSala(sala),
    desatualizada: selos[indice],
  }))

  return { itens, carregando, erro, modo, aviso: config.aviso, ultimaBusca, atualizarAgora }
}
