// Limites usados por classificacao.js; null desativa a comparação daquele lado.

export const LIMIARES = {
  temperatura: {
    unidade: '°C',
    limiteBaixo: 21,
    limiteAlto: 26,
    criticoAbaixo: 18,
    atencaoAbaixo: 21,
    atencaoAcima: 25,
    criticoAcima: 26,
  },

  luz: {
    unidade: 'lux_estimado',
    limiteBaixo: 300,
    limiteAlto: 750,
    criticoAbaixo: 200,
    atencaoAbaixo: 300,
    atencaoAcima: 2000,
    criticoAcima: 3000,
  },

  ruido: {
    unidade: 'dB_simulados',
    limiteBaixo: 40,
    limiteAlto: 55,
    criticoAbaixo: null,
    atencaoAbaixo: null,
    atencaoAcima: 45,
    criticoAcima: 65,
  },

  ocupacao: {
    unidade: '%',
    limiteBaixo: 35,
    limiteAlto: 70,
    criticoAbaixo: null,
    atencaoAbaixo: null,
    atencaoAcima: 50,
    criticoAcima: 90,
  },
}

export const RUIDO_DB_MIN = 30

export const RUIDO_DB_MAX = 80

// normalizar.js descarta leituras fora destas faixas.
export const LEITURA_POSSIVEL = {
  temperatura: { minimo: -40, maximo: 80 },
  luz: { minimo: 0, maximo: 100000 },
  ruido: { minimo: RUIDO_DB_MIN, maximo: RUIDO_DB_MAX },
}
