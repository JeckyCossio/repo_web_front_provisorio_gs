import { describe, expect, it } from 'vitest'
import { classificarSala } from './classificacao.js'
import { FILTROS_VAZIOS, contarFiltrosAtivos, filtrarItens, itemPassaNosFiltros, valorDoFiltro } from './filtros.js'
import { montarSalaDemo, montarSalas } from './normalizar.js'

// As nove salas como a tela recebe: a S01 sem leitura (tudo null, 'sem_leitura') e as oito
// fictícias do data/salas.js. Os valores esperados abaixo vêm da tabela do CONTEXTO, §7.6:
//   sala  total  mesa vazia  temperatura  luz  ruído
//   S02     2       sim          22       410    42
//   S03     6       não          18       920    71
//   S04     3       não          21       500    46
//   S05     6       sim          24       350    57
//   S06     5       não          19       180    61
//   S07     1       sim          23       450    39
//   S08     6       sim          25       600    53
//   S09    9        sim          28       760    68
function itensDasNoveSalas() {
  return montarSalas(null).map((sala) => ({ sala, classificacao: classificarSala(sala), desatualizada: false }))
}

// Uma sala montada à mão, passando pelas mesmas funções das salas de verdade.
function itemCom(id, mesas, leitura = {}) {
  const meta = { id, nome: `Sala ${id}`, porte: 'media', quantidadeMesas: mesas.length }
  const sala = montarSalaDemo(meta, {
    mesas,
    temperaturaC: 22,
    luz: { valor: 410, unidade: 'lux_estimado' },
    ruidoDb: 42,
    ...leitura,
  })
  return { sala, classificacao: classificarSala(sala), desatualizada: false }
}

// Os ids das salas que passaram, na ordem em que saíram.
function idsQuePassam(filtros, favoritos) {
  return filtrarItens(itensDasNoveSalas(), { ...FILTROS_VAZIOS, ...filtros }, favoritos).map((item) => item.sala.id)
}

const TODAS = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09']

describe('FILTROS_VAZIOS: nenhum filtro ligado', () => {
  it('tem os quatro intervalos sem limite e as duas opções desligadas', () => {
    expect(FILTROS_VAZIOS).toEqual({
      ocupacaoMin: null,
      ocupacaoMax: null,
      temperaturaMin: null,
      temperaturaMax: null,
      luzMin: null,
      luzMax: null,
      ruidoMin: null,
      ruidoMax: null,
      exigirMesaLivre: false,
      somenteFavoritas: false,
    })
  })

  it('filtrar com uma cópia alterada preserva os valores de limpar filtros', () => {
    const filtros = { ...FILTROS_VAZIOS, temperaturaMin: 20 }
    filtrarItens(montarSalas(null), filtros)
    expect(FILTROS_VAZIOS.temperaturaMin).toBeNull()
    expect(contarFiltrosAtivos(FILTROS_VAZIOS)).toBe(0)
  })
})

