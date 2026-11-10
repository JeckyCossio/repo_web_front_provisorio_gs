import { describe, expect, it } from 'vitest'
import { LEITURAS_DEMO, SALAS } from '../data/salas.js'
import { classificarSala } from './classificacao.js'
import { LEITURA_POSSIVEL, RUIDO_DB_MAX, RUIDO_DB_MIN } from './limiares.js'
import { montarSalaDemo, montarSalas, normalizarTelemetria } from './normalizar.js'

const META_S01 = SALAS[0] // { id: 'S01', nome: 'Sala de Estudo 01', porte: 'media', quantidadeMesas: 3, ... }

// A linha da tabela room_telemetry com o exemplo FICTÍCIO do CONTEXTO, §6.3.
// O updated_at não vem do ESP32: quem preenche é o Supabase quando a linha muda.
function linhaExemplo(mudancas) {
  return {
    room_id: 'S01',
    occupancy_by_table: [1, 2, 0],
    temperature_c: 22.8,
    light_value: 410,
    light_unit: 'lux_estimado',
    noise_db_simulated: 54,
    device_status: 'ok',
    updated_at: '2026-11-08T14:32:00Z',
    ...mudancas,
  }
}

describe('normalizarTelemetria: a linha do Supabase vira a sala normalizada', () => {
  it('o exemplo do CONTEXTO, §6.3', () => {
    expect(normalizarTelemetria(linhaExemplo(), META_S01)).toEqual({
      id: 'S01',
      nome: 'Sala de Estudo 01',
      porte: 'media',
      mesas: [1, 2, 0],
      temperaturaC: 22.8,
      luz: { valor: 410, unidade: 'lux_estimado' },
      ruidoDb: 54,
      origem: 'iot',
      statusDispositivo: 'ok',
      atualizadoEm: '2026-11-08T14:32:00Z',
    })
  })

  it('não devolve a mesma lista de mesas da linha (é uma cópia)', () => {
    const linha = linhaExemplo()
    expect(normalizarTelemetria(linha, META_S01).mesas).not.toBe(linha.occupancy_by_table)
  })
})

describe('normalizarTelemetria: números e listas que chegam como texto', () => {
  it('aceita números vindos como texto ("22.8")', () => {
    const sala = normalizarTelemetria(
      linhaExemplo({ temperature_c: '22.8', light_value: ' 410 ', noise_db_simulated: '54' }),
      META_S01,
    )
    expect(sala.temperaturaC).toBe(22.8)
    expect(sala.luz.valor).toBe(410)
    expect(sala.ruidoDb).toBe(54)
    expect(sala.statusDispositivo).toBe('ok')
  })

  it('aceita as mesas como texto JSON ("[1,2,0]")', () => {
    const sala = normalizarTelemetria(linhaExemplo({ occupancy_by_table: '[1,2,0]' }), META_S01)
    expect(sala.mesas).toEqual([1, 2, 0])
    expect(sala.statusDispositivo).toBe('ok')
  })

  it('aceita mesas com números em texto dentro da lista (["1","2","0"])', () => {
    const sala = normalizarTelemetria(linhaExemplo({ occupancy_by_table: ['1', '2', '0'] }), META_S01)
    expect(sala.mesas).toEqual([1, 2, 0])
  })

  it('aceita a data com microssegundos, como o Postgres devolve', () => {
    const data = '2026-11-08T14:32:00.123456+00:00'
    expect(normalizarTelemetria(linhaExemplo({ updated_at: data }), META_S01).atualizadoEm).toBe(data)
  })
})

