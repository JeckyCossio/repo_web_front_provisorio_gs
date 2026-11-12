import { useEffect, useState } from 'react'
import { formatarHora } from '../utils/formatar.js'

// Atualiza a hora exibida a cada segundo.
const Relogio = () => {
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hora = formatarHora(agora, true)

  return (
    <p className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.1em] text-tinta-3">Agora</span>
      <time className="numeros flex gap-[2px] text-lg font-bold text-tinta">
        <span className="sr-only">{hora}</span>
        {hora.split('').map((caractere, i) =>
          caractere === ':' ? (
            <span key={i} aria-hidden="true" className="px-[1px] font-painel text-tinta-3">
              :
            </span>
          ) : (
            <span key={i} aria-hidden="true" className="palheta">
              {caractere}
            </span>
          ),
        )}
      </time>
    </p>
  )
}

export default Relogio
