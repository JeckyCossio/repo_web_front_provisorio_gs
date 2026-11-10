// Classifica as leituras das salas (CONTEXTO, §5.2, RN-08 e RN-09).
//
// Três coisas diferentes, que não se misturam (CONTEXTO, §5.2):
// 1. o VALOR (ex.: 18 °C);
// 2. a FAIXA, onde o valor está na escala: 'baixo', 'medio' ou 'alto'. Não diz se é bom.
// 3. a SEVERIDADE, se a sala está boa para usar: 'adequado', 'atencao' ou 'critico'.
// Sem leitura válida, não há classificação: o valor e a faixa (e o índice do ruído) ficam
// null, e a severidade fica 'invalido', o quarto valor, que leva a sala para 'falha'.
// Os números vêm do limiares.js, que ainda é PROVISÓRIO.

import { LIMIARES, RUIDO_DB_MAX, RUIDO_DB_MIN } from './limiares.js'
import { resumoOcupacao, validarMesas } from './ocupacao.js'

// Diz se o valor é um número de verdade: não é texto, null, NaN nem infinito.
function ehNumero(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
}

// Pega os limiares do indicador. Um nome errado é erro de quem programou, então para tudo.
// Só os quatro indicadores conhecidos podem consultar os limiares.
function limiaresDe(indicador) {
  if (!['temperatura', 'luz', 'ruido', 'ocupacao'].includes(indicador)) {
    throw new Error(`Indicador desconhecido: "${indicador}". Use temperatura, luz, ruido ou ocupacao.`)
  }
  return LIMIARES[indicador]
}

/**
 * Diz em que faixa da escala o valor está. A faixa NÃO diz se é bom ou ruim.
 * @param {'temperatura'|'luz'|'ruido'|'ocupacao'} indicador qual medida é
 * @param {number} valor a leitura, na unidade do limiares.js
 * @returns {'baixo'|'medio'|'alto'|null} a faixa, ou null se o valor não for um número válido
 * @throws {Error} se o indicador não existir
 */
export function classificarFaixa(indicador, valor) {
  const limiares = limiaresDe(indicador)
  if (!ehNumero(valor)) {
    return null
  }
  if (valor < limiares.limiteBaixo) {
    return 'baixo'
  }
  if (valor > limiares.limiteAlto) {
    return 'alto'
  }
  return 'medio'
}

// "Ficou abaixo do limite": o limite existe (não é null) e o valor é MENOR que ele.
function ficouAbaixo(valor, limite) {
  return limite !== null && valor < limite
}

// "Ficou acima do limite": o limite existe (não é null) e o valor é MAIOR que ele.
function ficouAcima(valor, limite) {
  return limite !== null && valor > limite
}

/**
 * Diz se a leitura está boa para usar a sala. Frio ou escuro demais também alertam (RN-09).
 * Ordem: primeiro olha os limites críticos, depois os de atenção; se não passou de nenhum, é adequado.
 * @param {'temperatura'|'luz'|'ruido'|'ocupacao'} indicador qual medida é
 * @param {number} valor a leitura, na unidade do limiares.js
 * @returns {'adequado'|'atencao'|'critico'|'invalido'} 'invalido' se o valor não for um número válido
 * @throws {Error} se o indicador não existir
 */
export function classificarSeveridade(indicador, valor) {
  const limiares = limiaresDe(indicador)
  if (!ehNumero(valor)) {
    return 'invalido'
  }
  if (ficouAbaixo(valor, limiares.criticoAbaixo) || ficouAcima(valor, limiares.criticoAcima)) {
    return 'critico'
  }
  if (ficouAbaixo(valor, limiares.atencaoAbaixo) || ficouAcima(valor, limiares.atencaoAcima)) {
    return 'atencao'
  }
  return 'adequado'
}

/**
 * Transforma os dB simulados num índice de 0 a 100 (CONTEXTO, §5.3). 100 = mais ruidoso.
 * É a "intensidade do ruído", não a "qualidade para estudar". O dB é logarítmico e o índice é
 * linear em dB: índice 60 NÃO é "o dobro de barulho" do índice 30.
 * @param {number} db o ruído em dB simulados
 * @returns {number|null} um inteiro de 0 a 100, ou null se o valor não for um número válido
 */
export function indiceRuido(db) {
  if (!ehNumero(db)) {
    return null
  }
  const indice = Math.round((100 * (db - RUIDO_DB_MIN)) / (RUIDO_DB_MAX - RUIDO_DB_MIN))
  // Prende entre 0 e 100: abaixo do começo da escala vira 0; acima do fim, 100.
  return Math.min(100, Math.max(0, indice))
}

// As três severidades de uma leitura boa. Qualquer outra coisa ('invalido', texto
// estranho) quer dizer que falta leitura.
const SEVERIDADES_VALIDAS = ['adequado', 'atencao', 'critico']

