import { useState } from 'react'

// Reinicia a animação quando o texto muda.
const TextoPalheta = ({ texto, className = '' }) => {
  const [anterior, setAnterior] = useState(texto)
  const [viradas, setViradas] = useState(0)

  if (texto !== anterior) {
    setAnterior(texto)
    setViradas(viradas + 1)
  }

  return (
    <span key={viradas} className={`${viradas > 0 ? 'virando' : ''} ${className}`}>
      {texto}
    </span>
  )
}

export default TextoPalheta
