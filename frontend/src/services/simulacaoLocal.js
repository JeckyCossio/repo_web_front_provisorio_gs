import { LEITURAS_DEMO, SALAS } from '../data/salas.js'

// Ritmos ilustrativos do protótipo, não medições reais. Um passo acontece a cada 10 s.
// Temperatura e luz têm ritmos próprios por sala e ficam próximas do valor inicial.
// O ruído muda a cada passo; a ocupação, a cada seis passos, sem saltos.
export const INTERVALO_SIMULACAO_MS = 10000
const salasGrandes = new Set(SALAS.filter((sala) => sala.porte === 'grande').map((sala) => sala.id))

function copiarLeituras(leituras) {
  const copia = {}
  for (const id in leituras) {
    const leitura = leituras[id]
    copia[id] = { ...leitura, mesas: [...leitura.mesas], luz: { ...leitura.luz } }
  }
  return copia
}

function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor))
}

function total(mesas) {
  return mesas.reduce((soma, pessoas) => soma + pessoas, 0)
}

// Pode ficar igual: não há obrigação de mudar um indicador em todo intervalo.
function pequenoPasso(sortear) {
  const valor = sortear()
  return valor < 0.3 ? -1 : valor > 0.7 ? 1 : 0
}

function mudarOcupacao(mesas, sortear, manterMesaLivre) {
  const mesasVazias = mesas.filter((pessoas) => pessoas === 0).length
  const capacidadeSimulada = (mesas.length - (manterMesaLivre ? 1 : 0)) * 3
  let direcao = sortear() < 0.5 ? -1 : 1
  // No teto simulado só pode sair alguém; em sala vazia só pode entrar.
  // Nas grandes, a última mesa vazia nunca recebe uma entrada.
  if (total(mesas) === 0) direcao = 1
  if (total(mesas) === capacidadeSimulada) direcao = -1
  const candidatas = mesas.map((pessoas, indice) => ({ pessoas, indice }))
    .filter(({ pessoas }) => direcao === 1
      ? pessoas < 3 && !(manterMesaLivre && mesasVazias === 1 && pessoas === 0)
      : pessoas > 0)
  const mesa = candidatas[Math.floor(sortear() * candidatas.length)].indice
  mesas[mesa] += direcao
}

/**
 * Simula somente S02–S09 no navegador. Cada chamada avança 10 segundos simulados.
 * Não acessa a rede, não altera os seeds e nunca inclui a S01.
 * O sorteio pode ser fornecido pelos testes para conferir limites e ritmos.
 */
export function criarSimulacaoLocal(sortear = Math.random) {
  let passo = 0
  const leituras = copiarLeituras(LEITURAS_DEMO)
  const leituraInicial = copiarLeituras(leituras)

  return {
    leituraInicial,
    proximaLeitura() {
      passo += 1
      SALAS.filter((sala) => sala.origem === 'demo').forEach((sala, indice) => {
        const id = sala.id
        const leitura = leituras[id]
        const base = LEITURAS_DEMO[id]

        // Uma pessoa em uma única mesa a cada minuto, em todas as salas locais.
        if (passo % 6 === 0) {
          mudarOcupacao(leitura.mesas, sortear, salasGrandes.has(id))
        }

        // No máximo 0,1 °C a cada 180–250 s, limitado a ±0,6 °C do valor inicial.
        if (passo % (18 + indice) === 0) {
          leitura.temperaturaC = Number(limitar(
            leitura.temperaturaC + pequenoPasso(sortear) * 0.1,
            base.temperaturaC - 0.6, base.temperaturaC + 0.6,
          ).toFixed(1))
        }

        // No máximo 1 lux a cada 240–310 s, limitado a cerca de ±1% do valor inicial.
        if (passo % (24 + indice) === 0) {
          const margem = Math.max(2, Math.round(base.luz.valor * 0.01))
          leitura.luz.valor = limitar(
            leitura.luz.valor + pequenoPasso(sortear), base.luz.valor - margem, base.luz.valor + margem,
          )
        }

        // A cada 10 s, aproxima o ruído da ocupação com uma oscilação de 1–2 dB.
        // Evita repetir o valor inclusive nas bordas, sem sair dos limites existentes.
        const alvo = base.ruidoDb + (total(leitura.mesas) - total(base.mesas)) * 1.5
        const tendencia = Math.sign(alvo - leitura.ruidoDb)
        let variacao = limitar(tendencia + pequenoPasso(sortear), -2, 2)
        if (variacao === 0) variacao = sortear() < 0.5 ? -1 : 1
        const novoRuido = limitar(leitura.ruidoDb + variacao,
          Math.max(30, base.ruidoDb - 8), Math.min(80, base.ruidoDb + 8))
        leitura.ruidoDb = novoRuido === leitura.ruidoDb
          ? leitura.ruidoDb - Math.sign(variacao)
          : novoRuido
      })
      return copiarLeituras(leituras)
    },
  }
}
