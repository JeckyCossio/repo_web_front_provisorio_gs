import { LEITURAS_DEMO, SALAS } from '../data/salas.js'

export const INTERVALO_SIMULACAO_MS = 10000
const salasGrandes = new Set(SALAS.filter((sala) => sala.porte === 'grande').map((sala) => sala.id))

// Copia as leituras, incluindo as mesas e os dados de luz.
function copiarLeituras(leituras) {
  const copia = {}
  for (const id in leituras) {
    const leitura = leituras[id]
    copia[id] = { ...leitura, mesas: [...leitura.mesas], luz: { ...leitura.luz } }
  }
  return copia
}

// Mantém o valor entre o mínimo e o máximo.
function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor))
}

// Soma as pessoas de todas as mesas.
function total(mesas) {
  return mesas.reduce((soma, pessoas) => soma + pessoas, 0)
}

// Sorteia uma variação de menos um, zero ou mais um.
function pequenoPasso(sortear) {
  const valor = sortear()
  return valor < 0.3 ? -1 : valor > 0.7 ? 1 : 0
}

// Simula entrada ou saída, preservando uma mesa vazia quando solicitado.
function mudarOcupacao(mesas, sortear, manterMesaLivre) {
  const mesasVazias = mesas.filter((pessoas) => pessoas === 0).length
  const capacidadeSimulada = (mesas.length - (manterMesaLivre ? 1 : 0)) * 3
  let direcao = sortear() < 0.5 ? -1 : 1
  if (total(mesas) === 0) direcao = 1
  if (total(mesas) === capacidadeSimulada) direcao = -1
  const candidatas = mesas.map((pessoas, indice) => ({ pessoas, indice }))
    .filter(({ pessoas }) => direcao === 1
      ? pessoas < 3 && !(manterMesaLivre && mesasVazias === 1 && pessoas === 0)
      : pessoas > 0)
  const mesa = candidatas[Math.floor(sortear() * candidatas.length)].indice
  mesas[mesa] += direcao
}

// Cria uma simulação independente para as salas S02 a S09.
export function criarSimulacaoLocal(sortear = Math.random) {
  let passo = 0
  const leituras = copiarLeituras(LEITURAS_DEMO)
  const leituraInicial = copiarLeituras(leituras)

  return {
    leituraInicial,
    // Avança dez segundos e atualiza os indicadores conforme seus intervalos.
    proximaLeitura() {
      passo += 1
      SALAS.filter((sala) => sala.origem === 'demo').forEach((sala, indice) => {
        const id = sala.id
        const leitura = leituras[id]
        const base = LEITURAS_DEMO[id]

        if (passo % 6 === 0) {
          mudarOcupacao(leitura.mesas, sortear, salasGrandes.has(id))
        }

        // Varia até 0,1 °C, respeitando ±0,6 °C do valor inicial.
        if (passo % (18 + indice) === 0) {
          leitura.temperaturaC = Number(limitar(
            leitura.temperaturaC + pequenoPasso(sortear) * 0.1,
            base.temperaturaC - 0.6, base.temperaturaC + 0.6,
          ).toFixed(1))
        }

        // Varia até 1 lux, respeitando cerca de ±1% do valor inicial.
        if (passo % (24 + indice) === 0) {
          const margem = Math.max(2, Math.round(base.luz.valor * 0.01))
          leitura.luz.valor = limitar(
            leitura.luz.valor + pequenoPasso(sortear), base.luz.valor - margem, base.luz.valor + margem,
          )
        }

        // O ruído acompanha a ocupação, com uma oscilação aleatória.
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
