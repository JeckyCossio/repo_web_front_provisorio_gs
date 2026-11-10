// Os ícones do painel, desenhados à mão em SVG, todos com o mesmo traço (1,75) e cantos redondos.
// Assim nenhum ícone vem de um emoji ou de um caractere, e todos combinam entre si.

const DESENHOS = {
  estrela: <path d="M12 3.6l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.62l-5.1 2.68.98-5.68L3.75 9.6l5.7-.83z" />,
  termometro: (
    <>
      <path d="M10 13.6V5.2a2 2 0 1 1 4 0v8.4a4 4 0 1 1-4 0z" />
      <path d="M12 16.6v-5" />
    </>
  ),
  sol: (
    <>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 2.8v2.2M12 19v2.2M4.9 4.9l1.55 1.55M17.55 17.55l1.55 1.55M2.8 12H5M19 12h2.2M4.9 19.1l1.55-1.55M17.55 6.45l1.55-1.55" />
    </>
  ),
  som: (
    <>
      <path d="M4 9.6h3.4L12 6v12l-4.6-3.6H4z" />
      <path d="M15.6 9.4a3.6 3.6 0 0 1 0 5.2M18.2 6.8a7.2 7.2 0 0 1 0 10.4" />
    </>
  ),
  pessoa: (
    <>
      <circle cx="12" cy="8.4" r="3.4" />
      <path d="M5.4 19.6a6.6 6.6 0 0 1 13.2 0" />
    </>
  ),
  lista: (
    <>
      <path d="M9 6.6h10.5M9 12h10.5M9 17.4h10.5" />
      <circle cx="5" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="5" cy="17.4" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  filtro: (
    <>
      <path d="M4 7h9.5M17.5 7H20M4 17h3.5M11.5 17H20" />
      <circle cx="15.5" cy="7" r="2" />
      <circle cx="9.5" cy="17" r="2" />
    </>
  ),
  check: <path d="M5.2 12.6l4.3 4.3 9.3-9.6" />,
  alerta: (
    <>
      <path d="M12 4.2l8.6 15.2H3.4z" />
      <path d="M12 10v4.2" />
      <circle cx="12" cy="16.9" r="0.85" fill="currentColor" stroke="none" />
    </>
  ),
  critico: (
    <>
      <path d="M8.3 3.5h7.4l5.2 5.2v7.4l-5.2 5.2H8.3l-5.2-5.2V8.7z" />
      <path d="M9.4 9.4l5.2 5.2M14.6 9.4l-5.2 5.2" />
    </>
  ),
  semLeitura: (
    <>
      <circle cx="12" cy="12" r="8.6" strokeDasharray="2.6 2.4" />
      <path d="M8.6 12h6.8" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.4V12l3 1.9" />
    </>
  ),
  sair: (
    <>
      <path d="M9.5 4.4H6.4a2 2 0 0 0-2 2v11.2a2 2 0 0 0 2 2h3.1" />
      <path d="M15.6 16.2L19.8 12l-4.2-4.2M19.8 12H9.8" />
    </>
  ),
  mais: <path d="M12 5.2v13.6M5.2 12h13.6" />,
  lixeira: (
    <>
      <path d="M4.6 7h14.8M9.6 7V4.6h4.8V7" />
      <path d="M6.6 7l.95 12.4h8.9L17.4 7" />
    </>
  ),
  lapis: <path d="M15.4 4.6l4 4L8.9 19.1H4.9v-4z" />,
  antena: (
    <>
      <circle cx="12" cy="11" r="1.6" />
      <path d="M12 12.6v7.8M8.6 7.6a4.8 4.8 0 0 0 0 6.8M15.4 7.6a4.8 4.8 0 0 1 0 6.8M6 5a8.5 8.5 0 0 0 0 12M18 5a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  arquivo: (
    <>
      <path d="M6.4 3.8h7.4l3.8 3.8v12.6H6.4z" />
      <path d="M13.6 3.8v4h4M9 12.4h6M9 15.8h6" />
    </>
  ),
  seta: <path d="M6.4 9.4L12 15l5.6-5.6" />,
  fechar: <path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" />,
  cadeado: (
    <>
      <rect x="5.4" y="10.6" width="13.2" height="9.2" rx="1.6" />
      <path d="M8.4 10.6V8a3.6 3.6 0 0 1 7.2 0v2.6" />
    </>
  ),
}

/**
 * Um ícone do painel.
 * @param {{ nome: keyof DESENHOS, tamanho?: number, preenchido?: boolean, rotulo?: string, className?: string }} props
 *   rotulo: o texto para leitores de tela; sem ele, o ícone é só decoração (aria-hidden).
 */
const Icone = ({ nome, tamanho = 18, preenchido = false, rotulo, className = '' }) => {
  const desenho = DESENHOS[nome]
  if (!desenho) {
    return null
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill={preenchido ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      focusable="false"
    >
      {desenho}
    </svg>
  )
}

export default Icone