describe('normalizarTelemetria: o que não é válido vira null e "dados_invalidos"', () => {
  it.each([
    ['texto vazio', ''],
    ['texto que não é número', 'quente'],
    ['vírgula no lugar do ponto ("22,8")', '22,8'],
    ['NaN', NaN],
    ['infinito', Infinity],
    ['ausente (null)', null],
    ['verdadeiro/falso', true],
  ])('temperatura %s', (_descricao, valor) => {
    const sala = normalizarTelemetria(linhaExemplo({ temperature_c: valor }), META_S01)
    expect(sala.temperaturaC).toBeNull()
    expect(sala.statusDispositivo).toBe('dados_invalidos')
    // O resto continua valendo.
    expect(sala.ruidoDb).toBe(54)
    expect(sala.mesas).toEqual([1, 2, 0])
  })

  it.each([
    ['uma mesa com 4 pessoas', [1, 4, 0]],
    ['uma mesa negativa', [1, -1, 0]],
    ['meia pessoa', [1, 1.5, 0]],
    ['um texto que não é número', [1, 'dois', 0]],
    ['2 mesas, mas a S01 tem 3', [1, 2]],
    ['4 mesas, mas a S01 tem 3', [1, 2, 0, 0]],
    ['lista vazia', []],
    ['JSON quebrado', '[1,2'],
    ['JSON que não é lista', '{"mesa1":1}'],
    ['um número só', 3],
    ['ausente (undefined)', undefined],
  ])('mesas fora de 0..3 ou erradas: %s', (_descricao, valor) => {
    const sala = normalizarTelemetria(linhaExemplo({ occupancy_by_table: valor }), META_S01)
    expect(sala.mesas).toBeNull()
    expect(sala.statusDispositivo).toBe('dados_invalidos')
  })

  it('luz negativa não existe: vira null', () => {
    const sala = normalizarTelemetria(linhaExemplo({ light_value: -5 }), META_S01)
    expect(sala.luz).toEqual({ valor: null, unidade: 'lux_estimado' })
    expect(sala.statusDispositivo).toBe('dados_invalidos')
  })

  // O CONTEXTO (§6.3) prevê "lux_estimado" ou "indice", mas os limiares só existem em lux
  // estimado. Sem limiar, a web não sabe classificar o "indice", então ele não é aceito.
  it.each(['indice', 'lumens', undefined])('a luz só vale em "lux_estimado" (unidade %s não vale)', (unidade) => {
    const sala = normalizarTelemetria(linhaExemplo({ light_unit: unidade, noise_db_simulated: 40 }), META_S01)
    expect(sala.luz).toEqual({ valor: 410, unidade: null })
    expect(sala.statusDispositivo).toBe('dados_invalidos')
    expect(classificarSala(sala).estado).toBe('falha')
  })

  it('ruído em texto que não é número', () => {
    const sala = normalizarTelemetria(linhaExemplo({ noise_db_simulated: 'alto' }), META_S01)
    expect(sala.ruidoDb).toBeNull()
    expect(sala.statusDispositivo).toBe('dados_invalidos')
  })

  // O Number() do JavaScript aceita "0x16" (hexadecimal) e "2.28e1" (notação científica).
  // A regra aqui é mais simples: só o número escrito do jeito comum ("22.8", "-3", "54").
  it.each([
    ['hexadecimal', '0x16'],
    ['octal', '0o26'],
    ['binário', '0b10110'],
    ['notação científica', '2.28e1'],
    ['com sinal de mais', '+22.8'],
    ['sem número antes do ponto', '.5'],
  ])('número escrito de outro jeito (%s) não vale', (_descricao, texto) => {
    const sala = normalizarTelemetria(linhaExemplo({ temperature_c: texto }), META_S01)
    expect(sala.temperaturaC).toBeNull()
    expect(sala.statusDispositivo).toBe('dados_invalidos')
  })

  it('mesas escritas de outro jeito (["0x3", "0b10", "1e0"]) também não valem', () => {
    const sala = normalizarTelemetria(linhaExemplo({ occupancy_by_table: ['0x3', '0b10', '1e0'] }), META_S01)
    expect(sala.mesas).toBeNull()
    expect(sala.statusDispositivo).toBe('dados_invalidos')
  })

  it('aceita número negativo em texto ("-3.5"), se estiver dentro da faixa', () => {
    expect(normalizarTelemetria(linhaExemplo({ temperature_c: '-3.5' }), META_S01).temperaturaC).toBe(-3.5)
  })

  // O Date.parse do Chrome e do Node aceita "0" (ano 2000), "99" (1999) e "Sala 1" como data.
  // Por isso a data precisa vir completa, no formato do Supabase: dia, hora e fuso.
  it.each([
    ['uma palavra', 'ontem'],
    ['"0" (o Date.parse lê como o ano 2000)', '0'],
    ['"99" (o Date.parse lê como 1999)', '99'],
    ['"1"', '1'],
    ['um nome de sala', 'Sala 1'],
    ['um texto com número', 'abc 5'],
    ['só o dia, sem a hora', '2026-11-08'],
    ['sem o fuso (não dá para saber a hora certa)', '2026-11-08T14:32:00'],
    ['espaço no lugar do T', '2026-11-08 14:32:00+00:00'],
    ['mês 13', '2026-13-01T00:00:00Z'],
    ['um número', 1794148320000],
  ])('data que não é data completa (%s)', (_descricao, data) => {
    const sala = normalizarTelemetria(linhaExemplo({ updated_at: data }), META_S01)
    expect(sala.atualizadoEm).toBeNull()
    expect(sala.statusDispositivo).toBe('dados_invalidos')
  })

  it.each([
    ['com Z', '2026-11-08T14:32:00Z'],
    ['com o fuso de Brasília', '2026-11-08T11:32:00-03:00'],
    ['com milissegundos', '2026-11-08T14:32:00.123Z'],
  ])('data completa (%s) vale e fica do jeito que veio', (_descricao, data) => {
    const sala = normalizarTelemetria(linhaExemplo({ updated_at: data }), META_S01)
    expect(sala.atualizadoEm).toBe(data)
    expect(sala.statusDispositivo).toBe('ok')
  })

  it('sem a data (o updated_at), também é "dados_invalidos": não dá para saber se está atualizada', () => {
    const sala = normalizarTelemetria(linhaExemplo({ updated_at: undefined }), META_S01)
    expect(sala.atualizadoEm).toBeNull()
    expect(sala.statusDispositivo).toBe('dados_invalidos')
  })
})

