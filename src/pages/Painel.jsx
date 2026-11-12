import { useState } from 'react'
import CabecalhoPainel from '../components/CabecalhoPainel.jsx'
import EstadoVazio from '../components/EstadoVazio.jsx'
import Icone from '../components/Icone.jsx'
import PainelFiltros, { BarraFiltros } from '../components/PainelFiltros.jsx'
import PainelListas from '../components/PainelListas.jsx'
import QuadroSalas from '../components/QuadroSalas.jsx'
import Rodape from '../components/Rodape.jsx'
import SeletorAtividade from '../components/SeletorAtividade.jsx'
import { useColecoes } from '../hooks/useColecoes.js'
import { useFiltros } from '../hooks/useFiltros.js'
import { useSalas } from '../hooks/useSalas.js'
import { ATIVIDADES } from '../utils/ranking.js'

// Combina salas, filtros e listas na tela principal.
const Painel = ({ matricula, onSair }) => {
  const salas = useSalas()
  const colecoes = useColecoes()
  const filtros = useFiltros(salas.itens, colecoes.favoritos)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  // Anima as linhas a partir da primeira troca de atividade.
  const [versaoOrdem, setVersaoOrdem] = useState(0)
  // Seleciona a atividade e registra a troca para animar as linhas.
  const escolherAtividade = (id) => {
    if (id === filtros.atividade) return
    filtros.escolherAtividade(id)
    setVersaoOrdem(versaoOrdem + 1)
  }

  const atividadeEscolhida = ATIVIDADES.find((atividade) => atividade.id === filtros.atividade)
  const conexaoPendente = salas.modo === 'pendente'

  return (
    <div className="flex min-h-dvh flex-col">
      <CabecalhoPainel matricula={matricula} totalListas={colecoes.listas.length} onSair={onSair} />

      <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <h1 className="font-painel text-[2rem] font-bold uppercase leading-none tracking-[0.03em] text-tinta xl:text-[2.25rem]">
            Salas de estudo agora
          </h1>
          <p className="max-w-[62ch] text-sm text-tinta-2">
            <span className="text-tinta">S01</span>{' '}
            {conexaoPendente
              ? 'aguarda a primeira leitura do protótipo no Wokwi.'
              : 'mostra a última leitura do protótipo no Wokwi, recebida pelo Supabase.'}{' '}
            <span className="text-tinta">S02 a S09</span> têm simulações locais dinâmicas.
          </p>
        </div>

        {(salas.aviso || salas.erro) && (
          <div role="status" className="mt-4 flex flex-col gap-1 rounded-md border border-atencao/50 bg-moldura px-3 py-2.5 text-sm">
            {salas.aviso && (
              <p className="flex items-start gap-1.5 text-atencao">
                <Icone nome="alerta" tamanho={16} className="mt-0.5" />
                <span className="min-w-0 wrap-anywhere">{salas.aviso}</span>
              </p>
            )}
            {salas.erro && (
              <p className="flex items-start gap-1.5 text-atencao">
                <Icone nome="alerta" tamanho={16} className="mt-0.5" />
                <span className="min-w-0 wrap-anywhere">{salas.erro} A S01 continua com a última leitura recebida.</span>
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <SeletorAtividade atividades={ATIVIDADES} atividade={filtros.atividade} onEscolher={escolherAtividade} />
          <BarraFiltros
            aberto={filtrosAbertos}
            onAlternar={() => setFiltrosAbertos(!filtrosAbertos)}
            totalAtivos={filtros.totalAtivos}
            onLimpar={filtros.limparFiltros}
            quantidade={filtros.resultado.length}
            total={salas.itens.length}
          />
        </div>

        {filtrosAbertos && (
          <div className="mt-3">
            <PainelFiltros filtros={filtros.filtros} onAlterar={filtros.alterarFiltro} />
          </div>
        )}

        <section aria-label="Painel das salas" className="mt-4">
          {salas.carregando ? (
            <ul className="flex flex-col gap-3" aria-label="Carregando as salas">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="placa h-24 animate-pulse rounded-md border border-regua" />
              ))}
            </ul>
          ) : filtros.resultado.length === 0 ? (
            <EstadoVazio onLimpar={filtros.limparFiltros} />
          ) : (
            <QuadroSalas
              itens={filtros.resultado}
              atividade={filtros.atividade}
              nomeAtividade={atividadeEscolhida ? atividadeEscolhida.nome : ''}
              versaoOrdem={versaoOrdem}
              colecoes={colecoes}
              erroApi={salas.erro}
            />
          )}
        </section>

        <div className="mt-10">
          <PainelListas colecoes={colecoes} salas={salas.itens.map((item) => item.sala)} />
        </div>
      </main>

      <Rodape />
    </div>
  )
}

export default Painel
