import Icone from './Icone.jsx'
import { formatarHora } from '../utils/formatar.js'
import { lerDataIso } from '../utils/atualizacao.js'

const ORIGEM = {
  iot: { icone: 'antena', texto: 'Protótipo Wokwi', cor: 'text-tinta' },
  demo: { icone: 'arquivo', texto: 'Simulação local dinâmica', cor: 'text-tinta-3' },
}

const STATUS = {
  sem_leitura: 'Aguardando a primeira leitura',
  dados_invalidos: 'Leitura recebida com dados inválidos',
  offline: 'Dispositivo offline',
  sensor_error: 'Falha no sensor',
}

// Mostra a origem da leitura e os avisos de conexão.
const SeloOrigem = ({ sala, desatualizada, erroApi = null }) => {
  const origem = ORIGEM[sala.origem] || ORIGEM.demo
  const ehAoVivo = sala.origem === 'iot'
  const hora = formatarHora(lerDataIso(sala.atualizadoEm), true)
  const statusRuim = sala.statusDispositivo && sala.statusDispositivo !== 'ok'

  let frescor = null
  if (ehAoVivo) {
    if (statusRuim) {
      frescor = (
        <span className="inline-flex items-center gap-1 text-falha">
          <Icone nome="semLeitura" tamanho={14} />
          {STATUS[sala.statusDispositivo] || 'Sem leitura confiável'}
        </span>
      )
    } else if (desatualizada) {
      frescor = (
        <span className="inline-flex items-center gap-1 text-atencao">
          <Icone nome="relogio" tamanho={14} />
          Sem novas leituras · últimos dados às {hora}
        </span>
      )
    } else {
      frescor = (
        <span className="numeros inline-flex items-center gap-1 text-tinta-2">
          <Icone nome="relogio" tamanho={14} />
          Última leitura às {hora}
        </span>
      )
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
      <span className={`inline-flex items-center gap-1 ${origem.cor}`}>
        <Icone nome={origem.icone} tamanho={14} />
        {origem.texto}
      </span>
      {frescor}
      {ehAoVivo && erroApi && (
        <span className="inline-flex items-center gap-1 text-atencao">
          <Icone nome="alerta" tamanho={14} />
          Não foi possível consultar novas leituras
        </span>
      )}
    </div>
  )
}

export default SeloOrigem