// CONTEXTO, §5.4: "leitura numérica fora da faixa prevista [...] exige tratamento explícito".
// Um valor que o sensor não consegue dar é erro de leitura, não um valor real.
// Ele NÃO pode deixar a sala verde (ex.: -20 dB "silencioso") nem vermelha de mentira (500 °C).
describe('normalizarTelemetria: leitura fora da faixa que o sensor consegue dar', () => {
  it.each([
    ['ruído 0 (o potenciômetro nunca dá menos que o começo da escala)', { noise_db_simulated: 0 }, 'ruidoDb'],
    ['ruído negativo', { noise_db_simulated: -20 }, 'ruidoDb'],
    ['ruído um pouco abaixo do começo da escala', { noise_db_simulated: RUIDO_DB_MIN - 0.1 }, 'ruidoDb'],
    ['ruído um pouco acima do fim da escala', { noise_db_simulated: RUIDO_DB_MAX + 0.1 }, 'ruidoDb'],
    ['a leitura crua do potenciômetro (0 a 4095) no lugar dos dB', { noise_db_simulated: 4095 }, 'ruidoDb'],
    ['temperatura de 500 °C', { temperature_c: 500 }, 'temperaturaC'],
    ['temperatura abaixo do que o sensor mede', { temperature_c: LEITURA_POSSIVEL.temperatura.minimo - 1 }, 'temperaturaC'],
  ])('%s vira null, "dados_invalidos" e "falha"', (_descricao, mudanca, campo) => {
    const sala = normalizarTelemetria(linhaExemplo({ noise_db_simulated: 40, ...mudanca }), META_S01)
    expect(sala[campo]).toBeNull()
    expect(sala.statusDispositivo).toBe('dados_invalidos')
    expect(classificarSala(sala).estado).toBe('falha')
  })

  it('luz acima do máximo previsto vira null', () => {
    const sala = normalizarTelemetria(linhaExemplo({ light_value: LEITURA_POSSIVEL.luz.maximo + 1 }), META_S01)
    expect(sala.luz).toEqual({ valor: null, unidade: 'lux_estimado' })
    expect(sala.statusDispositivo).toBe('dados_invalidos')
  })

  it('as pontas da faixa ainda valem (a faixa inclui o mínimo e o máximo)', () => {
    const { temperatura, luz, ruido } = LEITURA_POSSIVEL
    const pontas = [
      { temperature_c: temperatura.minimo, light_value: luz.minimo, noise_db_simulated: ruido.minimo },
      { temperature_c: temperatura.maximo, light_value: luz.maximo, noise_db_simulated: ruido.maximo },
    ]
    for (const ponta of pontas) {
      expect(normalizarTelemetria(linhaExemplo(ponta), META_S01).statusDispositivo).toBe('ok')
    }
  })

  it('o status de erro do ESP32 continua tendo prioridade', () => {
    const sala = normalizarTelemetria(linhaExemplo({ noise_db_simulated: -20, device_status: 'sensor_error' }), META_S01)
    expect(sala.ruidoDb).toBeNull()
    expect(sala.statusDispositivo).toBe('sensor_error')
  })
})

