import { useState } from 'react'
import Icone from '../components/Icone.jsx'

const TITULO = ['STUDY', 'COMFORT']

// O que o painel mostra, em três linhas no estilo do próprio painel.
const DESTAQUES = [
  { icone: 'lista', texto: 'Mesa por mesa: quantos lugares vagos e quais mesas estão totalmente livres' },
  { icone: 'termometro', texto: 'Temperatura, luz e ruído de cada sala, com o que está bom e o que não está' },
  { icone: 'estrela', texto: 'A melhor sala para estudar sozinho, em grupo ou gravar um vídeo' },
]

/**
 * A entrada de demonstração. Não existe cadastro: há uma matrícula e uma senha fictícias,
 * mostradas na própria tela, porque o login só existe para a demonstração (não protege nada).
 * @param {{ credenciaisDemo: { matricula, senha }, onEntrar: (matricula, senha) => { ok, erro } }} props
 */
const Login = ({ credenciaisDemo, onEntrar }) => {
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)

  const entrar = (evento) => {
    evento.preventDefault()
    const resposta = onEntrar(matricula, senha)
    if (!resposta.ok) {
      setErro(resposta.erro)
    }
  }

  const preencher = () => {
    setMatricula(credenciaisDemo.matricula)
    setSenha(credenciaisDemo.senha)
    setErro(null)
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[72rem] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_minmax(0,26rem)] lg:gap-16">
      <div>
        <h1
          aria-label="Study Comfort"
          className="flex flex-wrap gap-x-4 gap-y-3 text-[2.6rem] font-bold leading-none text-tinta sm:text-[3.6rem] lg:text-[4.4rem]"
        >
          {TITULO.map((palavra) => (
            <span key={palavra} aria-hidden="true" className="flex gap-1">
              {palavra.split('').map((letra, i) => (
                <span key={i} className="palheta">
                  {letra}
                </span>
              ))}
            </span>
          ))}
        </h1>
        <p className="mt-6 max-w-[36ch] text-xl leading-snug text-tinta-2">
          Antes de subir o andar, veja qual sala serve para o que você vai fazer agora.
        </p>
        <ul className="mt-8 hidden max-w-[44ch] divide-y divide-regua border-y border-regua sm:block">
          {DESTAQUES.map((destaque) => (
            <li key={destaque.icone} className="flex items-start gap-3 py-3 text-base text-tinta-2">
              <Icone nome={destaque.icone} tamanho={20} className="mt-0.5 text-tinta" />
              {destaque.texto}
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full">
        <form onSubmit={entrar} noValidate className="rounded-lg border border-regua bg-moldura p-5 sm:p-6">
          <h2 className="font-painel text-xl font-bold uppercase tracking-[0.05em] text-tinta">Entrar</h2>
          <div className="mt-4">
            <label htmlFor="matricula" className="block text-sm font-medium text-tinta">
              Matrícula
            </label>
            <input
              id="matricula"
              name="matricula"
              autoComplete="username"
              value={matricula}
              onChange={(evento) => setMatricula(evento.target.value)}
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? 'erro-login' : undefined}
              className="numeros mt-1.5 h-11 w-full rounded-md border border-regua bg-noite px-3 text-base text-tinta placeholder:text-tinta-3 focus:border-tinta-2"
              placeholder="RM000000"
            />
          </div>
          <div className="mt-4">
            <label htmlFor="senha" className="block text-sm font-medium text-tinta">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? 'erro-login' : undefined}
              className="mt-1.5 h-11 w-full rounded-md border border-regua bg-noite px-3 text-base text-tinta focus:border-tinta-2"
            />
          </div>

          {erro && (
            <p id="erro-login" role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-critico">
              <Icone nome="alerta" tamanho={16} className="mt-0.5" />
              {erro}
            </p>
          )}

          <button
            type="submit"
            className="mt-5 h-11 w-full rounded-md bg-tinta font-painel text-lg font-bold uppercase tracking-[0.06em] text-noite hover:bg-tinta-2"
          >
            Entrar no painel
          </button>
        </form>

        <div className="mt-4 rounded-lg border border-dashed border-regua-forte p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-tinta">
            <Icone nome="cadeado" tamanho={16} />
            Acesso de demonstração
          </p>
          <p className="numeros mt-1 text-sm text-tinta-2">
            Matrícula <strong className="font-semibold text-tinta">{credenciaisDemo.matricula}</strong> · senha{' '}
            <strong className="font-semibold text-tinta">{credenciaisDemo.senha}</strong>
          </p>
          <button
            type="button"
            onClick={preencher}
            className="mt-3 h-10 rounded-md border border-regua px-3 text-sm font-medium text-tinta hover:border-regua-forte hover:bg-placa"
          >
            Preencher para mim
          </button>
          <p className="mt-3 text-sm text-tinta-3">
            Não há cadastro nem segurança real: o login só existe para a demonstração do protótipo.
          </p>
        </div>
      </div>
    </main>
  )
}

export default Login
