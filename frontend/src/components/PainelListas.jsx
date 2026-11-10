import { useState } from 'react'
import Icone from './Icone.jsx'
import { contar } from '../utils/formatar.js'

// Um botão pequeno de ação (renomear, excluir), sempre com texto além do ícone.
const BotaoAcao = ({ icone, children, onClick, perigo = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-150 ${
      perigo ? 'text-critico hover:bg-critico/10' : 'text-tinta-2 hover:bg-placa-alta hover:text-tinta'
    }`}
  >
    <Icone nome={icone} tamanho={15} />
    {children}
  </button>
)

// Uma lista: ver as salas, tirar uma sala, renomear e excluir (com confirmação ali mesmo).
const CartaoLista = ({ lista, nomes, onRenomear, onExcluir, onRemoverSala }) => {
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(lista.name)
  const [erro, setErro] = useState(null)
  const [confirmando, setConfirmando] = useState(false)

  const salvar = (evento) => {
    evento.preventDefault()
    const resposta = onRenomear(lista.id, nome)
    if (!resposta.ok) {
      setErro(resposta.erro)
      return
    }
    setEditando(false)
    setErro(null)
  }

  const cancelar = () => {
    setNome(lista.name)
    setErro(null)
    setEditando(false)
  }

  return (
    <li className="py-3.5">
      {editando ? (
        <form onSubmit={salvar} className="flex flex-wrap items-start gap-2">
          <label htmlFor={`renomear-${lista.id}`} className="sr-only">
            Novo nome da lista
          </label>
          <input
            id={`renomear-${lista.id}`}
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            maxLength={60}
            autoFocus
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? `erro-renomear-${lista.id}` : undefined}
            className="h-9 min-w-0 flex-1 rounded-md border border-regua bg-noite px-2.5 text-sm text-tinta focus:border-tinta-2"
          />
          <button type="submit" className="h-9 rounded-md bg-tinta px-3 text-sm font-semibold text-noite hover:bg-tinta-2">
            Salvar
          </button>
          <button type="button" onClick={cancelar} className="h-9 rounded-md px-3 text-sm text-tinta-2 hover:text-tinta">
            Cancelar
          </button>
          {erro && (
            <p id={`erro-renomear-${lista.id}`} role="alert" className="w-full text-sm text-critico">
              {erro}
            </p>
          )}
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="min-w-0 text-base font-semibold text-tinta">
            {lista.name}{' '}
            <span className="numeros text-sm font-normal text-tinta-3">· {contar(lista.room_ids.length, 'sala', 'salas')}</span>
          </h3>
          {!confirmando && (
            <div className="flex">
              <BotaoAcao icone="lapis" onClick={() => setEditando(true)}>
                Renomear
              </BotaoAcao>
              <BotaoAcao icone="lixeira" perigo onClick={() => setConfirmando(true)}>
                Excluir
              </BotaoAcao>
            </div>
          )}
        </div>
      )}

      {confirmando && (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-critico/10 p-2.5">
          <p className="mr-auto text-sm text-tinta">Excluir a lista “{lista.name}”? As salas não somem do painel.</p>
          <button
            type="button"
            onClick={() => onExcluir(lista.id)}
            className="h-9 rounded-md bg-critico px-3 text-sm font-semibold text-noite hover:bg-critico/90"
          >
            Excluir lista
          </button>
          <button type="button" onClick={() => setConfirmando(false)} className="h-9 rounded-md px-3 text-sm text-tinta-2 hover:text-tinta">
            Manter
          </button>
        </div>
      )}

      {lista.room_ids.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {lista.room_ids.map((salaId) => (
            <li key={salaId} className="inline-flex items-center gap-1 rounded-md border border-regua bg-noite py-1 pl-2.5 pr-1 text-sm text-tinta">
              <span className="numeros font-painel font-semibold">{salaId}</span>
              <span className="text-tinta-2">{nomes[salaId]}</span>
              <button
                type="button"
                onClick={() => onRemoverSala(lista.id, salaId)}
                aria-label={`Tirar a ${salaId} da lista ${lista.name}`}
                className="grid size-7 place-items-center rounded text-tinta-3 hover:bg-placa-alta hover:text-tinta"
              >
                <Icone nome="fechar" tamanho={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-sm text-tinta-3">Lista vazia. Use o botão de lista em qualquer sala do painel para incluir.</p>
      )}
    </li>
  )
}

/**
 * "Minhas listas": os favoritos e o CRUD das listas, tudo guardado só neste navegador.
 */
const PainelListas = ({ colecoes, salas }) => {
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState(null)
  const nomes = {}
  for (const sala of salas) {
    nomes[sala.id] = sala.nome.replace('Sala de Estudo ', 'Sala ')
  }

  const criar = (evento) => {
    evento.preventDefault()
    const resposta = colecoes.criarLista(nome)
    if (!resposta.ok) {
      setErro(resposta.erro)
      return
    }
    setNome('')
    setErro(null)
  }

  return (
    <section id="minhas-listas" aria-labelledby="titulo-listas" className="scroll-mt-4 rounded-lg border border-regua bg-moldura p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-listas" className="font-painel text-2xl font-bold uppercase tracking-[0.04em] text-tinta">
          Minhas listas
        </h2>
        <p className="text-sm text-tinta-3">Salvas só neste navegador. Outro navegador ou perfil não vê.</p>
      </div>

      {colecoes.aviso && (
        <p role="status" className="mt-3 inline-flex items-center gap-1.5 text-sm text-atencao">
          <Icone nome="alerta" tamanho={15} />
          {colecoes.aviso}
        </p>
      )}

      <div className="mt-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.08em] text-tinta-2">
          <Icone nome="estrela" tamanho={15} preenchido />
          Favoritas
        </h3>
        {colecoes.favoritos.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {colecoes.favoritos.map((salaId) => (
              <li key={salaId} className="inline-flex items-center gap-1 rounded-md border border-regua bg-placa py-1 pl-2.5 pr-1 text-sm">
                <span className="numeros font-painel font-semibold text-tinta">{salaId}</span>
                <span className="text-tinta-2">{nomes[salaId]}</span>
                <button
                  type="button"
                  onClick={() => colecoes.alternarFavorito(salaId)}
                  aria-label={`Tirar a ${salaId} dos favoritos`}
                  className="grid size-7 place-items-center rounded text-tinta-3 hover:bg-placa-alta hover:text-tinta"
                >
                  <Icone nome="fechar" tamanho={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-sm text-tinta-3">Nenhuma favorita ainda. Toque na estrela de uma sala para guardar aqui.</p>
        )}
      </div>

      <form onSubmit={criar} className="mt-5 flex flex-wrap items-start gap-2">
        <label htmlFor="nome-nova-lista" className="w-full text-sm font-medium text-tinta">
          Nova lista
        </label>
        <input
          id="nome-nova-lista"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Ex.: Para gravar o vídeo"
          maxLength={60}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? 'erro-nova-lista' : undefined}
          className="h-10 min-w-0 flex-1 rounded-md border border-regua bg-noite px-3 text-base text-tinta placeholder:text-tinta-3 focus:border-tinta-2 sm:max-w-sm"
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-tinta px-4 text-sm font-semibold text-noite hover:bg-tinta-2"
        >
          <Icone nome="mais" tamanho={16} />
          Criar lista
        </button>
        {erro && (
          <p id="erro-nova-lista" role="alert" className="w-full text-sm text-critico">
            {erro}
          </p>
        )}
      </form>

      {colecoes.listas.length > 0 ? (
        <ul className="mt-5 divide-y divide-regua border-y border-regua">
          {colecoes.listas.map((lista) => (
            <CartaoLista
              key={lista.id}
              lista={lista}
              nomes={nomes}
              onRenomear={colecoes.renomearLista}
              onExcluir={colecoes.excluirLista}
              onRemoverSala={colecoes.removerSala}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-tinta-3">
          Junte salas para cada situação, como “Grupo de quinta” ou “Silêncio para prova”. Crie a lista aqui ou direto numa sala.
        </p>
      )}
    </section>
  )
}

export default PainelListas