// RN-10 e CONTEXTO, §7.6: a leitura do modo mock é inventada e tem de sair rotulada como tal.
describe('normalizarTelemetria: de onde veio a linha (a origem)', () => {
  it('sem dizer nada, a linha é do IoT (o Supabase)', () => {
    expect(normalizarTelemetria(linhaExemplo(), META_S01).origem).toBe('iot')
    expect(normalizarTelemetria(linhaExemplo(), META_S01, 'iot').origem).toBe('iot')
  })

  it('a linha do modo mock sai com origem "mock", com ou sem leitura', () => {
    expect(normalizarTelemetria(linhaExemplo(), META_S01, 'mock').origem).toBe('mock')
    expect(normalizarTelemetria(null, META_S01, 'mock').origem).toBe('mock')
    expect(normalizarTelemetria('lixo', META_S01, 'mock').origem).toBe('mock')
  })

  it.each([['demo'], ['IOT'], [''], [null]])('uma origem estranha (%s) sai "mock": na dúvida, nunca diz que é IoT', (origem) => {
    expect(normalizarTelemetria(linhaExemplo(), META_S01, origem).origem).toBe('mock')
  })
})

describe('normalizarTelemetria: o status do dispositivo', () => {
  it.each(['offline', 'sensor_error'])('o status de erro do ESP32 ("%s") fica, mesmo com tudo válido', (status) => {
    expect(normalizarTelemetria(linhaExemplo({ device_status: status }), META_S01).statusDispositivo)
      .toBe(status)
  })

  it('o status de erro do ESP32 tem prioridade sobre "dados_invalidos"', () => {
    const linha = linhaExemplo({ device_status: 'sensor_error', temperature_c: null })
    const sala = normalizarTelemetria(linha, META_S01)
    expect(sala.temperaturaC).toBeNull()
    expect(sala.statusDispositivo).toBe('sensor_error')
  })

  it.each([
    ['ausente', undefined],
    ['texto vazio', '  '],
    ['um número', 1],
  ])('status %s, com o resto válido: "dados_invalidos"', (_descricao, status) => {
    expect(normalizarTelemetria(linhaExemplo({ device_status: status }), META_S01).statusDispositivo)
      .toBe('dados_invalidos')
  })
})

// Uma sala da S01 sem nenhuma leitura: tudo null, nunca zeros inventados.
function salaS01SemDados(status) {
  return {
    id: 'S01',
    nome: 'Sala de Estudo 01',
    porte: 'media',
    mesas: null,
    temperaturaC: null,
    luz: { valor: null, unidade: null },
    ruidoDb: null,
    origem: 'iot',
    statusDispositivo: status,
    atualizadoEm: null,
  }
}

