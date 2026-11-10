import { describe, expect, it } from 'vitest'
import { classificarSala } from './classificacao.js'
import { montarSalaDemo, montarSalas } from './normalizar.js'
import { ATIVIDADES, PESOS, avaliarItem, ranquearItens } from './ranking.js'

// As nove salas como a tela recebe: a S01 sem leitura (tudo null, 'sem_leitura') e as oito
// fictícias do CONTEXTO, §7.6. "desatualizadas" diz quais ids estão com a leitura velha.
function itensDasNoveSalas(desatualizadas = []) {
  return montarSalas(null).map((sala) => ({
    sala,
    classificacao: classificarSala(sala),
    desatualizada: desatualizadas.includes(sala.id),
  }))
}

function avaliacaoDe(id, atividadeId, itens = itensDasNoveSalas()) {
  return avaliarItem(itens.find((item) => item.sala.id === id), atividadeId)
}

// Uma sala montada à mão, passando pelas mesmas funções das salas de verdade.
// Sem dizer nada, a leitura é toda adequada (22 °C, 410 lux estimado, 42 dB simulados).
function itemCom(id, mesas, leitura = {}, desatualizada = false) {
  const meta = { id, nome: `Sala ${id}`, porte: 'media', quantidadeMesas: mesas.length }
  const sala = montarSalaDemo(meta, {
    mesas,
    temperaturaC: 22,
    luz: { valor: 410, unidade: 'lux_estimado' },
    ruidoDb: 42,
    ...leitura,
  })
  return { sala, classificacao: classificarSala(sala), desatualizada }
}

describe('ATIVIDADES: os três atalhos', () => {
  it('são estudar sozinho, trabalho em grupo e gravar vídeo, nesta ordem', () => {
    expect(ATIVIDADES).toEqual([
      { id: 'sozinho', nome: 'Estudar sozinho', resumo: 'Um lugar vago, silêncio e conforto' },
      { id: 'grupo', nome: 'Trabalho em grupo', resumo: 'Mesa totalmente livre e ruído até 65 dB simulados' },
      { id: 'video', nome: 'Gravar vídeo', resumo: 'Mesa totalmente livre e silêncio até 45 dB simulados' },
    ])
  })
})

describe('PESOS (PROVISÓRIOS): quanto cada indicador vale em cada atalho', () => {
  it('são os da proposta da parte web', () => {
    expect(PESOS).toEqual({
      sozinho: { ruido: 40, temperatura: 20, luz: 20, ocupacao: 20 },
      grupo: { mesasLivres: 35, ocupacao: 25, ruido: 20, temperatura: 10, luz: 10 },
      video: { ruido: 35, mesasLivres: 35, ocupacao: 20, luz: 10 },
    })
  })

  it.each(['sozinho', 'grupo', 'video'])('os pesos de %s somam 100 (a pontuação vai de 0 a 100)', (atividadeId) => {
    const soma = Object.values(PESOS[atividadeId]).reduce((total, peso) => total + peso, 0)
    expect(soma).toBe(100)
  })

  it('há um peso para cada atalho', () => {
    expect(Object.keys(PESOS)).toEqual(ATIVIDADES.map((atividade) => atividade.id))
  })
})

