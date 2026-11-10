import { useEffect, useState } from 'react'
import { formatarHora } from '../utils/formatar.js'

/*
 * O relógio do painel, em palhetas, como num painel de embarque.
 * Ele serve para o estudante comparar a hora agora com a hora da última leitura da S01.
 */
const Relogio = () => {
  const [agora, setAgora] = useState(() => Date.now())

  // React Hook useEffect: liga um setInterval quando o relógio aparece e o desliga quando
  // ele sai da tela (o return), para não ficar um timer rodando à toa.
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hora = formatarHora(agora, true)

  return (
    <p className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.1em] text-tinta-3">Agora</span>
      <time aria-label={`Agora são ${hora}`} className="numeros flex gap-[2px] text-lg font-bold text-tinta">
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
