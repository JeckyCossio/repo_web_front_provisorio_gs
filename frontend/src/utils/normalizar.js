// Transforma as leituras no formato único da "sala normalizada", o mesmo para as 9 salas.
// Toda sala, venha do Supabase (a S01) ou do data/salas.js (S02 a S09), sai com os mesmos
// campos e passa pelas mesmas conferências.
// (ou no mock) é o services/; aqui só se arruma o que chegou.
// É o único arquivo do utils/ que importa algo de fora dele: o data/salas.js, que só tem dados.
//
// Regra principal: NUNCA inventar leitura. O que não for válido vira null, e a sala avisa no
// statusDispositivo. Além dos status que o ESP32 manda ('ok', 'sensor_error', 'offline'...),
// a web cria dois:
// - 'sem_leitura': ainda não chegou nenhuma linha da S01;
// - 'dados_invalidos': chegou, mas algum campo não é válido.
// Estas funções nunca lançam erro.

import { LEITURAS_DEMO, SALAS } from '../data/salas.js'
import { lerDataIso } from './atualizacao.js'
import { LEITURA_POSSIVEL, LIMIARES } from './limiares.js'
import { validarMesas } from './ocupacao.js'
import { decimalSimples } from './numeros.js'

// Um número escrito do jeito simples: o sinal de menos (se tiver), dígitos e, se tiver,
// o ponto e mais dígitos. Ex.: "22.8", "-3", "54".

// Converte para número. Aceita o número 22.8 e o texto "22.8" (com espaços em volta).
// Devolve null para todo o resto: "", "abc", "22,8" (vírgula), "0x16" (hexadecimal),
// "2.28e1" (notação científica), null, NaN, infinito, true...
function paraNumero(valor) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null
  }
  if (typeof valor === 'string' && decimalSimples(valor.trim())) {
    const numero = Number(valor.trim())
    return Number.isFinite(numero) ? numero : null // um texto com 400 dígitos daria infinito
  }
  return null
}

// Um número que o sensor consegue dar: de faixa.minimo até faixa.maximo, contando os dois
// (a LEITURA_POSSIVEL do limiares.js). Fora disso é erro de leitura (CONTEXTO, §5.4) e vira null.
function lerNaFaixa(valor, faixa) {
  const numero = paraNumero(valor)
  if (numero === null || numero < faixa.minimo || numero > faixa.maximo) {
    return null
  }
  return numero
}

// Lê as mesas. Aceita a lista [1, 2, 0] ou o texto JSON "[1,2,0]".
// Devolve null se não der uma lista válida (cada mesa de 0 a 3, RN-01 e RN-05)
// ou se o número de mesas for diferente do da sala (a S01 tem 3, CONTEXTO, §10.2).
// Sem saber quantas mesas a sala tem, não dá para conferir: também devolve null.
function lerMesas(valor, quantidadeMesas) {
  let lista = valor
  if (typeof valor === 'string') {
    try {
      lista = JSON.parse(valor)
    } catch {
      return null // o texto não era um JSON válido
    }
  }
  if (!Array.isArray(lista)) {
    return null
  }
  const mesas = lista.map((pessoas) => paraNumero(pessoas)) // lista nova: a original não muda
  if (!validarMesas(mesas).valido) {
    return null
  }
  if (typeof quantidadeMesas !== 'number' || mesas.length !== quantidadeMesas) {
    return null
  }
  return mesas
}

// O status do ESP32 ('ok', 'sensor_error', 'offline'...): um texto que não esteja vazio.
function lerStatus(valor) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return null
  }
  return valor.trim()
}

// Lê as quatro leituras (mesas, temperatura, luz e ruído), do mesmo jeito para a S01 e
// para as salas demo. O que não for válido vira null.
// A luz só vale na unidade dos limiares ('lux_estimado'). O CONTEXTO (§6.3) também prevê
// 'indice', mas não há limiares para ele, então a web não teria como classificar.
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

// Diz se alguma das leituras ficou null (ou seja, veio com problema).
function algumaLeituraNula(leituras) {
  const campos = [leituras.mesas, leituras.temperaturaC, leituras.luz.valor, leituras.luz.unidade, leituras.ruidoDb]
  return campos.includes(null)
}

// Nenhuma leitura: tudo null, nunca zeros inventados. É uma função (e não uma constante)
// para cada sala ganhar o seu próprio objeto da luz.
function semLeituras() {
  return { mesas: null, temperaturaC: null, luz: { valor: null, unidade: null }, ruidoDb: null }
}

// O id, o nome e o porte, que vêm sempre do data/salas.js.
// Campos ausentes ficam como null.
function dadosDaSala(meta) {
  return {
    id: meta.id === undefined ? null : meta.id,
    nome: meta.nome === undefined ? null : meta.nome,
    porte: meta.porte === undefined ? null : meta.porte,
  }
}

/**
 * Transforma a linha da tabela room_telemetry (CONTEXTO, §6.3) na sala normalizada.
 * O id, o nome e o porte vêm sempre do data/salas.js; a linha só traz a leitura.
 * Nunca lança erro: o que não for válido vira null e o status vira 'dados_invalidos'
 * (fica o status do ESP32 se ele mesmo avisou um erro, como 'offline').
 * @param {object|null} linha UMA linha do Supabase (o resposta[0], não a lista); null ou undefined
 *   quando ainda não chegou nada
 * @param {object} metaSala a sala do data/salas.js (id, nome, porte, quantidadeMesas)
 * @param {'iot'|'mock'} [origem] de onde veio a linha: 'iot' (o Supabase, o padrão) ou 'mock'
 *   (a leitura inventada do modo mock). Qualquer outro valor vira 'mock'
 * @returns {object} a sala normalizada. Sem linha: tudo null e status 'sem_leitura'
 */