// As contas abaixo foram feitas à mão, com a regra: adequado vale o peso inteiro, atenção a
// metade, crítico 0; ocupação = (1 − taxa/100) × peso; mesas livres = mín(vazias, 4) / 4 × peso (grupo e vídeo).
// Ex. (sozinho, S02): ruído 42 adequado 40 + temperatura 22 adequada 20 + luz 410 adequada 20
// + ocupação 2 de 6 (1 − 33,3 %) × 20 = 13,3 → 93,3 → 93.
describe('avaliarItem: estudar sozinho', () => {
  it.each([
    ['S02', 93], // 40 + 20 + 20 + 13,3
    ['S04', 73], // ruído 46 em atenção: 20 + 20 + 20 + 13,3
    ['S05', 67], // 20 + 20 + 20 + 6,7
    ['S06', 39], // 20 + temperatura 19 em atenção 10 + luz 180 crítica 0 + 8,9
    ['S07', 98], // 40 + 20 + 20 + 17,8
    ['S08', 70], // 20 + 20 + 20 + 10
    ['S09', 25], // ruído e temperatura críticos; luz 20 + três vagas 5
  ])('%s é elegível com %i pontos', (id, pontos) => {
    const avaliacao = avaliacaoDe(id, 'sozinho')
    expect(avaliacao.elegivel).toBe(true)
    expect(avaliacao.pontuacao).toBe(pontos)
    expect(avaliacao.eliminadaPor).toBeNull()
  })

  it('a S03 (as duas mesas com 3 pessoas) sai: sala lotada', () => {
    expect(avaliacaoDe('S03', 'sozinho')).toMatchObject({ elegivel: false, pontuacao: null, eliminadaPor: 'Sala lotada' })
  })

  it('a S01 sem leitura sai: sem leitura confiável', () => {
    expect(avaliacaoDe('S01', 'sozinho')).toMatchObject({
      elegivel: false,
      pontuacao: null,
      eliminadaPor: 'Sem leitura confiável',
    })
  })
})

describe('avaliarItem: trabalho em grupo (exige mesa com 0 pessoas, RN-06)', () => {
  it.each([
    ['S02', 65], // 8,75 + 16,67 + 20 + 10 + 10 = 65,42
    ['S05', 47], // 8,75 + 8,33 + 10 + 10 + 10 = 47,08
    ['S07', 80], // 17,5 + 22,22 + 20 + 10 + 10 = 79,72
    ['S08', 51], // 8,75 + 12,5 + 10 + 10 + 10 = 51,25
  ])('%s é elegível com %i pontos', (id, pontos) => {
    expect(avaliacaoDe(id, 'grupo')).toMatchObject({ elegivel: true, pontuacao: pontos, eliminadaPor: null })
  })

  it.each(['S03', 'S04', 'S06'])('%s sai: nenhuma mesa totalmente livre', (id) => {
    expect(avaliacaoDe(id, 'grupo')).toMatchObject({
      elegivel: false,
      pontuacao: null,
      eliminadaPor: 'Nenhuma mesa totalmente livre',
    })
  })

  it('a S09 tem mesa livre, mas excede o limite de ruído para grupo', () => {
    expect(avaliacaoDe('S09', 'grupo').eliminadaPor).toBe('Ruído acima de 65 dB simulados para trabalhar em grupo')
  })

  it('a S04 tem 6 lugares vagos, mas espalhados em mesas com gente: não serve para grupo', () => {
    const s04 = itensDasNoveSalas().find((item) => item.sala.id === 'S04')
    expect(s04.classificacao.ocupacao.vagas).toBe(6)
    expect(avaliarItem(s04, 'grupo').elegivel).toBe(false)
  })

  it.each(['grupo', 'video'])('%s: com mesma ocupação, a terceira mesa livre aumenta a nota', (atividade) => {
    const duas = avaliarItem(itemCom('S77', [0, 0, 1, 2]), atividade)
    const tres = avaliarItem(itemCom('S78', [0, 0, 0, 3]), atividade)
    expect(tres.pontuacao).toBeGreaterThan(duas.pontuacao)
  })

  it('a S01 sem leitura sai por falta de leitura (isso vem antes da mesa livre)', () => {
    expect(avaliacaoDe('S01', 'grupo').eliminadaPor).toBe('Sem leitura confiável')
  })
})

