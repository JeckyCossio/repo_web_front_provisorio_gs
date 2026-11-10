import { describe, expect, it } from 'vitest'
import { ehChaveSecreta, lerConfiguracao } from './configuracao.js'

// Monta um JWT falso (sem assinatura válida) só com o "role" que importa para o teste.
function jwtCom(role) {
  const parte = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, '')
  return `${parte({ alg: 'HS256' })}.${parte({ role })}.assinatura`
}

describe('lerConfiguracao', () => {
  it('sem nada no ambiente, aguarda a conexão, sem mock', () => {
    expect(lerConfiguracao({})).toEqual({
      modoTelemetria: 'pendente', supabaseUrl: '', supabaseChave: '', aviso: 'Faltam VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY; a S01 aguarda a conexão com o Supabase.',
    })
  })

  it('a configuração antiga de mock não gera leituras para a S01', () => {
    const config = lerConfiguracao({ VITE_TELEMETRIA_MODO: 'mock' })
    expect(config.modoTelemetria).toBe('pendente')
    expect(config.supabaseUrl).toBe('')
  })

  it('sem modo explícito, usa Supabase quando URL e chave estão preenchidas', () => {
    const config = lerConfiguracao({
      VITE_SUPABASE_URL: 'https://exemplo.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
    })
    expect(config.modoTelemetria).toBe('supabase')
  })

  it('com o modo supabase completo, usa o supabase', () => {
    const config = lerConfiguracao({
      VITE_TELEMETRIA_MODO: 'supabase',
      VITE_SUPABASE_URL: 'https://exemplo.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
    })
    expect(config.modoTelemetria).toBe('supabase')
    expect(config.aviso).toBeNull()
  })

  it('com o modo supabase sem URL ou chave, aguarda a conexão e avisa', () => {
    const config = lerConfiguracao({ VITE_TELEMETRIA_MODO: 'supabase', VITE_SUPABASE_URL: 'https://x.supabase.co' })
    expect(config.modoTelemetria).toBe('pendente')
    expect(config.aviso).toMatch(/Faltam/)
  })

  it('recusa a chave secreta nova (sb_secret_) e não a repassa', () => {
    const config = lerConfiguracao({
      VITE_TELEMETRIA_MODO: 'supabase',
      VITE_SUPABASE_URL: 'https://x.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc',
    })
    expect(config.modoTelemetria).toBe('pendente')
    expect(config.supabaseChave).toBe('')
    expect(config.aviso).toMatch(/SECRETA/)
  })

  it('modo desconhecido aguarda a conexão e avisa', () => {
    expect(lerConfiguracao({ VITE_TELEMETRIA_MODO: 'firebase' }).aviso).toMatch(/desconhecido/)
  })
})

describe('ehChaveSecreta', () => {
  it('reconhece o JWT antigo de service_role', () => {
    expect(ehChaveSecreta(jwtCom('service_role'))).toBe(true)
  })

  it('aceita o JWT antigo de anon e a chave publicável nova', () => {
    expect(ehChaveSecreta(jwtCom('anon'))).toBe(false)
    expect(ehChaveSecreta('sb_publishable_abc')).toBe(false)
  })

  it('não quebra com chave vazia ou malformada', () => {
    expect(ehChaveSecreta('')).toBe(false)
    expect(ehChaveSecreta('a.b.c')).toBe(false)
  })
})