/**
 * O estado geral da sala, a mesma regra dos LEDs do Wokwi (RN-08). A ordem importa:
 * 1. 'falha': o status existe e não é 'ok' (o ESP32 avisou um erro, como 'offline', ou a
 *    web marcou 'sem_leitura' ou 'dados_invalidos' no normalizar.js), ou falta leitura
 *    (lista vazia, ou alguma severidade 'invalido' ou desconhecida).
 *    Vem primeiro para a sala NUNCA ficar verde por falta de leitura (CONTEXTO, §5.2).
 * 2. 'vermelho': pelo menos um indicador 'critico'.
 * 3. 'amarelo': nenhum crítico e pelo menos um em 'atencao'.
 * 4. 'verde': todos 'adequado'.
 * A idade da leitura não entra aqui: o aviso "Desatualizado" é o leituraDesatualizada (atualizacao.js).
 * @param {string[]} severidades a severidade de cada indicador
 * @param {string|null} [statusDispositivo] o statusDispositivo da sala normalizada: os do ESP32
 *   ('ok', 'sensor_error', 'offline'...) ou os da web ('sem_leitura', 'dados_invalidos');
 *   null ou ausente nas salas demo
 * @returns {'falha'|'vermelho'|'amarelo'|'verde'} o estado geral
 */
export function estadoGeral(severidades, statusDispositivo) {
  const temStatus = statusDispositivo !== null && statusDispositivo !== undefined
  if (temStatus && statusDispositivo !== 'ok') {
    return 'falha'
  }
  if (!Array.isArray(severidades) || severidades.length === 0) {
    return 'falha'
  }
  for (const severidade of severidades) {
    if (!SEVERIDADES_VALIDAS.includes(severidade)) {
      return 'falha'
    }
  }
  if (severidades.includes('critico')) {
    return 'vermelho'
  }
  if (severidades.includes('atencao')) {
    return 'amarelo'
  }
  return 'verde'
}

// Valor, faixa e severidade de um indicador. Valor que não é número volta como null.
function classificarIndicador(indicador, valor) {
  return {
    valor: ehNumero(valor) ? valor : null,
    faixa: classificarFaixa(indicador, valor),
    severidade: classificarSeveridade(indicador, valor),
  }
}

// A luz só é classificada se vier na mesma unidade dos limiares ('lux_estimado').
// Comparar um "índice" com limites em lux daria um resultado errado, então vira 'invalido'.
// (O normalizar.js já troca outra unidade por null; isto protege a sala montada à mão.)
function classificarLuz(luz) {
  const dados = luz || {}
  const unidade = dados.unidade || null
  if (unidade !== LIMIARES.luz.unidade) {
    return { valor: ehNumero(dados.valor) ? dados.valor : null, unidade, faixa: null, severidade: 'invalido' }
  }
  return { ...classificarIndicador('luz', dados.valor), unidade }
}

// A ocupação usa as contas do ocupacao.js e classifica pela TAXA (% da capacidade).
// Mesas inválidas não lançam erro aqui: viram tudo null e 'invalido'.
function classificarOcupacao(mesas) {
  if (!validarMesas(mesas).valido) {
    return {
      total: null, capacidade: null, vagas: null, mesasVazias: null, taxa: null,
      faixa: null, severidade: 'invalido',
    }
  }
  const resumo = resumoOcupacao(mesas)
  return {
    ...resumo,
    faixa: classificarFaixa('ocupacao', resumo.taxa),
    severidade: classificarSeveridade('ocupacao', resumo.taxa),
  }
}

/**
 * Classifica a sala normalizada inteira (a que sai do normalizar.js). Nunca lança erro:
 * uma leitura que falta vira 'invalido', e aí a sala fica em 'falha'.
 * Quem confere se o valor é possível para o sensor (ex.: ruído de -20 dB) é o normalizar.js;
 * aqui o valor só é comparado com os limiares. Por isso a sala tem de passar por ele antes.
 * @param {object} sala a sala normalizada: { mesas, temperaturaC, luz: { valor, unidade }, ruidoDb, statusDispositivo, ... }
 * @returns {{ temperatura: object, luz: object, ruido: object, ocupacao: object, estado: string }}
 *   cada indicador com { valor, faixa, severidade } (a luz com a unidade, o ruído com o índice 0 a 100,
 *   a ocupação com o resumo do ocupacao.js no lugar do valor) e o estado geral
 */
export function classificarSala(sala) {
  const dados = sala || {}
  const temperatura = classificarIndicador('temperatura', dados.temperaturaC)
  const luz = classificarLuz(dados.luz)
  const ruido = { ...classificarIndicador('ruido', dados.ruidoDb), indice: indiceRuido(dados.ruidoDb) }
  const ocupacao = classificarOcupacao(dados.mesas)
  const severidades = [temperatura.severidade, luz.severidade, ruido.severidade, ocupacao.severidade]
  return {
    temperatura,
    luz,
    ruido,
    ocupacao,
    estado: estadoGeral(severidades, dados.statusDispositivo),
  }
}
