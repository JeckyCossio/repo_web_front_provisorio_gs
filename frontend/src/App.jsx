import Login from './pages/Login.jsx'
import Painel from './pages/Painel.jsx'
import { CREDENCIAIS_DEMO } from './utils/sessao.js'
import { useSessaoDemo } from './hooks/useSessaoDemo.js'

// O App só decide qual tela mostrar: a entrada de demonstração ou o painel das salas.
const App = () => {
  const sessao = useSessaoDemo()

  if (!sessao.logado) {
    return <Login credenciaisDemo={CREDENCIAIS_DEMO} onEntrar={sessao.entrar} />
  }

  return <Painel matricula={sessao.matricula} onSair={sessao.sair} />
}

export default App
