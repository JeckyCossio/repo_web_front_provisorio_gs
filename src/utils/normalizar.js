import { LEITURAS_DEMO, SALAS } from '../data/salas.js'
import { lerDataIso } from './atualizacao.js'
import { LEITURA_POSSIVEL, LIMIARES } from './limiares.js'
import { validarMesas } from './ocupacao.js'
import { decimalSimples } from './numeros.js'

// Converte decimais válidos e descarta valores não numéricos.
function paraNumero(valor) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null
  }
  if (typeof valor === 'string' && decimalSimples(valor.trim())) {
    const numero = Number(valor.trim())
    return Number.isFinite(numero) ? numero : null
  }
  return null
}

// Converte a leitura e confere os limites aceitos pelo sensor.
function lerNaFaixa(valor, faixa) {
  const numero = paraNumero(valor)
  if (numero === null || numero < faixa.minimo || numero > faixa.maximo) {
    return null
  }
  return numero
}

// Aceita array ou JSON e valida a ocupação e a quantidade de mesas.
function lerMesas(valor, quantidadeMesas) {
  let lista = valor
  if (typeof valor === 'string') {
    try {
      lista = JSON.parse(valor)
    } catch {
      return null
    }
  }
  if (!Array.isArray(lista)) {
    return null
  }
  const mesas = lista.map((pessoas) => paraNumero(pessoas))
  if (!validarMesas(mesas).valido) {
    return null
  }
  if (typeof quantidadeMesas !== 'number' || mesas.length !== quantidadeMesas) {
    return null
  }
  return mesas
}

// Retira espaços do status ou retorna null se estiver vazio.
function lerStatus(valor) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return null
  }
  return valor.trim()
}

// Valida mesas, temperatura, luz e ruído no mesmo formato.
function lerLeituras(dados, quantidadeMesas) {
  const luz = dados.luz || {}
  return {
    mesas: lerMesas(dados.mesas, quantidadeMesas),
    temperaturaC: lerNaFaixa(dados.temperaturaC, LEITURA_POSSIVEL.temperatura),
    luz: {
      valor: lerNaFaixa(luz.valor, LEITURA_POSSIVEL.luz),
      unidade: luz.unidade === LIMIARES.luz.unidade ? luz.unidade : null,
    },
    ruidoDb: lerNaFaixa(dados.ruidoDb, LEITURA_POSSIVEL.ruido),
  }
}

// Confere se falta algum campo obrigatório da leitura.
function algumaLeituraNula(leituras) {
  const campos = [leituras.mesas, leituras.temperaturaC, leituras.luz.valor, leituras.luz.unidade, leituras.ruidoDb]
  return campos.includes(null)
}

// Cria os campos vazios sem substituir a falta de leitura por zero.
function semLeituras() {
  return { mesas: null, temperaturaC: null, luz: { valor: null, unidade: null }, ruidoDb: null }
}

// Obtém ID, nome e porte dos dados fixos da sala.
function dadosDaSala(meta) {
  return {
    id: meta.id === undefined ? null : meta.id,
    nome: meta.nome === undefined ? null : meta.nome,
    porte: meta.porte === undefined ? null : meta.porte,
  }
}

// Converte os campos do Supabase para o formato usado pelo painel.
export function normalizarTelemetria(linha, metaSala, origem = 'iot') {
  const meta = metaSala || {}
  const origemDaLinha = origem === 'iot' ? 'iot' : 'mock'
  if (linha === null || linha === undefined) {
    return { ...dadosDaSala(meta), ...semLeituras(), origem: origemDaLinha, statusDispositivo: 'sem_leitura', atualizadoEm: null }
  }
  const ehUmaLinha = typeof linha === 'object' && !Array.isArray(linha)
  const salaTemId = typeof meta.id === 'string' && meta.id !== ''
  if (!ehUmaLinha || !salaTemId || linha.room_id !== meta.id) {
    return { ...dadosDaSala(meta), ...semLeituras(), origem: origemDaLinha, statusDispositivo: 'dados_invalidos', atualizadoEm: null }
  }

  const leituras = lerLeituras(
    {
      mesas: linha.occupancy_by_table,
      temperaturaC: linha.temperature_c,
      luz: { valor: linha.light_value, unidade: LIMIARES.luz.unidade },
      ruidoDb: linha.noise_db_simulated,
    },
    meta.quantidadeMesas,
  )
  const atualizadoEm = lerDataIso(linha.updated_at) === null ? null : linha.updated_at
  const statusRecebido = lerStatus(linha.device_status)

  const algumInvalido = algumaLeituraNula(leituras) || atualizadoEm === null || statusRecebido === null

  // Preserva o status de erro enviado pelo dispositivo.
  let statusDispositivo = statusRecebido
  if (algumInvalido && (statusRecebido === null || statusRecebido === 'ok')) {
    statusDispositivo = 'dados_invalidos'
  }

  return { ...dadosDaSala(meta), ...leituras, origem: origemDaLinha, statusDispositivo, atualizadoEm }
}

// As leituras locais passam pela mesma validação das leituras remotas.
export function montarSalaDemo(metaSala, leitura) {
  const meta = metaSala || {}
  const leituras = lerLeituras(leitura || {}, meta.quantidadeMesas)
  const statusDispositivo = algumaLeituraNula(leituras) ? 'dados_invalidos' : null
  return { ...dadosDaSala(meta), ...leituras, origem: 'demo', statusDispositivo, atualizadoEm: null }
}

// Combina a leitura da S01 com as simulações na ordem das salas.
export function montarSalas(linhaS01, origemS01 = 'iot', leiturasDemo = LEITURAS_DEMO) {
  return SALAS.map((meta) => {
    if (meta.origem === 'iot') {
      return normalizarTelemetria(linhaS01, meta, origemS01)
    }
    return montarSalaDemo(meta, leiturasDemo[meta.id])
  })
}
