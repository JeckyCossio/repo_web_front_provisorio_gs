import { useState } from 'react'
import Icone from './Icone.jsx'

/**
 * Põe ou tira UMA sala das listas, e cria uma lista nova ali mesmo.
 * Abre dentro da própria linha da sala (sem janela por cima), para o estudante não perder o lugar.
 * @param {{ sala: object, listas: { id, name, room_ids }[], onAdicionar, onRemover,
 *   onCriar: (nome) => { ok, erro, id }, onFechar: () => void }} props
 */
const SeletorListas = ({ sala, listas, onAdicionar, onRemover, onCriar, onFechar }) => {
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState(null)

  const criar = (evento) => {
    evento.preventDefault()
    const resposta = onCriar(nome)
    if (!resposta.ok) {
      setErro(resposta.erro)
      return
    }
    // A lista nova já recebe a sala: é para isso que o estudante criou.
    onAdicionar(resposta.id, sala.id)
    setNome('')
    setErro(null)
  }

  return (
    <div className="rounded-md border border-regua bg-moldura p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-tinta">Listas com a {sala.nome}</p>
        <button
          type="button"
          onClick={onFechar}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-tinta-2 hover:text-tinta"
        >
          <Icone nome="fechar" tamanho={15} />
          Fechar
        </button>
      </div>

      {listas.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {listas.map((lista) => {
            const marcada = lista.room_ids.includes(sala.id)
            return (
              <li key={lista.id}>
                <label
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors duration-150 ${
                    marcada ? 'border-tinta/60 bg-placa-alta text-tinta' : 'border-regua text-tinta-2 hover:border-regua-forte'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() => (marcada ? onRemover(lista.id, sala.id) : onAdicionar(lista.id, sala.id))}
                    className="size-4 accent-[var(--color-tinta)]"
                  />
                  {lista.name}
                </label>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-tinta-3">Você ainda não tem listas. Crie a primeira e esta sala já entra nela.</p>
      )}

      <form onSubmit={criar} className="mt-3 flex flex-wrap items-start gap-2">
        <label className="sr-only" htmlFor={`nova-lista-${sala.id}`}>
          Nome da nova lista
        </label>
        <input
          id={`nova-lista-${sala.id}`}
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Nova lista, ex.: Grupo de quinta"
          maxLength={60}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `erro-lista-${sala.id}` : undefined}
          className="h-9 min-w-0 flex-1 rounded-md border border-regua bg-noite px-2.5 text-sm text-tinta placeholder:text-tinta-3 focus:border-tinta-2 sm:max-w-64"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-regua-forte px-3 text-sm font-medium text-tinta hover:bg-placa-alta"
        >
          <Icone nome="mais" tamanho={15} />
          Criar e adicionar
        </button>
        {erro && (
          <p id={`erro-lista-${sala.id}`} role="alert" className="w-full text-sm text-critico">
            {erro}
          </p>
        )}
      </form>
    </div>
  )
}

export default SeletorListas
