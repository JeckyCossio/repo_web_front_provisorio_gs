import Icone from './Icone.jsx'

// Os intervalos que dá para filtrar. Os dois limites são inclusivos: "3 a 6" aceita 3 e 6.
const INTERVALOS = [
  { titulo: 'Pessoas na sala', unidade: 'pessoas', min: 'ocupacaoMin', max: 'ocupacaoMax', passo: 1 },
  { titulo: 'Temperatura', unidade: '°C', min: 'temperaturaMin', max: 'temperaturaMax', passo: 0.5 },
  { titulo: 'Luz', unidade: 'lux estimado', min: 'luzMin', max: 'luzMax', passo: 10 },
  { titulo: 'Ruído', unidade: 'dB simulados', min: 'ruidoMin', max: 'ruidoMax', passo: 1 },
]

const CampoNumero = ({ id, rotulo, valor, passo, onAlterar }) => (
  <div className="min-w-0 flex-1">
    <label htmlFor={id} className="block text-xs text-tinta-3">
      {rotulo}
    </label>
    <input
      id={id}
      type="number"
      inputMode="decimal"
      step={passo}
      value={valor === null || valor === undefined ? '' : valor}
      onChange={(evento) => onAlterar(evento.target.value)}
      className="numeros mt-1 h-10 w-full rounded-md border border-regua bg-noite px-2.5 text-base text-tinta placeholder:text-tinta-3 focus:border-tinta-2"
      placeholder="—"
    />
  </div>
)

/**
 * O botão que abre e fecha os filtros, a contagem e o "Limpar filtros". Fica na mesma linha
 * dos atalhos de atividade, para o painel começar mais alto na tela.
 * @param {{ aberto: boolean, onAlternar: () => void, totalAtivos: number, onLimpar: () => void,
 *   quantidade: number, total: number }} props
 */
export const BarraFiltros = ({ aberto, onAlternar, totalAtivos, onLimpar, quantidade, total }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
    <button
      type="button"
      onClick={onAlternar}
      aria-expanded={aberto}
      aria-controls="campos-filtro"
      className={`inline-flex h-11 items-center gap-2 rounded-md border px-3 font-painel text-base font-semibold uppercase tracking-[0.05em] transition-colors duration-150 ${
        aberto || totalAtivos > 0 ? 'border-tinta/60 bg-placa-alta text-tinta' : 'border-regua bg-placa text-tinta-2 hover:border-regua-forte hover:text-tinta'
      }`}
    >
      <Icone nome="filtro" tamanho={18} />
      Filtros
      {totalAtivos > 0 && (
        <span className="numeros grid h-5 min-w-5 place-items-center rounded-full bg-tinta px-1.5 font-sans text-xs font-bold text-noite">
          {totalAtivos}
        </span>
      )}
      <Icone nome="seta" tamanho={16} className={`transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
    </button>
    <p className="numeros text-sm text-tinta-2" aria-live="polite">
      {quantidade} de {total} salas
    </p>
    {totalAtivos > 0 && (
      <button
        type="button"
        onClick={onLimpar}
        className="h-11 rounded-md px-2 text-sm font-medium text-tinta underline decoration-regua-forte underline-offset-4 hover:decoration-tinta"
      >
        Limpar filtros
      </button>
    )}
  </div>
)

/**
 * Os campos dos filtros manuais. Abrem na própria página (sem janela por cima).
 * @param {{ filtros: object, onAlterar: (campo, valor) => void }} props
 */
const PainelFiltros = ({ filtros, onAlterar }) => (
  <section
    id="campos-filtro"
    aria-label="Filtros"
    className="grid gap-4 rounded-lg border border-regua bg-moldura p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
  >
    {INTERVALOS.map((intervalo) => (
      <fieldset key={intervalo.min} className="min-w-0">
        <legend className="text-sm font-medium text-tinta">
          {intervalo.titulo} <span className="font-normal text-tinta-3">({intervalo.unidade})</span>
        </legend>
        <div className="mt-1.5 flex items-end gap-2">
          <CampoNumero
            id={`filtro-${intervalo.min}`}
            rotulo="de"
            valor={filtros[intervalo.min]}
            passo={intervalo.passo}
            onAlterar={(valor) => onAlterar(intervalo.min, valor)}
          />
          <CampoNumero
            id={`filtro-${intervalo.max}`}
            rotulo="até"
            valor={filtros[intervalo.max]}
            passo={intervalo.passo}
            onAlterar={(valor) => onAlterar(intervalo.max, valor)}
          />
        </div>
      </fieldset>
    ))}
    <fieldset className="flex flex-col justify-end gap-2 sm:col-span-2 xl:col-span-1">
      <legend className="sr-only">Outras condições</legend>
      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-tinta">
        <input
          type="checkbox"
          checked={filtros.exigirMesaLivre}
          onChange={(evento) => onAlterar('exigirMesaLivre', evento.target.checked)}
          className="size-4 accent-[var(--color-tinta)]"
        />
        Pelo menos 1 mesa totalmente livre
      </label>
      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-tinta">
        <input
          type="checkbox"
          checked={filtros.somenteFavoritas}
          onChange={(evento) => onAlterar('somenteFavoritas', evento.target.checked)}
          className="size-4 accent-[var(--color-tinta)]"
        />
        Só as favoritas
      </label>
    </fieldset>
  </section>
)

export default PainelFiltros