describe('contarFiltrosAtivos: quantos filtros estão ligados (o número no botão)', () => {
  it('sem filtro nenhum, 0', () => {
    expect(contarFiltrosAtivos(FILTROS_VAZIOS)).toBe(0)
  })

  it('cada limite preenchido conta 1, e o mínimo e o máximo do mesmo intervalo contam 2', () => {
    expect(contarFiltrosAtivos({ ...FILTROS_VAZIOS, temperaturaMin: 20 })).toBe(1)
    expect(contarFiltrosAtivos({ ...FILTROS_VAZIOS, temperaturaMin: 20, temperaturaMax: 24 })).toBe(2)
  })

  it('o limite 0 é um limite de verdade (ex.: ocupação máxima 0 = só salas vazias)', () => {
    expect(contarFiltrosAtivos({ ...FILTROS_VAZIOS, ocupacaoMax: 0 })).toBe(1)
  })

  it('cada opção marcada conta 1', () => {
    expect(contarFiltrosAtivos({ ...FILTROS_VAZIOS, exigirMesaLivre: true })).toBe(1)
    expect(contarFiltrosAtivos({ ...FILTROS_VAZIOS, exigirMesaLivre: true, somenteFavoritas: true })).toBe(2)
  })

  it('com tudo ligado, 10', () => {
    const tudo = {
      ocupacaoMin: 0, ocupacaoMax: 6, temperaturaMin: 20, temperaturaMax: 24, luzMin: 300,
      luzMax: 750, ruidoMin: 30, ruidoMax: 45, exigirMesaLivre: true, somenteFavoritas: true,
    }
    expect(contarFiltrosAtivos(tudo)).toBe(10)
  })

  it.each([
    ['texto vazio', ''],
    ['texto com número', '20'],
    ['NaN', NaN],
    ['undefined', undefined],
  ])('um limite que não é número (%s) não filtra, então não conta', (_descricao, valor) => {
    expect(contarFiltrosAtivos({ ...FILTROS_VAZIOS, luzMin: valor })).toBe(0)
  })

  it('só o true conta como opção marcada', () => {
    expect(contarFiltrosAtivos({ ...FILTROS_VAZIOS, exigirMesaLivre: 'sim', somenteFavoritas: 1 })).toBe(0)
  })

  it('sem objeto de filtros (null ou undefined), 0', () => {
    expect(contarFiltrosAtivos(null)).toBe(0)
    expect(contarFiltrosAtivos(undefined)).toBe(0)
  })
})

describe('filtrarItens: as nove salas com os filtros do painel', () => {
  it('sem filtro, passam as nove, na mesma ordem (até a S01 sem leitura)', () => {
    expect(idsQuePassam({})).toEqual(TODAS)
  })

  it('sem objeto de filtros (null), também passam as nove', () => {
    expect(filtrarItens(itensDasNoveSalas(), null).map((item) => item.sala.id)).toEqual(TODAS)
  })

  // RN-14: os dois lados do intervalo contam como dentro.
  it('ocupação de 3 a 6 pessoas inclui o 3 e o 6', () => {
    expect(idsQuePassam({ ocupacaoMin: 3, ocupacaoMax: 6 })).toEqual(['S03', 'S04', 'S05', 'S06', 'S08'])
  })

  it('ocupação por valor exato: mínimo e máximo iguais (3 pessoas)', () => {
    expect(idsQuePassam({ ocupacaoMin: 3, ocupacaoMax: 3 })).toEqual(['S04'])
  })

  it('ocupação máxima 0 deixa só sala vazia (o 0 é um limite de verdade)', () => {
    expect(idsQuePassam({ ocupacaoMax: 0 })).toEqual([])
    const vazia = itemCom('S77', [0, 0, 0])
    expect(itemPassaNosFiltros(vazia, { ...FILTROS_VAZIOS, ocupacaoMax: 0 })).toBe(true)
  })

  it('temperatura de 21 a 23 °C inclui as bordas', () => {
    expect(idsQuePassam({ temperaturaMin: 21, temperaturaMax: 23 })).toEqual(['S02', 'S04', 'S07'])
  })

  it('luz de 300 a 500 lux estimado inclui o 500', () => {
    expect(idsQuePassam({ luzMin: 300, luzMax: 500 })).toEqual(['S02', 'S04', 'S05', 'S07'])
  })

  it('só o máximo do ruído (até 45 dB simulados)', () => {
    expect(idsQuePassam({ ruidoMax: 45 })).toEqual(['S02', 'S07'])
  })

  it('só o mínimo do ruído (a partir de 61 dB simulados, inclusive)', () => {
    expect(idsQuePassam({ ruidoMin: 61 })).toEqual(['S03', 'S06', 'S09'])
  })

  it('mínimo maior que o máximo: os dois são trocados (23 a 21 vira 21 a 23)', () => {
    expect(idsQuePassam({ temperaturaMin: 23, temperaturaMax: 21 })).toEqual(['S02', 'S04', 'S07'])
  })

  it('vários filtros juntos: a sala precisa passar em todos', () => {
    expect(idsQuePassam({ temperaturaMin: 21, temperaturaMax: 25, ruidoMax: 50 })).toEqual(['S02', 'S04', 'S07'])
    expect(idsQuePassam({ temperaturaMin: 21, temperaturaMax: 25, ruidoMax: 50, exigirMesaLivre: true })).toEqual(['S02', 'S07'])
  })

  it('um limite que não é número (texto, NaN) não filtra', () => {
    expect(idsQuePassam({ luzMin: '', ruidoMax: NaN, temperaturaMin: '20' })).toEqual(TODAS)
  })

  it('devolve uma lista nova e não muda a lista recebida', () => {
    const itens = itensDasNoveSalas()
    const copia = structuredClone(itens)
    const resultado = filtrarItens(itens, { ...FILTROS_VAZIOS, ruidoMax: 45 })
    expect(resultado).not.toBe(itens)
    expect(itens).toEqual(copia)
    // Os itens que passam são os mesmos objetos: a tela continua usando a mesma sala.
    expect(resultado[0]).toBe(itens[1])
  })

  it('sem lista (null ou undefined), devolve uma lista vazia', () => {
    expect(filtrarItens(null, FILTROS_VAZIOS)).toEqual([])
    expect(filtrarItens(undefined, FILTROS_VAZIOS)).toEqual([])
  })
})