describe('avaliarItem: gravar vídeo', () => {
  it.each([
    ['S02', 39], // ruído (45−42)/15×35 = 7; mesas 8,75; vagas 13,33; luz 10
    ['S07', 59], // ruído (45−39)/15×35 = 14; mesas 17,5; vagas 17,78; luz 10
  ])('%s é elegível com %i pontos', (id, pontos) => {
    expect(avaliacaoDe(id, 'video')).toMatchObject({ elegivel: true, pontuacao: pontos, eliminadaPor: null })
  })

  it.each(['S03', 'S04', 'S06'])('%s não possui mesa totalmente livre', (id) => {
    expect(avaliacaoDe(id, 'video')).toMatchObject({ elegivel: false, pontuacao: null, eliminadaPor: 'Nenhuma mesa totalmente livre' })
  })

  it.each(['S05', 'S08', 'S09'])('%s tem mesa, mas não atende ao silêncio', (id) => {
    expect(avaliacaoDe(id, 'video').eliminadaPor).toBe('Ruído acima de 45 dB simulados para gravar')
  })

  it.each([
    ['video', 45, true], ['video', 45.1, false],
    ['grupo', 65, true], ['grupo', 65.1, false],
  ])('%s: ruído %s tem elegibilidade %s (limite inclusivo)', (atividade, ruidoDb, elegivel) => {
    expect(avaliarItem(itemCom('S77', [0, 1, 1], { ruidoDb }), atividade).elegivel).toBe(elegivel)
  })

  it('55 dB com mesa livre serve para grupo, mas não para vídeo', () => {
    const item = itemCom('S77', [0, 1, 1], { ruidoDb: 55 })
    expect(avaliarItem(item, 'grupo').elegivel).toBe(true)
    expect(avaliarItem(item, 'video').elegivel).toBe(false)
  })

  it('silêncio e mesas têm o mesmo peso, e temperatura vale zero', () => {
    expect(PESOS.video.ruido).toBe(PESOS.video.mesasLivres)
    expect(PESOS.video.temperatura ?? 0).toBe(0)
  })

  it('dentro do limite, menos ruído aumenta a pontuação de vídeo', () => {
    const silenciosa = avaliarItem(itemCom('S77', [0, 1, 1], { ruidoDb: 35 }), 'video')
    const limite = avaliarItem(itemCom('S77', [0, 1, 1], { ruidoDb: 45 }), 'video')
    expect(silenciosa.pontuacao).toBeGreaterThan(limite.pontuacao)
  })

  it('temperaturas válidas frias ou quentes não alteram elegibilidade, nota nem motivos do vídeo', () => {
    const avaliacoes = [10, 22, 35].map((temperaturaC) => avaliarItem(itemCom('S77', [0, 1, 1], { temperaturaC }), 'video'))
    expect(avaliacoes[1]).toEqual(avaliacoes[0])
    expect(avaliacoes[2]).toEqual(avaliacoes[0])
  })

  it('menor ocupação melhora a nota mesmo com o mesmo número de mesas livres', () => {
    const menos = avaliarItem(itemCom('S77', [0, 1, 1]), 'video')
    const mais = avaliarItem(itemCom('S78', [0, 2, 2]), 'video')
    expect(menos.pontuacao).toBeGreaterThan(mais.pontuacao)
  })
})

