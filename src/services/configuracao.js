export const MODOS_TELEMETRIA = ['supabase']

// Identifica chaves secretas que não podem ficar no navegador.
export function ehChaveSecreta(chave) {
  if (!chave) return false
  if (chave.startsWith('sb_secret_')) return true
  const partes = chave.split('.')
  if (partes.length !== 3) return false
  try {
    const payload = JSON.parse(atob(partes[1].split('-').join('+').split('_').join('/')))
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

// Valida as variáveis de ambiente usadas na conexão com o Supabase.
export function lerConfiguracao(ambiente = {}) {
  const modoPedido = (ambiente.VITE_TELEMETRIA_MODO || 'supabase').trim().toLowerCase()
  const supabaseUrl = (ambiente.VITE_SUPABASE_URL || '').trim()
  const supabaseChave = (ambiente.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()

  if (!MODOS_TELEMETRIA.includes(modoPedido)) {
    return { modoTelemetria: 'pendente', supabaseUrl: '', supabaseChave: '',
      aviso: `Modo de telemetria desconhecido ("${modoPedido}"); a S01 aguarda a conexão com o Supabase.` }
  }

  if (modoPedido === 'supabase') {
    if (ehChaveSecreta(supabaseChave)) {
      return { modoTelemetria: 'pendente', supabaseUrl: '', supabaseChave: '',
        aviso: 'A chave do Supabase é SECRETA e não pode ficar no navegador. Use a chave publicável.' }
    }
    if (!supabaseUrl || !supabaseChave) {
      return { modoTelemetria: 'pendente', supabaseUrl: '', supabaseChave: '',
        aviso: 'Faltam VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY; a S01 aguarda a conexão com o Supabase.' }
    }
    return { modoTelemetria: 'supabase', supabaseUrl, supabaseChave, aviso: null }
  }

  return { modoTelemetria: 'pendente', supabaseUrl: '', supabaseChave: '', aviso: null }
}
