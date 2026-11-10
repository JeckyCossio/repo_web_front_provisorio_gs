import Icone from './Icone.jsx'

/**
 * A estrela de favorito. O aria-pressed conta para o leitor de tela se ela está marcada.
 * @param {{ favorita: boolean, nomeSala: string, onAlternar: () => void }} props
 */
const BotaoFavorito = ({ favorita, nomeSala, onAlternar }) => {
  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-pressed={favorita}
      aria-label={favorita ? `Tirar ${nomeSala} dos favoritos` : `Favoritar ${nomeSala}`}
      title={favorita ? 'Tirar dos favoritos' : 'Favoritar'}
      className={`grid size-10 place-items-center rounded-md border transition-colors duration-150 ${
        favorita
          ? 'border-tinta/60 bg-placa-alta text-tinta'
          : 'border-regua text-tinta-3 hover:border-regua-forte hover:text-tinta'
      }`}
    >
      <Icone nome="estrela" tamanho={19} preenchido={favorita} />
    </button>
  )
}

export default BotaoFavorito
