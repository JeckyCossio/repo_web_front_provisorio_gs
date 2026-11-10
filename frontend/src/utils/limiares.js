// PROVISÓRIO — proposta da parte web, aguardando a aprovação do grupo
// (tabela única para Edge, Python, Matemática e Web).
//
// Estes números ainda NÃO são critério aprovado: não vão para slide nem para o README
// como se fossem oficiais. Quando o grupo aprovar ou mudar um número, troque aqui e
// atualize os testes que usam esses números: limiares.test.js, classificacao.test.js
// (a tabela das 8 salas demo) e normalizar.test.js (o exemplo da S01 e a faixa de leitura).
//
// Como ler cada indicador (CONTEXTO, §5.2: faixa e severidade são coisas diferentes):
// - limiteBaixo e limiteAlto dão a FAIXA, onde o valor está: 'baixo', 'medio' ou 'alto'.
// - criticoAbaixo, atencaoAbaixo, atencaoAcima e criticoAcima dão a SEVERIDADE,
//   se a sala está boa para usar: 'adequado', 'atencao' ou 'critico'.
//   (Sem leitura válida, o classificacao.js devolve a faixa null e a severidade 'invalido'.)
// - null quer dizer "este lado não dá problema" (ex.: pouco ruído não é ruim).
// - O número do próprio limite fica do lado de dentro: 18 °C é atenção (não crítico),
//   25 °C é adequado. A conta (com < e >) está no classificacao.js.
//
// As normas citadas foram escritas para locais de trabalho ou para projeto de prédios,
// não para "sala de estudo". Servem de referência. As leituras do projeto são simuladas
// (Wokwi) ou fictícias (S02 a S09), nunca medições reais.

/** Os limiares PROVISÓRIOS de cada indicador, todos na unidade escrita em "unidade". */
export const LIMIARES = {
  // Fonte: NR-17, item 17.8.4.2 (18 a 25 °C em ambiente climatizado) e NBR 16401-2:2008
  // (zonas de conforto de 21 a 26 °C; lida numa fonte secundária, a norma é paga).
  // Adequado de 21 a 25 °C, onde as duas concordam; onde só uma atende, atenção.
  temperatura: {
    unidade: '°C',
    limiteBaixo: 21, // abaixo: faixa 'baixo' (frio)
    limiteAlto: 26, // acima: faixa 'alto' (quente)
    criticoAbaixo: 18, // abaixo de 18: nem a NR-17 atende
    atencaoAbaixo: 21, // de 18 até menos de 21: só a NR-17 atende
    atencaoAcima: 25, // acima de 25 até 26: só a NBR atende
    criticoAcima: 26, // acima de 26: nenhuma das duas atende
  },

  // Fonte (pouca luz): NHO 11 da Fundacentro, para onde a NR-17 (item 17.8.3) manda:
  // tarefa contínua, no mínimo 200 lux; sala de aula, 300 lux.
  // Fonte (luz demais): as normas não dão máximo; usamos o UDI (Mardaljevic): 2000 lux e,
  // na revisão do próprio autor, cerca de 3000 lux. Confiança baixa neste lado.
  // Faixa média de 300 a 750: os valores da NHO 11 para salas de escola. 'alto' não é ruim.
  // Unidade: lux ESTIMADO (o fotorresistor do Wokwi, sem calibração).
  luz: {
    unidade: 'lux_estimado',
    limiteBaixo: 300,
    limiteAlto: 750,
    criticoAbaixo: 200,
    atencaoAbaixo: 300,
    atencaoAcima: 2000,
    criticoAcima: 3000,
  },

  // Fonte: NBR 10152 (biblioteca: até 45 dB é o "aceitável", nas edições de 1987 e 2017;
  // a de 2017 lida em fontes secundárias) e NR-17, item 17.8.4.1.2 (até 65 dB(A)).
  // Faixa: silencioso abaixo de 40 (biblioteca, NBR 10152:2017) e barulhento acima de 55
  // (mais que o aceitável para a circulação de escola, NBR 10152:1987).
  // ATENÇÃO: são dB SIMULADOS (potenciômetro), não dB(A) medido. Confiança baixa.
  ruido: {
    unidade: 'dB_simulados',
    limiteBaixo: 40,
    limiteAlto: 55,
    criticoAbaixo: null, // pouco ruído não é problema
    atencaoAbaixo: null,
    atencaoAcima: 45,
    criticoAcima: 65,
  },

  // Critério do grupo, sem norma. Em % da capacidade sentada (a taxa do ocupacao.js).
  // Atenção acima de 50 %: a sala já parece cheia (Williams, 1996, citando um estudo
  // de biblioteca). Crítico acima de 90 %: praticamente lotada.
  // Faixa: baixa abaixo de 35 % (cerca de 1 pessoa por mesa), alta acima de 70 %.
  ocupacao: {
    unidade: '%',
    limiteBaixo: 35,
    limiteAlto: 70,
    criticoAbaixo: null, // sala vazia não é problema
    atencaoAbaixo: null,
    atencaoAcima: 50,
    criticoAcima: 90,
  },
}

/** O dB simulado do potenciômetro no começo da escala (critério do grupo, sem norma; PROVISÓRIO). */
export const RUIDO_DB_MIN = 30

/** O dB simulado do potenciômetro no fim da escala (critério do grupo, sem norma; PROVISÓRIO). */
export const RUIDO_DB_MAX = 80

/**
 * A faixa de valores que cada sensor consegue dar (PROVISÓRIO). Um valor fora dela não é
 * uma leitura de verdade, é erro de leitura (CONTEXTO, §5.4), e o normalizar.js troca por null.
 * Os dois lados contam como dentro (de minimo até maximo, incluindo os dois).
 */
export const LEITURA_POSSIVEL = {
  // A faixa de medida do DHT22 (AM2302) no datasheet do fabricante: de -40 a 80 °C.
  // Não conferida no Wokwi (a página do DHT22 do Wokwi não diz a faixa); o Edge confirma.
  temperatura: { minimo: -40, maximo: 80 },
  // Luz não é negativa. O máximo é o maior valor da tabela do fotorresistor do Wokwi
  // (100.000 lux, sol direto; docs.wokwi.com, "Photoresistor (LDR) Sensor Module").
  luz: { minimo: 0, maximo: 100000 },
  // A escala do potenciômetro: dB = 30 + leitura × 50 / 4095 dá sempre de 30 a 80.
  ruido: { minimo: RUIDO_DB_MIN, maximo: RUIDO_DB_MAX },
}
