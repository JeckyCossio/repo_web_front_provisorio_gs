import { useState } from 'react'
import BotaoFavorito from './BotaoFavorito.jsx'
import Icone from './Icone.jsx'
import Leitura from './Leitura.jsx'
import MapaMesas from './MapaMesas.jsx'
import SeletorListas from './SeletorListas.jsx'
import SeloOrigem from './SeloOrigem.jsx'
import SeloSituacao from './SeloSituacao.jsx'
import TextoPalheta from './TextoPalheta.jsx'
import { GRADE } from './gradePainel.js'
import { NOME_PORTE, contar } from '../utils/formatar.js'

const POSICOES = {
  comRanking: {
    sala: 'xl:col-start-2',
    mesas: 'xl:col-start-3',
    temperatura: 'xl:col-start-4',
    luz: 'xl:col-start-5',
    ruido: 'xl:col-start-6',
    situacao: 'xl:col-start-7',
    acoes: 'xl:col-start-8',
    largura: 'xl:col-start-2 xl:col-end-[-1]',
  },
  semRanking: {
    sala: 'xl:col-start-1',
    mesas: 'xl:col-start-2',
    temperatura: 'xl:col-start-3',
    luz: 'xl:col-start-4',
    ruido: 'xl:col-start-5',
    situacao: 'xl:col-start-6',
    acoes: 'xl:col-start-7',
    largura: 'xl:col-start-1 xl:col-end-[-1]',
  },
}

const CELULA = 'xl:row-start-1 xl:flex xl:min-h-16 xl:flex-col xl:justify-center xl:py-2'
const COM_REGUA = 'regua-esquerda xl:pl-3'