export function normalizarTelemetria(linha, metaSala, origem = 'iot') {
  const meta = metaSala || {}
  // Só sai 'iot' quando pedirem 'iot'. Qualquer outra coisa sai 'mock' (demonstração):
  // na dúvida, a tela nunca diz que uma leitura inventada veio do Wokwi (RN-10).
  const origemDaLinha = origem === 'iot' ? 'iot' : 'mock'
  if (linha === null || linha === undefined) {
    return { ...dadosDaSala(meta), ...semLeituras(), origem: origemDaLinha, statusDispositivo: 'sem_leitura', atualizadoEm: null }
  }
  // Tem que ser um objeto (não uma lista, um texto ou um número) e ser a linha DESTA sala.
  // A sala precisa ter um id: sem ele, uma linha sem room_id "bateria" (undefined === undefined).
  const ehUmaLinha = typeof linha === 'object' && !Array.isArray(linha)
  const salaTemId = typeof meta.id === 'string' && meta.id !== ''
  if (!ehUmaLinha || !salaTemId || linha.room_id !== meta.id) {
    return { ...dadosDaSala(meta), ...semLeituras(), origem: origemDaLinha, statusDispositivo: 'dados_invalidos', atualizadoEm: null }
  }

  // Os nomes da tabela (em inglês) viram os nomes da sala normalizada.
  const leituras = lerLeituras(
    {
      mesas: linha.occupancy_by_table,
      temperaturaC: linha.temperature_c,
      luz: { valor: linha.light_value, unidade: linha.light_unit },
      ruidoDb: linha.noise_db_simulated,
    },
    meta.quantidadeMesas,
  )
  // A data fica do jeito que veio, mas só se for uma data completa (dia, hora e fuso).
  const atualizadoEm = lerDataIso(linha.updated_at) === null ? null : linha.updated_at
  const statusRecebido = lerStatus(linha.device_status)

  // Se algum campo ficou null, a leitura tem problema.
  const algumInvalido = algumaLeituraNula(leituras) || atualizadoEm === null || statusRecebido === null

  // Um status de erro mandado pelo próprio ESP32 (ex.: 'offline') diz mais que o nosso,
  // então ele fica. Só trocamos por 'dados_invalidos' quando o ESP32 disse 'ok' ou não disse nada.
  let statusDispositivo = statusRecebido
  if (algumInvalido && (statusRecebido === null || statusRecebido === 'ok')) {
    statusDispositivo = 'dados_invalidos'
  }

  return { ...dadosDaSala(meta), ...leituras, origem: origemDaLinha, statusDispositivo, atualizadoEm }
}

/**
 * Monta uma sala fictícia (S02 a S09) no formato da sala normalizada.
 * A leitura passa pelas mesmas conferências da S01 (mesas de 0 a 3 e na quantidade da sala,
 * números dentro da faixa do sensor, luz em lux estimado) e sai copiada: mudar a sala
 * não muda os dados do data/salas.js.
 * @param {object} metaSala a sala do data/salas.js (id, nome, porte, quantidadeMesas)
 * @param {object} leitura a leitura fictícia do LEITURAS_DEMO ({ mesas, temperaturaC, luz, ruidoDb })
 * @returns {object} a sala normalizada, com origem 'demo' e atualizadoEm null. O statusDispositivo
 *   é null (sala demo não tem dispositivo), ou 'dados_invalidos' se a leitura fictícia estiver errada
 */
export function montarSalaDemo(metaSala, leitura) {
  const meta = metaSala || {}
  const leituras = lerLeituras(leitura || {}, meta.quantidadeMesas)
  // Com um erro no data/, a sala cai em "falha" e a tela consegue dizer o motivo.
  const statusDispositivo = algumaLeituraNula(leituras) ? 'dados_invalidos' : null
  return { ...dadosDaSala(meta), ...leituras, origem: 'demo', statusDispositivo, atualizadoEm: null }
}

/**
 * Monta as nove salas normalizadas, na ordem do data/salas.js (S01 a S09).
 * A S01 sai da linha do Supabase (ou do mock); as outras oito, das leituras fictícias.
 * Sem linha, a S01 sai com tudo null e 'sem_leitura': a leitura da S01 nunca é inventada.
 * @param {object|null} linhaS01 UMA linha da room_telemetry da S01 (o resposta[0]), ou null/undefined se ainda não chegou
 * @param {'iot'|'mock'} [origemS01] 'iot' (o padrão) se a linha veio do Supabase; 'mock' se veio do modo mock
 * @param {object} [leiturasDemo] estado atual das simulações locais S02–S09; por padrão, os valores iniciais
 * @returns {object[]} as nove salas normalizadas
 */
export function montarSalas(linhaS01, origemS01 = 'iot', leiturasDemo = LEITURAS_DEMO) {
  return SALAS.map((meta) => {
    if (meta.origem === 'iot') {
      return normalizarTelemetria(linhaS01, meta, origemS01)
    }
    return montarSalaDemo(meta, leiturasDemo[meta.id])
  })
}