describe('avaliarItem: casos gerais', () => {
  it('uma sala com status de erro do ESP32 (ex.: offline) sai, mesmo com valores', () => {
    const meta = { id: 'S01', nome: 'Sala de Estudo 01', porte: 'media', quantidadeMesas: 3 }
    const sala = { ...montarSalaDemo(meta, { mesas: [0, 0, 0], temperaturaC: 22, luz: { valor: 410, unidade: 'lux_estimado' }, ruidoDb: 42 }), statusDispositivo: 'offline' }
    const item = { sala, classificacao: classificarSala(sala), desatualizada: false }
    expect(avaliarItem(item, 'sozinho').eliminadaPor).toBe('Sem leitura confiável')
  })

  it('a pontuação é sempre um número inteiro de 0 a 100', () => {
    const itens = [...itensDasNoveSalas(), itemCom('S77', [0, 0, 0]), itemCom('S78', [3, 3, 2], { ruidoDb: 70, temperaturaC: 30, luz: { valor: 100, unidade: 'lux_estimado' } })]
    for (const atividade of ATIVIDADES) {
      for (const item of itens) {
        const { pontuacao } = avaliarItem(item, atividade.id)
        if (pontuacao !== null) {
          expect(Number.isInteger(pontuacao)).toBe(true)
          expect(pontuacao).toBeGreaterThanOrEqual(0)
          expect(pontuacao).toBeLessThanOrEqual(100)
        }
      }
    }
  })

  it('a sala perfeita (vazia e tudo adequado) faz 100 em todos os atalhos', () => {
    const perfeita = itemCom('S77', [0, 0, 0, 0], { ruidoDb: 30 })
    expect(avaliarItem(perfeita, 'sozinho').pontuacao).toBe(100)
    expect(avaliarItem(perfeita, 'grupo').pontuacao).toBe(100)
    expect(avaliarItem(perfeita, 'video').pontuacao).toBe(100)
  })

  it('um item quebrado (sem classificação) sai por falta de leitura, sem lançar erro', () => {
    expect(avaliarItem({}, 'sozinho').eliminadaPor).toBe('Sem leitura confiável')
    expect(avaliarItem(null, 'grupo').eliminadaPor).toBe('Sem leitura confiável')
  })

  it('um atalho que não existe é erro de quem programou', () => {
    expect(() => avaliarItem(itensDasNoveSalas()[1], 'festa')).toThrow(/Atividade desconhecida/)
    expect(() => avaliarItem(itensDasNoveSalas()[1], 'toString')).toThrow(/Atividade desconhecida/)
  })
})

describe('avaliarItem: os motivos (o porquê da nota, em frases curtas)', () => {
  it('estudar sozinho, S02: ruído, lugares vagos, temperatura e luz, com as unidades', () => {
    expect(avaliacaoDe('S02', 'sozinho').motivos).toEqual([
      'Silenciosa (42 dB simulados)',
      '4 lugares vagos',
      'Temperatura confortável (22 °C)',
      'Boa iluminação (410 lux estimado)',
    ])
  })

  it('estudar sozinho, S09: o que está ruim também aparece, e três lugares vagos', () => {
    expect(avaliacaoDe('S09', 'sozinho').motivos).toEqual([
      'Barulhenta (68 dB simulados)',
      '3 lugares vagos',
      'Quente demais (28 °C)',
      'Boa iluminação (760 lux estimado)',
    ])
  })

  it('trabalho em grupo, S07: mesas livres primeiro, depois a ocupação', () => {
    expect(avaliacaoDe('S07', 'grupo').motivos).toEqual([
      '2 mesas totalmente livres',
      '1 de 9 lugares ocupados',
      'Silenciosa (39 dB simulados)',
      'Temperatura confortável (23 °C)',
    ])
  })

  it('trabalho em grupo, S02: "1 mesa totalmente livre" no singular', () => {
    expect(avaliacaoDe('S02', 'grupo').motivos).toEqual([
      '1 mesa totalmente livre',
      '2 de 6 lugares ocupados',
      'Silenciosa (42 dB simulados)',
      'Temperatura confortável (22 °C)',
    ])
  })

  it('trabalho em grupo numa sala vazia: "Sala vazia"', () => {
    expect(avaliarItem(itemCom('S77', [0, 0, 0]), 'grupo').motivos[1]).toBe('Sala vazia')
  })

  it('gravar vídeo, S07: silêncio, mesas livres, ocupação e luz, sem temperatura', () => {
    expect(avaliacaoDe('S07', 'video').motivos).toEqual([
      'Silenciosa (39 dB simulados)', '2 mesas totalmente livres',
      '1 de 9 lugares ocupados', 'Boa iluminação (450 lux estimado)',
    ])
  })

  it.each([
    [{ temperaturaC: 22.8 }, 2, 'Temperatura confortável (22,8 °C)'],
    [{ temperaturaC: 25.5 }, 2, 'Um pouco quente (25,5 °C)'],
    [{ temperaturaC: 17 }, 2, 'Fria demais (17 °C)'],
    [{ luz: { valor: 250, unidade: 'lux_estimado' } }, 3, 'Pouca luz (250 lux estimado)'],
    [{ luz: { valor: 2500, unidade: 'lux_estimado' } }, 3, 'Luz forte (2500 lux estimado)'],
    [{ luz: { valor: 3500, unidade: 'lux_estimado' } }, 3, 'Clara demais (3500 lux estimado)'],
  ])('a frase de cada caso: %j', (leitura, posicao, frase) => {
    // No sozinho: [ruído, vagas, temperatura, luz]; posição 2 = temperatura, 3 = luz.
    expect(avaliarItem(itemCom('S77', [0, 1, 1], leitura), 'sozinho').motivos[posicao]).toBe(frase)
  })

  it('toda sala que entra tem de 2 a 4 motivos, em todos os atalhos', () => {
    for (const atividade of ATIVIDADES) {
      for (const item of itensDasNoveSalas(['S07'])) {
        const avaliacao = avaliarItem(item, atividade.id)
        if (avaliacao.elegivel) {
          expect(avaliacao.motivos.length).toBeGreaterThanOrEqual(2)
          expect(avaliacao.motivos.length).toBeLessThanOrEqual(4)
        }
      }
    }
  })

  it('a sala que saiu não tem motivos: o porquê está no eliminadaPor', () => {
    expect(avaliacaoDe('S03', 'sozinho').motivos).toEqual([])
  })
})

