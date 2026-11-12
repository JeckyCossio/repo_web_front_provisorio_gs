import { contar } from '../utils/formatar.js'

const LUGARES_POR_MESA = 3

// Cada mesa tem três lugares; apenas mesas vazias recebem o destaque de livre.
const MapaMesas = ({ mesas }) => {
  if (!Array.isArray(mesas)) {
    return <p className="text-sm text-tinta-3">Sem leitura das mesas</p>
  }

  const ocupados = mesas.reduce((soma, pessoas) => soma + pessoas, 0)
  const livres = mesas.filter((pessoas) => pessoas === 0).length
  const descricao = `${contar(mesas.length, 'mesa', 'mesas')}, ${contar(
    ocupados,
    'pessoa sentada',
    'pessoas sentadas',
  )}, ${contar(livres, 'mesa totalmente livre', 'mesas totalmente livres')}. ${mesas
    .map((pessoas, i) => `Mesa ${i + 1}: ${pessoas} de ${LUGARES_POR_MESA}`)
    .join('; ')}.`

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={descricao}>
      {mesas.map((pessoas, indice) => {
        const livre = pessoas === 0
        return (
          <li
            key={indice}
            aria-hidden="true"
            className={`flex flex-col items-center rounded-[4px] border px-1.5 pb-1 pt-1.5 xl:p-1 ${
              livre ? 'border-ok/80' : 'border-regua'
            }`}
          >
            <span className="flex gap-[3px]">
              {[0, 1, 2].map((lugar) => (
                <span
                  key={lugar}
                  className={`size-2.5 rounded-[2px] ${
                    lugar < pessoas ? 'bg-tinta-2' : 'border border-tinta-3/70'
                  }`}
                />
              ))}
            </span>
            <span className={`mt-1 text-[0.7rem] leading-none xl:hidden ${livre ? 'text-ok' : 'text-tinta-3'}`}>
              {livre ? 'livre' : `${pessoas}/${LUGARES_POR_MESA}`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default MapaMesas
