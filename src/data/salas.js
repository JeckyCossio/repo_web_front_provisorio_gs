// S01 recebe dados do Supabase; S02 a S09 começam com as leituras simuladas abaixo.

export const MESAS_POR_PORTE = { pequena: 2, media: 3, grande: 4 }

export const SALAS = [
  { id: 'S01', nome: 'Sala de Estudo 01', porte: 'media', quantidadeMesas: MESAS_POR_PORTE.media, origem: 'iot' },
  { id: 'S02', nome: 'Sala de Estudo 02', porte: 'pequena', quantidadeMesas: MESAS_POR_PORTE.pequena, origem: 'demo' },
  { id: 'S03', nome: 'Sala de Estudo 03', porte: 'pequena', quantidadeMesas: MESAS_POR_PORTE.pequena, origem: 'demo' },
  { id: 'S04', nome: 'Sala de Estudo 04', porte: 'media', quantidadeMesas: MESAS_POR_PORTE.media, origem: 'demo' },
  { id: 'S05', nome: 'Sala de Estudo 05', porte: 'media', quantidadeMesas: MESAS_POR_PORTE.media, origem: 'demo' },
  { id: 'S06', nome: 'Sala de Estudo 06', porte: 'media', quantidadeMesas: MESAS_POR_PORTE.media, origem: 'demo' },
  { id: 'S07', nome: 'Sala de Estudo 07', porte: 'media', quantidadeMesas: MESAS_POR_PORTE.media, origem: 'demo' },
  { id: 'S08', nome: 'Sala de Estudo 08', porte: 'grande', quantidadeMesas: MESAS_POR_PORTE.grande, origem: 'demo' },
  { id: 'S09', nome: 'Sala de Estudo 09', porte: 'grande', quantidadeMesas: MESAS_POR_PORTE.grande, origem: 'demo' },
]

// Cada posição de mesas indica a quantidade de pessoas naquela mesa.
export const LEITURAS_DEMO = {
  S02: { mesas: [0, 2], temperaturaC: 22, luz: { valor: 410, unidade: 'lux_estimado' }, ruidoDb: 42 },
  S03: { mesas: [3, 3], temperaturaC: 18, luz: { valor: 920, unidade: 'lux_estimado' }, ruidoDb: 71 },
  S04: { mesas: [1, 1, 1], temperaturaC: 21, luz: { valor: 500, unidade: 'lux_estimado' }, ruidoDb: 46 },
  S05: { mesas: [0, 3, 3], temperaturaC: 24, luz: { valor: 350, unidade: 'lux_estimado' }, ruidoDb: 57 },
  S06: { mesas: [2, 2, 1], temperaturaC: 19, luz: { valor: 180, unidade: 'lux_estimado' }, ruidoDb: 61 },
  S07: { mesas: [0, 0, 1], temperaturaC: 23, luz: { valor: 450, unidade: 'lux_estimado' }, ruidoDb: 39 },
  S08: { mesas: [3, 2, 1, 0], temperaturaC: 25, luz: { valor: 600, unidade: 'lux_estimado' }, ruidoDb: 53 },
  S09: { mesas: [3, 3, 3, 0], temperaturaC: 28, luz: { valor: 760, unidade: 'lux_estimado' }, ruidoDb: 68 },
}