describe('avaliarItem: leitura desatualizada (CONTEXTO, §7.5; RN-11)', () => {
  it('continua elegível, perde 15 pontos e avisa no primeiro motivo', () => {
    const avaliacao = avaliacaoDe('S07', 'sozinho', itensDasNoveSalas(['S07']))
    expect(avaliacao.elegivel).toBe(true)
    expect(avaliacao.pontuacao).toBe(98 - 15)
    expect(avaliacao.motivos).toEqual([
      'Leitura desatualizada',
      'Silenciosa (39 dB simulados)',
      '8 lugares vagos',
      'Temperatura confortável (23 °C)',
    ])
  })

  it('perde 15 em todos os atalhos (grupo: 80 → 65; vídeo: 59 → 44)', () => {
    const itens = itensDasNoveSalas(['S07'])
    expect(avaliacaoDe('S07', 'grupo', itens).pontuacao).toBe(65)
    expect(avaliacaoDe('S07', 'video', itens).pontuacao).toBe(44)
  })

  it('a nota não fica negativa: o mínimo é 0', () => {
    // Tudo crítico e 1 lugar vago em 9: 20 × 1/9 = 2,2 → 2; menos 15 daria −13.
    const ruim = itemCom('S77', [3, 3, 2], { ruidoDb: 70, temperaturaC: 30, luz: { valor: 100, unidade: 'lux_estimado' } }, true)
    expect(avaliarItem(ruim, 'sozinho')).toMatchObject({ elegivel: true, pontuacao: 0 })
  })

  it('a desatualizada sem leitura continua fora (a falta de leitura vem antes)', () => {
    const avaliacao = avaliacaoDe('S01', 'sozinho', itensDasNoveSalas(['S01']))
    expect(avaliacao).toEqual({ elegivel: false, pontuacao: null, motivos: [], eliminadaPor: 'Sem leitura confiável' })
  })
})

const ids = (lista) => lista.map((item) => item.sala.id)
const posicoes = (lista) => lista.map((item) => item.posicao)

describe('ranquearItens: sem atalho escolhido', () => {
  it('com atividade null, a ordem é a de entrada (S01 a S09), sem posição e sem avaliação', () => {
    const resultado = ranquearItens(itensDasNoveSalas(), null)
    expect(ids(resultado)).toEqual(['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09'])
    expect(resultado.every((item) => item.posicao === null && item.avaliacao === null)).toBe(true)
  })

  it('undefined funciona como null', () => {
    expect(ids(ranquearItens(itensDasNoveSalas(), undefined))).toEqual(ids(itensDasNoveSalas()))
  })
})

