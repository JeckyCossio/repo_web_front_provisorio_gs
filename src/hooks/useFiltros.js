import { useState } from 'react'
import { FILTROS_VAZIOS, contarFiltrosAtivos, filtrarItens, valorDoFiltro } from '../utils/filtros.js'
import { ATIVIDADES, ranquearItens } from '../utils/ranking.js'

// O estado dos filtros fica aqui; os cálculos usam filtros.js e ranking.js.

export function useFiltros(itens, favoritos) {
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS)
  const [atividade, setAtividade] = useState(null)

  // Converte o valor do campo antes de atualizar o filtro.
  const alterarFiltro = (campo, valor) => {
    const novoValor = valorDoFiltro(campo, valor)
    setFiltros((atuais) => ({ ...atuais, [campo]: novoValor }))
  }

  // Restaura os filtros vazios.
  const limparFiltros = () => {
    setFiltros(FILTROS_VAZIOS)
  }

  // Valida a atividade antes de guardá-la no estado.
  const escolherAtividade = (id) => {
    const escolhida = id === undefined ? null : id
    if (escolhida !== null && ATIVIDADES.filter((opcao) => opcao.id === escolhida).length === 0) {
      throw new Error(`Atividade desconhecida: "${escolhida}". Use um dos ids do ATIVIDADES ou null.`)
    }
    setAtividade(escolhida)
  }

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
