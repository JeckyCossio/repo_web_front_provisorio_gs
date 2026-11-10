import { useState } from 'react'

/*
 * Um texto que "vira a palheta" (como um painel de embarque) quando o valor muda.
 * No primeiro desenho ele só aparece, sem animação: a animação conta que algo MUDOU.
 *
 * Como ele sabe que mudou: guarda o último texto num useState e compara durante o render.
 * Esse é o jeito que a documentação do React recomenda para "ajustar um estado quando uma
 * prop muda", sem precisar de useEffect.
 */
const TextoPalheta = ({ texto, className = '' }) => {
  const [anterior, setAnterior] = useState(texto)
  const [viradas, setViradas] = useState(0)

  if (texto !== anterior) {
    setAnterior(texto)
    setViradas(viradas + 1)
  }

  // A key nova faz o React desenhar o <span> de novo, e o CSS roda a animação outra vez.
  return (
    <span key={viradas} className={`${viradas > 0 ? 'virando' : ''} ${className}`}>
      {texto}
    </span>
  )
}

export default TextoPalheta