describe('ranquearItens: com um atalho (as oito salas demo e a S01 sem leitura)', () => {
  it('estudar sozinho: elegíveis pela nota (98, 93, 73, 70, 67, 39, 25), depois as que saíram, por id', () => {
    const resultado = ranquearItens(itensDasNoveSalas(), 'sozinho')
    expect(ids(resultado)).toEqual(['S07', 'S02', 'S04', 'S08', 'S05', 'S06', 'S09', 'S01', 'S03'])
    expect(posicoes(resultado)).toEqual([1, 2, 3, 4, 5, 6, 7, null, null])
    expect(resultado.map((item) => item.avaliacao.pontuacao)).toEqual([98, 93, 73, 70, 67, 39, 25, null, null])
  })

  it('trabalho em grupo: S07, S02, S08, S05; as sem mesa ou com ruído excessivo ficam no fim', () => {
    const resultado = ranquearItens(itensDasNoveSalas(), 'grupo')
    expect(ids(resultado)).toEqual(['S07', 'S02', 'S08', 'S05', 'S01', 'S03', 'S04', 'S06', 'S09'])
    expect(posicoes(resultado)).toEqual([1, 2, 3, 4, null, null, null, null, null])
  })

  it('trabalho em grupo nunca põe como elegível uma sala sem mesa vazia (RN-06)', () => {
    const resultado = ranquearItens(itensDasNoveSalas(), 'grupo')
    for (const item of resultado) {
      if (item.avaliacao.elegivel) {
        expect(item.classificacao.ocupacao.mesasVazias).toBeGreaterThanOrEqual(1)
      }
    }
    const semMesaVazia = resultado.filter((item) => ['S03', 'S04', 'S06'].includes(item.sala.id))
    expect(semMesaVazia).toHaveLength(3)
    for (const item of semMesaVazia) {
      expect(item.posicao).toBeNull()
      expect(item.avaliacao.eliminadaPor).toBe('Nenhuma mesa totalmente livre')
    }
  })

  it('gravar vídeo: somente S07 e S02 são elegíveis nos seeds iniciais', () => {
    const resultado = ranquearItens(itensDasNoveSalas(), 'video')
    expect(ids(resultado)).toEqual(['S07', 'S02', 'S01', 'S03', 'S04', 'S05', 'S06', 'S08', 'S09'])
    expect(posicoes(resultado)).toEqual([1, 2, null, null, null, null, null, null, null])
  })

  it.each(['sozinho', 'grupo', 'video'])('%s: a S01 sem leitura fica no fim, sem posição, com "Sem leitura confiável"', (atividadeId) => {
    const resultado = ranquearItens(itensDasNoveSalas(), atividadeId)
    const elegiveis = resultado.filter((item) => item.avaliacao.elegivel).length
    const indiceDaS01 = ids(resultado).indexOf('S01')
    expect(indiceDaS01).toBeGreaterThanOrEqual(elegiveis)
    expect(resultado[indiceDaS01].posicao).toBeNull()
    expect(resultado[indiceDaS01].avaliacao.eliminadaPor).toBe('Sem leitura confiável')
  })

  it('a desatualizada perde 15 e cai na ordem: S07 (98 → 83) passa a ficar atrás da S02 (93)', () => {
    const resultado = ranquearItens(itensDasNoveSalas(['S07']), 'sozinho')
    expect(ids(resultado).slice(0, 3)).toEqual(['S02', 'S07', 'S04'])
    expect(resultado[1].avaliacao.pontuacao).toBe(83)
    expect(resultado[1].posicao).toBe(2)
  })
})