describe('itemPassaNosFiltros: mesa totalmente livre (RN-06)', () => {
  it('só passam as salas com pelo menos uma mesa com 0 pessoas', () => {
    expect(idsQuePassam({ exigirMesaLivre: true })).toEqual(['S02', 'S05', 'S07', 'S08', 'S09'])
  })

  it('mesa parcialmente ocupada não conta como livre, mesmo com muitos lugares vagos', () => {
    // [1, 1, 1]: 6 lugares vagos, mas nenhuma mesa vazia.
    const s04 = itensDasNoveSalas().find((item) => item.sala.id === 'S04')
    expect(s04.classificacao.ocupacao.vagas).toBe(6)
    expect(itemPassaNosFiltros(s04, { ...FILTROS_VAZIOS, exigirMesaLivre: true })).toBe(false)
  })
})

describe('itemPassaNosFiltros: sala sem o valor (null)', () => {
  const s01SemLeitura = itensDasNoveSalas()[0]

  it('sem filtro, a S01 sem leitura aparece (a tela mostra o aviso)', () => {
    expect(itemPassaNosFiltros(s01SemLeitura, FILTROS_VAZIOS)).toBe(true)
  })

  it.each([
    ['ocupação', { ocupacaoMin: 0 }],
    ['temperatura', { temperaturaMax: 40 }],
    ['luz', { luzMin: 0 }],
    ['ruído', { ruidoMax: 80 }],
    ['mesa livre', { exigirMesaLivre: true }],
  ])('com filtro de %s ligado, a sala sem esse valor NÃO passa', (_descricao, filtros) => {
    expect(itemPassaNosFiltros(s01SemLeitura, { ...FILTROS_VAZIOS, ...filtros })).toBe(false)
  })

  it('luz em outra unidade (sem limiares) não é comparada com lux: não passa no filtro de luz', () => {
    const outraUnidade = itemCom('S77', [0, 1, 1], { luz: { valor: 410, unidade: 'indice' } })
    expect(itemPassaNosFiltros(outraUnidade, { ...FILTROS_VAZIOS, luzMin: 300, luzMax: 500 })).toBe(false)
    // Os outros filtros continuam funcionando para ela.
    expect(itemPassaNosFiltros(outraUnidade, { ...FILTROS_VAZIOS, ruidoMax: 45 })).toBe(true)
  })

  it('não lança erro com um item quebrado', () => {
    expect(itemPassaNosFiltros(null, FILTROS_VAZIOS)).toBe(true)
    expect(itemPassaNosFiltros({}, { ...FILTROS_VAZIOS, ruidoMax: 45 })).toBe(false)
    expect(itemPassaNosFiltros({ sala: {} }, { ...FILTROS_VAZIOS, somenteFavoritas: true }, ['S01'])).toBe(false)
  })
})