describe('normalizarTelemetria: sem linha ou com a linha errada', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('linha %s: tudo null e "sem_leitura" (nunca inventa a leitura da S01)', (_descricao, linha) => {
    expect(normalizarTelemetria(linha, META_S01)).toEqual(salaS01SemDados('sem_leitura'))
  })

  // O combinado com o services/: passar a linha (o resposta[0] do Supabase), e não a lista.
  // A lista inteira, cheia ou vazia, é erro de quem chamou, e aparece como "dados_invalidos".
  // Sem linha nenhuma (resposta[0] de uma lista vazia dá undefined), é "sem_leitura".
  it.each([
    ['um texto', 'S01'],
    ['um número', 42],
    ['a lista inteira da resposta do Supabase (falta pegar o [0])', [linhaExemplo()]],
    ['a lista vazia da resposta do Supabase (falta pegar o [0])', []],
    ['um objeto vazio', {}],
  ])('linha que não é uma linha (%s): tudo null e "dados_invalidos"', (_descricao, linha) => {
    expect(normalizarTelemetria(linha, META_S01)).toEqual(salaS01SemDados('dados_invalidos'))
  })

  it('a linha de outra sala (room_id "S02") não é usada na S01', () => {
    const sala = normalizarTelemetria(linhaExemplo({ room_id: 'S02' }), META_S01)
    expect(sala).toEqual(salaS01SemDados('dados_invalidos'))
  })

  it('nunca lança erro, nem sem a sala do data/', () => {
    expect(() => normalizarTelemetria(linhaExemplo(), undefined)).not.toThrow()
    expect(() => normalizarTelemetria(null, null)).not.toThrow()
    expect(normalizarTelemetria(linhaExemplo(), undefined).statusDispositivo).toBe('dados_invalidos')
  })

  // Sem a sala do data/ e sem room_id, os dois lados são undefined. Isso não conta como "a mesma sala".
  it.each([
    ['sem a sala do data/', undefined],
    ['com uma sala sem id', {}],
  ])('uma linha sem room_id não é usada (%s): id, nome e porte null, nunca undefined', (_d, meta) => {
    const linha = linhaExemplo({ room_id: undefined, occupancy_by_table: [1, 1, 1, 1, 1] })
    const sala = normalizarTelemetria(linha, meta)
    expect(sala.statusDispositivo).toBe('dados_invalidos')
    expect(sala.id).toBeNull()
    expect(sala.nome).toBeNull()
    expect(sala.porte).toBeNull()
    expect(sala.mesas).toBeNull()
    expect(classificarSala(sala).estado).toBe('falha')
  })

  it('sem saber quantas mesas a sala tem, as mesas não são aceitas (não dá para conferir)', () => {
    const sala = normalizarTelemetria(linhaExemplo(), { id: 'S01', nome: 'Sala de Estudo 01', porte: 'media' })
    expect(sala.mesas).toBeNull()
    expect(sala.statusDispositivo).toBe('dados_invalidos')
  })
})

describe('montarSalaDemo: as salas fictícias S02 a S09', () => {
  it('a S02 sai no mesmo formato, com origem "demo" e sem status nem data', () => {
    expect(montarSalaDemo(SALAS[1], LEITURAS_DEMO.S02)).toEqual({
      id: 'S02',
      nome: 'Sala de Estudo 02',
      porte: 'pequena',
      mesas: [0, 2],
      temperaturaC: 22,
      luz: { valor: 410, unidade: 'lux_estimado' },
      ruidoDb: 42,
      origem: 'demo',
      statusDispositivo: null,
      atualizadoEm: null,
    })
  })

  it('copia as mesas e a luz: mudar a sala não muda o data/', () => {
    const sala = montarSalaDemo(SALAS[1], LEITURAS_DEMO.S02)
    expect(sala.mesas).not.toBe(LEITURAS_DEMO.S02.mesas)
    expect(sala.luz).not.toBe(LEITURAS_DEMO.S02.luz)
    sala.mesas[0] = 3
    expect(LEITURAS_DEMO.S02.mesas).toEqual([0, 2])
  })

  it('sem leitura, não lança erro e não inventa: tudo null', () => {
    const sala = montarSalaDemo(SALAS[1], undefined)
    expect(sala.mesas).toBeNull()
    expect(sala.temperaturaC).toBeNull()
    expect(sala.luz).toEqual({ valor: null, unidade: null })
    expect(sala.ruidoDb).toBeNull()
    expect(sala.origem).toBe('demo')
    expect(sala.statusDispositivo).toBe('dados_invalidos')
  })

  it('as oito leituras do data/ estão todas válidas: status null', () => {
    for (const meta of SALAS.filter((sala) => sala.origem === 'demo')) {
      expect(montarSalaDemo(meta, LEITURAS_DEMO[meta.id]).statusDispositivo).toBeNull()
    }
  })

  // A sala demo passa pelas mesmas conferências da S01. Se alguém editar o LEITURAS_DEMO
  // com um erro, a sala cai em "falha" com o motivo, em vez de mostrar números errados.
  const S08 = SALAS.find((sala) => sala.id === 'S08') // grande, 4 mesas
  it.each([
    ['3 mesas numa sala grande (que tem 4)', { mesas: [3, 3, 3] }, (sala) => sala.mesas],
    ['uma mesa com 4 pessoas', { mesas: [4, 2, 1, 0] }, (sala) => sala.mesas],
    ['luz negativa', { luz: { valor: -5, unidade: 'lux_estimado' } }, (sala) => sala.luz.valor],
    ['luz em outra unidade', { luz: { valor: 600, unidade: 'indice' } }, (sala) => sala.luz.unidade],
    ['ruído fora da escala', { ruidoDb: 0 }, (sala) => sala.ruidoDb],
    ['temperatura em texto que não é número', { temperaturaC: 'quente' }, (sala) => sala.temperaturaC],
  ])('leitura demo errada (%s): o campo vira null e a sala fica em "falha"', (_d, mudanca, campo) => {
    const sala = montarSalaDemo(S08, { ...LEITURAS_DEMO.S08, ...mudanca })
    expect(campo(sala)).toBeNull()
    expect(sala.statusDispositivo).toBe('dados_invalidos')
    expect(classificarSala(sala).estado).toBe('falha')
  })

  it('a temperatura em texto ("25") vira número, como na S01', () => {
    const sala = montarSalaDemo(S08, { ...LEITURAS_DEMO.S08, temperaturaC: '25' })
    expect(sala.temperaturaC).toBe(25)
    expect(sala.statusDispositivo).toBeNull()
  })
})