describe('ranquearItens: determinístico (RN-15)', () => {
  it.each(['sozinho', 'grupo', 'video'])('%s: a ordem não depende da ordem de entrada', (atividadeId) => {
    const normal = ranquearItens(itensDasNoveSalas(), atividadeId)
    const invertida = ranquearItens([...itensDasNoveSalas()].reverse(), atividadeId)
    const ordemMisturada = ['S05', 'S01', 'S09', 'S03', 'S07', 'S02', 'S08', 'S04', 'S06']
    const misturada = ranquearItens(
      ordemMisturada.map((id) => itensDasNoveSalas().find((item) => item.sala.id === id)),
      atividadeId,
    )
    expect(ids(invertida)).toEqual(ids(normal))
    expect(ids(misturada)).toEqual(ids(normal))
    expect(posicoes(invertida)).toEqual(posicoes(normal))
  })

  it('a mesma entrada dá sempre o mesmo resultado', () => {
    expect(ranquearItens(itensDasNoveSalas(), 'grupo')).toEqual(ranquearItens(itensDasNoveSalas(), 'grupo'))
  })
})

describe('ranquearItens: desempate (mesma nota)', () => {
  it('1º desempate: menor taxa de ocupação vem antes, mesmo com menos mesas livres', () => {
    // Vídeo: S09 = 7 + 8,75 + 15,56 + 10 = 41,31 → 41.
    // S02 = 0 + 17,5 + 13,33 + 10 = 40,83 → 41.
    const menosCheia = itemCom('S09', [0, 1, 1], { ruidoDb: 42 })
    const maisCheia = itemCom('S02', [0, 0, 3], { ruidoDb: 45 })
    const resultado = ranquearItens([maisCheia, menosCheia], 'video')
    expect(resultado.map((item) => item.avaliacao.pontuacao)).toEqual([41, 41])
    expect(ids(resultado)).toEqual(['S09', 'S02'])
  })

  it('2º desempate: com a mesma nota e taxa, mais mesas livres vem antes', () => {
    // Vídeo: 3 vazias a 42 dB = 26,25 + 7 + 15 + 10 = 58,25.
    // 2 vazias a 38,25 dB = 17,5 + 15,75 + 15 + 10 = 58,25.
    const tresVazias = itemCom('S08', [0, 0, 0, 3], { ruidoDb: 42 })
    const duasVazias = itemCom('S03', [0, 0, 1, 2], { ruidoDb: 38.25 })
    const resultado = ranquearItens([duasVazias, tresVazias], 'video')
    expect(resultado.map((item) => item.avaliacao.pontuacao)).toEqual([58, 58])
    expect(ids(resultado)).toEqual(['S08', 'S03'])
  })

  it('3º desempate: tudo igual, vem antes o menor id', () => {
    const resultado = ranquearItens([itemCom('S05', [0, 1, 1]), itemCom('S04', [0, 1, 1])], 'sozinho')
    expect(ids(resultado)).toEqual(['S04', 'S05'])
    expect(posicoes(resultado)).toEqual([1, 2])
  })
})

describe('ranquearItens: o formato da saída', () => {
  it('cada item sai com tudo o que tinha, mais a avaliação e a posição', () => {
    const [primeiro] = ranquearItens(itensDasNoveSalas(), 'sozinho')
    expect(Object.keys(primeiro).sort()).toEqual(['avaliacao', 'classificacao', 'desatualizada', 'posicao', 'sala'])
    expect(primeiro.avaliacao).toEqual(avaliacaoDe('S07', 'sozinho'))
  })

  it('não muda a lista recebida nem os itens', () => {
    const itens = itensDasNoveSalas()
    const copia = structuredClone(itens)
    const resultado = ranquearItens(itens, 'grupo')
    expect(resultado).not.toBe(itens)
    expect(itens).toEqual(copia)
    expect(ranquearItens(itens, null)).not.toBe(itens)
  })

  it('sem lista, devolve uma lista vazia', () => {
    expect(ranquearItens(null, 'sozinho')).toEqual([])
    expect(ranquearItens(undefined, null)).toEqual([])
  })

  it('um atalho que não existe é erro de quem programou', () => {
    expect(() => ranquearItens(itensDasNoveSalas(), 'festa')).toThrow(/Atividade desconhecida/)
  })
})