describe('itemPassaNosFiltros: somente favoritas', () => {
  it('só passam as salas que estão nos favoritos, na ordem das salas', () => {
    expect(idsQuePassam({ somenteFavoritas: true }, ['S07', 'S01'])).toEqual(['S01', 'S07'])
  })

  it('sem favoritos, nenhuma sala passa', () => {
    expect(idsQuePassam({ somenteFavoritas: true }, [])).toEqual([])
    expect(idsQuePassam({ somenteFavoritas: true })).toEqual([])
  })

  it('com a opção desligada, os favoritos não mudam nada', () => {
    expect(idsQuePassam({ somenteFavoritas: false }, ['S07'])).toEqual(TODAS)
  })

  it('favoritos que não são uma lista contam como nenhum', () => {
    expect(idsQuePassam({ somenteFavoritas: true }, 'S07')).toEqual([])
  })

  it('junto com outro filtro: favorita E dentro do intervalo', () => {
    expect(idsQuePassam({ somenteFavoritas: true, ruidoMax: 45 }, ['S03', 'S07'])).toEqual(['S07'])
  })
})

describe('valorDoFiltro: o que veio do campo da tela vira o valor do filtro', () => {
  // O PainelFiltros manda o evento.target.value, que é sempre TEXTO (até no campo type="number").
  it('campo apagado (texto vazio) quer dizer "sem limite"', () => {
    expect(valorDoFiltro('ruidoMax', '')).toBe(null)
  })

  it('texto com um número vira o número', () => {
    expect(valorDoFiltro('ocupacaoMin', '3')).toBe(3)
    expect(valorDoFiltro('temperaturaMax', '22.5')).toBe(22.5)
  })

  it('o zero é um limite de verdade (não pode virar "sem limite")', () => {
    expect(valorDoFiltro('ocupacaoMax', '0')).toBe(0)
  })
})

describe('valorDoFiltro: texto que não é um número quer dizer "sem limite"', () => {
  it('só espaços (o Number("  ") daria 0 e ligaria o filtro sem a pessoa querer)', () => {
    expect(valorDoFiltro('luzMin', '   ')).toBe(null)
  })

  it('letras, um sinal sozinho ou um número pela metade', () => {
    expect(valorDoFiltro('luzMin', 'abc')).toBe(null)
    expect(valorDoFiltro('temperaturaMin', '-')).toBe(null) // a pessoa começou a digitar "-5"
    expect(valorDoFiltro('temperaturaMin', '22.')).toBe(null)
    expect(valorDoFiltro('temperaturaMin', '22.5.1')).toBe(null)
  })

  it('formatos que ninguém digita num filtro: hexadecimal, notação científica e infinito', () => {
    expect(valorDoFiltro('luzMax', '0x10')).toBe(null)
    expect(valorDoFiltro('luzMax', '1e3')).toBe(null)
    expect(valorDoFiltro('luzMax', 'Infinity')).toBe(null)
  })

  it('aceita espaços em volta, o número negativo e a vírgula do jeito brasileiro', () => {
    expect(valorDoFiltro('ruidoMin', ' 45 ')).toBe(45)
    expect(valorDoFiltro('temperaturaMin', '-3')).toBe(-3)
    expect(valorDoFiltro('temperaturaMin', '22,5')).toBe(22.5)
  })

  it('um número com centenas de dígitos (daria infinito) vira "sem limite"', () => {
    expect(valorDoFiltro('luzMax', '9'.repeat(400))).toBe(null)
  })

  it('um número que já chega como número continua o mesmo; NaN e infinito viram "sem limite"', () => {
    expect(valorDoFiltro('ocupacaoMin', 4)).toBe(4)
    expect(valorDoFiltro('ocupacaoMin', Number.NaN)).toBe(null)
    expect(valorDoFiltro('ocupacaoMin', Infinity)).toBe(null)
  })

  it('null, undefined ou outra coisa que não é texto nem número viram "sem limite"', () => {
    expect(valorDoFiltro('ruidoMax', null)).toBe(null)
    expect(valorDoFiltro('ruidoMax', undefined)).toBe(null)
    expect(valorDoFiltro('ruidoMax', true)).toBe(null)
    expect(valorDoFiltro('ruidoMax', ['40'])).toBe(null)
  })

  it('o valor que sai sempre conta (ou não) do mesmo jeito no contarFiltrosAtivos', () => {
    const filtros = { ...FILTROS_VAZIOS, ruidoMax: valorDoFiltro('ruidoMax', '  '), luzMin: valorDoFiltro('luzMin', '0') }
    expect(contarFiltrosAtivos(filtros)).toBe(1) // só o 0 da luz
  })
})

