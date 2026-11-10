// O rodapé conta, sem letra miúda escondida, o que é simulado e o que é fictício.
const Rodape = () => (
  <footer className="border-t border-regua">
    <div className="mx-auto max-w-[90rem] px-4 py-6 text-sm text-tinta-3 sm:px-6">
      <p className="max-w-[75ch]">
        Study Comfort: protótipo acadêmico da Global Solution FIAP 2026.2. Somente a S01 recebe dados enviados pelo{' '}
        <strong className="font-medium text-tinta-2">protótipo no Wokwi</strong>, via Supabase. Quando o Wokwi
        está desligado, ela mantém os últimos dados disponíveis no banco, com o horário da leitura.
        As salas S02 a S09 são <strong className="font-medium text-tinta-2">simulações locais dinâmicas</strong>.
        O circuito é simulado, o ruído é em dB simulados e a luz é estimada; não são medições físicas de uma sala.
        O painel não reserva lugares.
      </p>
    </div>
  </footer>
)

export default Rodape
