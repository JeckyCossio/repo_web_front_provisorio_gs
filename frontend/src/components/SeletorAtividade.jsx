import Icone from './Icone.jsx'

const ICONES = { sozinho: 'pessoa', grupo: 'lista', video: 'som' }

/**
 * Os atalhos de atividade. Escolher um reordena o painel pelo ranking daquela atividade;
 * "Todas as salas" volta à ordem S01 a S09. Os filtros continuam valendo junto.
 * @param {{ atividades: { id, nome, resumo }[], atividade: string|null, onEscolher: (id|null) => void }} props
 */
const SeletorAtividade = ({ atividades, atividade, onEscolher }) => {
  const opcoes = [{ id: null, nome: 'Todas as salas', resumo: 'Na ordem do painel, sem ranking' }, ...atividades]
  const escolhida = opcoes.find((opcao) => opcao.id === atividade) || opcoes[0]

  return (
    <div className="w-full sm:w-auto">
      <div role="group" aria-label="O que você vai fazer" className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
        {opcoes.map((opcao) => {
          const ativa = opcao.id === atividade
          return (
            <button
              key={opcao.id === null ? 'todas' : opcao.id}
              type="button"
              onClick={() => onEscolher(opcao.id)}
              aria-pressed={ativa}
              className={`inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-2.5 font-painel text-[0.95rem] sm:px-3.5 sm:text-base font-semibold uppercase tracking-[0.05em] transition-colors duration-150 sm:justify-start ${
                ativa
                  ? 'border-tinta bg-tinta text-noite'
                  : 'border-regua bg-placa text-tinta-2 hover:border-regua-forte hover:text-tinta'
              }`}
            >
              {opcao.id && <Icone nome={ICONES[opcao.id]} tamanho={17} className="hidden sm:block" />}
              {opcao.nome}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-sm text-tinta-2" aria-live="polite">
        {escolhida.resumo}
        {(escolhida.id === 'grupo' || escolhida.id === 'video') && '. Mais mesas livres melhoram a posição; mesa parcialmente ocupada não conta.'}
      </p>
    </div>
  )
}

export default SeletorAtividade
