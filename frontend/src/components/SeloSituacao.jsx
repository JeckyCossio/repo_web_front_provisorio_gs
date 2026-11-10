import Icone from './Icone.jsx'
import { NOME_ESTADO } from '../utils/formatar.js'

// Cada estado tem cor, ícone E palavra: quem não distingue cores lê a palavra e vê a forma.
const ESTILO = {
  verde: { cor: 'text-ok', icone: 'check' },
  amarelo: { cor: 'text-atencao', icone: 'alerta' },
  vermelho: { cor: 'text-critico', icone: 'critico' },
  falha: { cor: 'text-falha', icone: 'semLeitura' },
}

/**
 * A situação geral da sala (a mesma regra dos LEDs do circuito), escrita numa palheta,
 * como a coluna de observações de um painel de embarque ("embarque", "atrasado").
 * @param {{ estado: 'verde'|'amarelo'|'vermelho'|'falha' }} props
 */
const SeloSituacao = ({ estado }) => {
  const estilo = ESTILO[estado] || ESTILO.falha
  return (
    <span className={`inline-flex items-center gap-1.5 ${estilo.cor}`}>
      <Icone nome={estilo.icone} tamanho={17} />
      <span className="palheta palheta-palavra px-1.5 text-[0.95rem] font-semibold uppercase tracking-[0.07em]">
        {NOME_ESTADO[estado] || NOME_ESTADO.falha}
      </span>
    </span>
  )
}

export default SeloSituacao
