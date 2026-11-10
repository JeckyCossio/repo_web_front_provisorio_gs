import Icone from './Icone.jsx'

/**
 * O que aparece quando os filtros não deixam nenhuma sala. Ensina o próximo passo.
 * @param {{ onLimpar: () => void }} props
 */
const EstadoVazio = ({ onLimpar }) => (
  <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-regua-forte bg-moldura px-5 py-8 sm:items-center sm:text-center">
    <Icone nome="filtro" tamanho={28} className="text-tinta-3" />
    <div>
      <p className="text-lg font-semibold text-tinta">Nenhuma sala com esses filtros</p>
      <p className="mt-1 text-sm text-tinta-2">Afrouxe um dos intervalos, ou limpe tudo para ver as nove salas de novo.</p>
    </div>
    <button
      type="button"
      onClick={onLimpar}
      className="h-10 rounded-md bg-tinta px-4 text-sm font-semibold text-noite hover:bg-tinta-2"
    >
      Limpar filtros
    </button>
  </div>
)

export default EstadoVazio
