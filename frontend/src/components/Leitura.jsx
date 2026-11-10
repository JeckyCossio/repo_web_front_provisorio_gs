import Icone from './Icone.jsx'
import TextoPalheta from './TextoPalheta.jsx'
import { NOME_FAIXA, NOME_SEVERIDADE, formatarNumero } from '../utils/formatar.js'

const COR = {
  adequado: 'text-ok',
  atencao: 'text-atencao',
  critico: 'text-critico',
  invalido: 'text-falha',
}
const ICONE = { adequado: 'check', atencao: 'alerta', critico: 'critico', invalido: 'semLeitura' }

/**
 * Uma leitura do ambiente (temperatura, luz ou ruído): o valor, a unidade, a SEVERIDADE
 * (se serve para usar) e a FAIXA (onde o valor está na escala). As duas são coisas diferentes:
 * uma sala fria fica na faixa "baixo" e na severidade "atenção". Uma faixa baixa não implica condição adequada.
 * @param {{ icone: string, rotulo: string, unidade: string, indicador: { valor, faixa, severidade },
 *   casas?: number, indice?: number|null }} props
 *   indice: o índice de ruído de 0 a 100 (só no ruído), mostrado ao lado da unidade
 */
const Leitura = ({ icone, rotulo, unidade, indicador, casas = 1, indice = null }) => {
  const { valor, faixa, severidade } = indicador
  const semValor = severidade === 'invalido' || valor === null || valor === undefined
  const textoValor = formatarNumero(valor, casas)

  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-tinta-3 xl:sr-only">
        <Icone nome={icone} tamanho={14} />
        {rotulo}
      </p>
      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1 xl:mt-0">
        <span className="numeros font-painel text-2xl font-semibold leading-none text-tinta">
          <TextoPalheta texto={textoValor} />
        </span>
        {!semValor && <span className="text-sm text-tinta-2">{unidade}</span>}
        {!semValor && indice !== null && (
          <span
            className="numeros basis-full whitespace-nowrap text-[0.8125rem] text-tinta-3 xl:basis-auto"
            aria-label={`índice ${indice} de 100`}
          >
            <span className="xl:hidden">índice </span>
            <span className="hidden xl:inline">· </span>
            {formatarNumero(indice, 0)}/100
          </span>
        )}
      </p>
      <p className={`mt-1 text-sm leading-tight xl:whitespace-nowrap ${COR[severidade] || COR.invalido}`}>
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Icone nome={ICONE[severidade] || ICONE.invalido} tamanho={14} />
          {NOME_SEVERIDADE[severidade] || NOME_SEVERIDADE.invalido}
        </span>
        {faixa && (
          <span className="block whitespace-nowrap text-tinta-3 xl:inline">
            <span className="hidden xl:inline"> · </span>
            {NOME_FAIXA[faixa]}
          </span>
        )}
      </p>
    </div>
  )
}

export default Leitura