describe('montarSalas: as nove salas, na ordem S01 a S09', () => {
  const ORDEM = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09']

  it('com a linha da S01: a S01 vem do IoT e as outras oito são demo', () => {
    const salas = montarSalas(linhaExemplo())
    expect(salas.map((sala) => sala.id)).toEqual(ORDEM)
    expect(salas[0]).toEqual(normalizarTelemetria(linhaExemplo(), META_S01))
    expect(salas[0].mesas).toEqual([1, 2, 0])
    expect(salas.slice(1).every((sala) => sala.origem === 'demo')).toBe(true)
    expect(salas[8].mesas).toEqual([3, 3, 3, 0]) // a S09 do §7.6
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('sem a linha da S01 (%s): a S01 sai com tudo null e "sem_leitura", nunca com zeros', (_d, linha) => {
    const salas = montarSalas(linha)
    expect(salas.map((sala) => sala.id)).toEqual(ORDEM)
    expect(salas[0]).toEqual(salaS01SemDados('sem_leitura'))
    // As oito demo continuam iguais.
    expect(salas[1]).toEqual(montarSalaDemo(SALAS[1], LEITURAS_DEMO.S02))
  })

  // A cor de cada sala demo depende dos limiares e já é conferida, sala por sala, no
  // classificacao.test.js. Aqui só importa: a S01 sem leitura é "falha" e nenhuma demo é.
  it('sem a S01, ela fica em "falha" e as outras oito são classificadas sem erro', () => {
    const estados = montarSalas(null).map((sala) => classificarSala(sala).estado)
    expect(estados[0]).toBe('falha')
    expect(estados.slice(1)).toHaveLength(8)
    expect(estados.slice(1)).not.toContain('falha')
  })

  it('no modo mock, a S01 sai com origem "mock" e as outras oito continuam "demo"', () => {
    const salas = montarSalas(linhaExemplo(), 'mock')
    expect(salas[0].origem).toBe('mock')
    expect(salas[0].statusDispositivo).toBe('ok')
    expect(salas.slice(1).every((sala) => sala.origem === 'demo')).toBe(true)
    expect(montarSalas(null, 'mock')[0].origem).toBe('mock')
  })

  it('o exemplo da S01 (CONTEXTO, §6.3), do Supabase até o estado: amarelo', () => {
    expect(classificarSala(montarSalas(linhaExemplo())[0]).estado).toBe('amarelo')
  })
})
