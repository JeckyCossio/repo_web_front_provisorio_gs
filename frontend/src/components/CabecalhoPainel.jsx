import Icone from './Icone.jsx'
import Relogio from './Relogio.jsx'

/**
 * O topo do painel: o nome, o relógio, quem entrou, o atalho para as listas e o "Sair".
 * @param {{ matricula: string, totalListas: number, onSair: () => void }} props
 */
const CabecalhoPainel = ({ matricula, totalListas, onSair }) => (
  <header className="border-b border-regua bg-moldura">
    <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
      <p className="font-painel text-2xl font-bold uppercase leading-none tracking-[0.04em] text-tinta">
        Study Comfort
      </p>
      <div className="order-3 w-full sm:order-none sm:w-auto">
        <Relogio />
      </div>
      <nav aria-label="Conta e listas" className="flex items-center gap-2">
        <span className="hidden text-sm text-tinta-3 md:inline">
          {matricula} <span className="text-tinta-3">(demonstração)</span>
        </span>
        <a
          href="#minhas-listas"
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-regua px-3 text-sm font-medium text-tinta no-underline hover:border-regua-forte hover:bg-placa"
        >
          <Icone nome="lista" tamanho={17} />
          Minhas listas
          <span className="numeros text-tinta-3">{totalListas}</span>
        </a>
        <button
          type="button"
          onClick={onSair}
          className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-tinta-2 hover:bg-placa hover:text-tinta"
        >
          <Icone nome="sair" tamanho={17} />
          Sair
        </button>
      </nav>
    </div>
  </header>
)

export default CabecalhoPainel