// Exibe as leituras e as ações de uma sala no painel.
const LinhaSala = ({
  item,
  atividade,
  ordem,
  animar,
  favorita,
  onAlternarFavorito,
  listas,
  onAdicionarNaLista,
  onRemoverDaLista,
  onCriarLista,
  erroApi,
}) => {
  const [mostrarListas, setMostrarListas] = useState(false)
  const { sala, classificacao, desatualizada, avaliacao, posicao } = item
  const { ocupacao, temperatura, luz, ruido } = classificacao
  const comRanking = Boolean(atividade)
  const col = comRanking ? POSICOES.comRanking : POSICOES.semRanking
  const melhor = posicao === 1
  const listasComASala = listas.filter((lista) => lista.room_ids.includes(sala.id)).length

  return (
    <li
      className={`${animar ? 'linha-entrando' : ''} placa grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-3 rounded-md border p-3 sm:p-4 xl:gap-x-3 xl:gap-y-0 xl:rounded-none xl:border-0 xl:px-4 xl:py-0 regua-baixo ${
        comRanking ? GRADE.comRanking : GRADE.semRanking
      } ${melhor ? 'border-melhor/80 bg-melhor/8 xl:outline xl:outline-1 xl:-outline-offset-1 xl:outline-melhor/80' : 'border-regua'}`}
      style={{ '--ordem': ordem }}
    >
      {comRanking && (
        <div className={`row-start-1 items-start xl:col-start-1 xl:items-center ${CELULA} ${posicao ? 'flex' : 'hidden xl:flex'}`}>
          {posicao && (
            <span
              className={`palheta numeros min-w-[2.1em] text-xl font-bold ${
                melhor ? 'bg-none bg-melhor text-melhor-tinta' : 'text-tinta'
              }`}
              aria-label={`${posicao}º lugar`}
            >
              <TextoPalheta texto={`${posicao}º`} />
            </span>
          )}
        </div>
      )}

      <div className={`row-start-1 min-w-0 ${posicao ? '' : 'col-span-2'} xl:col-span-1 ${col.sala} ${CELULA} ${comRanking ? COM_REGUA : ''}`}>
        <h2 className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="sr-only">{sala.nome}</span>
          <span aria-hidden="true" className="flex gap-[3px] text-lg font-bold text-tinta">
            {sala.id.split('').map((letra, i) => (
              <span key={i} className="palheta">
                {letra}
              </span>
            ))}
            {favorita && (
              <span className="palheta ml-1 text-tinta" title="Favorita">
                <Icone nome="estrela" tamanho={13} preenchido />
              </span>
            )}
          </span>
          {favorita && <span className="sr-only">(favorita)</span>}
          <span aria-hidden="true" className="text-base font-medium text-tinta">
            {sala.nome.replace('Sala de Estudo ', 'Sala ')}
          </span>
          <span className="text-sm text-tinta-3">
            {NOME_PORTE[sala.porte]} · {sala.mesas ? sala.mesas.length : '—'} mesas
          </span>
        </h2>
        <div className="mt-1.5 xl:mt-1">
          <SeloOrigem sala={sala} desatualizada={desatualizada} erroApi={erroApi} />
        </div>
      </div>

      <div className={`col-start-3 row-start-1 justify-self-end xl:justify-self-stretch ${col.situacao} ${CELULA} ${COM_REGUA}`}>
        <SeloSituacao estado={classificacao.estado} />
      </div>

      <div className={`col-span-2 row-start-2 xl:col-span-1 ${col.mesas} ${CELULA} ${COM_REGUA}`}>
        <MapaMesas mesas={sala.mesas} />
        {ocupacao.total !== null && (
          <p className="numeros mt-1.5 text-sm text-tinta-2 xl:mt-1">
            <TextoPalheta texto={contar(ocupacao.vagas, 'lugar vago', 'lugares vagos')} /> de {ocupacao.capacidade} ·{' '}
            <span className={ocupacao.mesasVazias > 0 ? 'text-ok' : 'text-tinta-3'}>
              <TextoPalheta texto={contar(ocupacao.mesasVazias, 'mesa livre', 'mesas livres')} />
            </span>
          </p>
        )}
      </div>

      <div className={`col-start-3 row-start-2 flex items-start justify-end gap-2 xl:flex-row xl:items-center ${col.acoes} ${CELULA} ${COM_REGUA}`}>
        <button
          type="button"
          onClick={() => setMostrarListas(!mostrarListas)}
          aria-expanded={mostrarListas}
          aria-label={`Listas com a ${sala.nome}${listasComASala ? ` (em ${listasComASala})` : ''}`}
          title="Pôr numa lista"
          className={`relative grid size-10 place-items-center rounded-md border transition-colors duration-150 ${
            mostrarListas || listasComASala
              ? 'border-tinta/60 bg-placa-alta text-tinta'
              : 'border-regua text-tinta-3 hover:border-regua-forte hover:text-tinta'
          }`}
        >
          <Icone nome="lista" tamanho={19} />
          {listasComASala > 0 && (
            <span className="numeros absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-tinta text-[0.65rem] font-bold text-noite">
              {listasComASala}
            </span>
          )}
        </button>
        <BotaoFavorito favorita={favorita} nomeSala={sala.nome} onAlternar={onAlternarFavorito} />
      </div>

      <div className="col-span-3 row-start-3 flex flex-wrap gap-3 border-t border-regua pt-3 xl:contents">
        <div className={`min-w-0 flex-1 basis-16 ${col.temperatura} ${CELULA} ${COM_REGUA}`}>
          <Leitura icone="termometro" rotulo="Temperatura" unidade="°C" indicador={temperatura} />
        </div>
        <div className={`min-w-0 flex-1 basis-16 ${col.luz} ${CELULA} ${COM_REGUA}`}>
          <Leitura icone="sol" rotulo="Luz" unidade="lux est." indicador={luz} casas={0} />
        </div>
        <div className={`min-w-0 flex-1 basis-16 ${col.ruido} ${CELULA} ${COM_REGUA}`}>
          <Leitura icone="som" rotulo="Ruído" unidade="dB sim." indicador={ruido} casas={0} indice={ruido.indice} />
        </div>
      </div>

      {comRanking && avaliacao && (
        <div className={`col-span-3 row-start-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm xl:row-start-2 xl:pb-2.5 ${col.largura}`}>
          {melhor && (
            <span className="font-painel font-semibold uppercase tracking-[0.08em] text-melhor">Melhor agora</span>
          )}
          {avaliacao.elegivel ? (
            <>
              {avaliacao.motivos.map((motivo) => (
                <span key={motivo} className="text-tinta-2">
                  {motivo}
                </span>
              ))}
              <span className="numeros text-tinta-3">· {avaliacao.pontuacao} de 100 pontos</span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-tinta-2">
              <Icone nome="fechar" tamanho={14} />
              Não serve: {avaliacao.eliminadaPor}
            </span>
          )}
        </div>
      )}

      {mostrarListas && (
        <div className={`col-span-3 row-start-5 xl:row-start-3 xl:pb-3 ${col.largura}`}>
          <SeletorListas
            sala={sala}
            listas={listas}
            onAdicionar={onAdicionarNaLista}
            onRemover={onRemoverDaLista}
            onCriar={onCriarLista}
            onFechar={() => setMostrarListas(false)}
          />
        </div>
      )}
    </li>
  )
}

export default LinhaSala
