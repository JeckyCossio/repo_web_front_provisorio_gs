import LinhaSala from './LinhaSala.jsx'
import { GRADE } from './gradePainel.js'
import { contar } from '../utils/formatar.js'

const ROTULOS = ['Sala', 'Mesas e lugares', 'Temperatura', 'Luz', 'Ruído', 'Situação', 'Ações']

// Exibe as salas elegíveis e as excluídas da atividade.
const QuadroSalas = ({ itens, atividade, nomeAtividade, versaoOrdem, colecoes, erroApi }) => {
  const comRanking = Boolean(atividade)
  const servem = comRanking ? itens.filter((item) => item.avaliacao && item.avaliacao.elegivel) : itens
  const naoServem = comRanking ? itens.filter((item) => !item.avaliacao || !item.avaliacao.elegivel) : []
  const rotulos = comRanking ? ['Pos.', ...ROTULOS] : ROTULOS

  // Monta a linha com os dados e as ações da sala.
  const desenharLinha = (item, indice) => (
    <LinhaSala
      key={item.sala.id}
      item={item}
      atividade={atividade}
      ordem={indice}
      animar={versaoOrdem > 0}
      favorita={colecoes.ehFavorita(item.sala.id)}
      onAlternarFavorito={() => colecoes.alternarFavorito(item.sala.id)}
      listas={colecoes.listas}
      onAdicionarNaLista={colecoes.adicionarSala}
      onRemoverDaLista={colecoes.removerSala}
      onCriarLista={colecoes.criarLista}
      erroApi={item.sala.id === 'S01' ? erroApi : null}
    />
  )

  return (
    <div className="xl:overflow-hidden xl:rounded-lg xl:border xl:border-regua xl:bg-moldura">
      <div
        aria-hidden="true"
        className={`regua-baixo hidden px-4 text-xs font-semibold uppercase tracking-[0.1em] text-tinta-3 xl:grid xl:gap-x-3 ${
          comRanking ? GRADE.comRanking : GRADE.semRanking
        }`}
      >
        {rotulos.map((rotulo, i) => (
          <span key={rotulo} className={`py-2.5 ${i > 0 ? 'regua-esquerda pl-3' : ''}`}>
            {rotulo}
          </span>
        ))}
      </div>

      {/* A troca de atividade reinicia a animação de entrada das linhas. */}
      <ol
        key={`servem-${versaoOrdem}`}
        className="flex flex-col gap-3 xl:gap-0"
        aria-label={comRanking ? `Salas que servem para ${nomeAtividade}, da melhor para a pior` : 'Todas as salas'}
      >
        {servem.map(desenharLinha)}
      </ol>

      {naoServem.length > 0 && (
        <section aria-labelledby="titulo-nao-servem" className="mt-6 xl:mt-0">
          <h2
            id="titulo-nao-servem"
            className="regua-baixo px-1 pb-2 text-sm font-semibold uppercase tracking-[0.08em] text-tinta-3 xl:bg-noite/40 xl:px-4 xl:py-2.5"
          >
            Não servem para {nomeAtividade.toLowerCase()} · {contar(naoServem.length, 'sala', 'salas')}
          </h2>
          <ul key={`nao-servem-${versaoOrdem}`} className="flex flex-col gap-3 xl:gap-0">
            {naoServem.map((item, indice) => desenharLinha(item, servem.length + indice))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default QuadroSalas
