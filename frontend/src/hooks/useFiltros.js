import { useState } from 'react'
import { FILTROS_VAZIOS, contarFiltrosAtivos, filtrarItens, valorDoFiltro } from '../utils/filtros.js'
import { ATIVIDADES, ranquearItens } from '../utils/ranking.js'

// Os filtros manuais e o atalho de atividade (CONTEXTO, §7.4 e §7.5). As regras ficam no
// utils/filtros.js e no utils/ranking.js; aqui só fica o que a pessoa escolheu.

/**
 * Os filtros e a atividade escolhidos, e as salas que sobram, já na ordem do ranking.
 * @param {{ sala: object, classificacao: object, desatualizada: boolean }[]} itens as salas do useSalas
 * @param {string[]} favoritos os ids das salas favoritas (o favoritos do useColecoes)
 * @returns {{ filtros: object, alterarFiltro: (campo: string, valor: unknown) => void, limparFiltros: () => void,
 *   atividade: string|null, escolherAtividade: (id: string|null) => void, totalAtivos: number, resultado: object[] }}
 */
export function useFiltros(itens, favoritos) {
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS)
  const [atividade, setAtividade] = useState(null)

  // Normalizar e validar na ação para não guardar um filtro inválido no estado.
  const alterarFiltro = (campo, valor) => {
    const novoValor = valorDoFiltro(campo, valor)
    setFiltros((atuais) => ({ ...atuais, [campo]: novoValor }))
  }

  const limparFiltros = () => {
    setFiltros(FILTROS_VAZIOS)
  }

  // null (ou undefined) volta para "Todas as salas". Um id que não existe lança erro aqui, no
  // clique: guardado no estado, ele faria o ranquearItens lançar erro ao desenhar a tela inteira.
  const escolherAtividade = (id) => {
    const escolhida = id === undefined ? null : id
    if (escolhida !== null && ATIVIDADES.filter((opcao) => opcao.id === escolhida).length === 0) {
      throw new Error(`Atividade desconhecida: "${escolhida}". Use um dos ids do ATIVIDADES ou null.`)
    }
    setAtividade(escolhida)
  }

  // Derivar o resultado mantém o ranking sincronizado com leituras e favoritos.
  const resultado = ranquearItens(filtrarItens(itens, filtros, favoritos), atividade)

  return {
    filtros,
    alterarFiltro,
    limparFiltros,
    atividade,
    escolherAtividade,
    totalAtivos: contarFiltrosAtivos(filtros),
    resultado,
  }
}