describe('valorDoFiltro: o ponto dos milhares, do jeito brasileiro', () => {
  // Na luz, que vai até 100.000 lux, a pessoa escreve "1.000" para mil. O campo type="number"
  // manda esse texto como veio, e lido como decimal ele viraria 1.
  it('"1.000" é mil, e não 1', () => {
    expect(valorDoFiltro('luzMin', '1.000')).toBe(1000)
    expect(valorDoFiltro('luzMax', '2.000')).toBe(2000)
    expect(valorDoFiltro('luzMax', '12.500')).toBe(12500)
    expect(valorDoFiltro('luzMax', '100.000')).toBe(100000)
    expect(valorDoFiltro('luzMax', '1.000.000')).toBe(1000000)
  })

  it('com milhar e vírgula decimal juntos, e com o sinal de menos', () => {
    expect(valorDoFiltro('luzMin', '1.000,5')).toBe(1000.5)
    expect(valorDoFiltro('temperaturaMin', '-1.000')).toBe(-1000)
  })

  it('o ponto com 1, 2 ou 4 dígitos depois continua sendo a casa decimal', () => {
    expect(valorDoFiltro('temperaturaMax', '22.5')).toBe(22.5)
    expect(valorDoFiltro('temperaturaMax', '22.50')).toBe(22.5)
    expect(valorDoFiltro('temperaturaMax', '1.0')).toBe(1)
    expect(valorDoFiltro('temperaturaMax', '1.0000')).toBe(1)
  })

  it('"0.500" não é o jeito de escrever 500: continua sendo meio', () => {
    expect(valorDoFiltro('luzMin', '0.500')).toBe(0.5)
  })

  it('grupos de milhar errados não são número: "sem limite"', () => {
    expect(valorDoFiltro('luzMin', '1.00.000')).toBe(null)
    expect(valorDoFiltro('luzMin', '1.000.00')).toBe(null)
    expect(valorDoFiltro('luzMin', '1.000.')).toBe(null)
    expect(valorDoFiltro('luzMin', '1.000,')).toBe(null)
    expect(valorDoFiltro('luzMin', '1,000.5')).toBe(null)
  })

  it('com o limite de luz em "2.000", passam as oito salas com leitura (180 a 920 lux)', () => {
    const ate2mil = idsQuePassam({ luzMax: valorDoFiltro('luzMax', '2.000') })
    expect(ate2mil).toEqual(['S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09'])
    expect(idsQuePassam({ luzMin: valorDoFiltro('luzMin', '1.000') })).toEqual([])
  })
})

describe('valorDoFiltro: as duas opções (as caixas de marcar) e o campo que não existe', () => {
  // Nas caixas de marcar o PainelFiltros manda o evento.target.checked, que é true ou false.
  it('só o true liga a opção', () => {
    expect(valorDoFiltro('exigirMesaLivre', true)).toBe(true)
    expect(valorDoFiltro('somenteFavoritas', true)).toBe(true)
  })

  it('false e qualquer outra coisa desligam (até o texto "true"): a opção nunca fica com um texto', () => {
    expect(valorDoFiltro('exigirMesaLivre', false)).toBe(false)
    expect(valorDoFiltro('exigirMesaLivre', 'true')).toBe(false)
    expect(valorDoFiltro('somenteFavoritas', 1)).toBe(false)
    expect(valorDoFiltro('somenteFavoritas', undefined)).toBe(false)
  })

  it('um campo que não está no FILTROS_VAZIOS é erro de quem programou: lança erro', () => {
    expect(() => valorDoFiltro('ocupacao', '3')).toThrow('Filtro desconhecido')
    expect(() => valorDoFiltro('toString', '3')).toThrow('Filtro desconhecido') // nome que todo objeto tem
    expect(() => valorDoFiltro(undefined, '3')).toThrow('Filtro desconhecido')
  })
})
