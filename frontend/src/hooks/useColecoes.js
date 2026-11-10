import { useEffect, useRef, useState } from 'react'
import { SALAS } from '../data/salas.js'
import * as regras from '../utils/colecoes.js'
import { CHAVE_PREFERENCIAS, lerPreferencias, salvarPreferencias } from '../services/colecoesLocais.js'

// Os favoritos e as listas do estudante (CONTEXTO, §7.7; RN-12), guardados só neste navegador.
// As regras (o que muda em cada ação) ficam no utils/colecoes.js, importado como "regras";
// quem lê e grava no localStorage é o services/colecoesLocais.js. Aqui só fica o estado.

// Os ids das nove salas: só eles podem estar nos favoritos e nas listas.
const IDS_DAS_SALAS = SALAS.map((sala) => sala.id)

// O acesso ao storage pode falhar quando o navegador bloqueia os dados do site.
function pegarLocalStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

// randomUUID exige contexto seguro; o fallback permite testar por IP na rede local.
// A camada de domínio também rejeita IDs duplicados.
function novoIdDeLista() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `lista-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Os favoritos e as listas (o CRUD), lidos do localStorage e gravados nele a cada mudança.
 * @returns {{ favoritos: string[], listas: { id: string, name: string, room_ids: string[] }[],
 *   aviso: string|null, ehFavorita: (salaId: string) => boolean, alternarFavorito: (salaId: string) => void,
 *   criarLista: (nome: string) => { ok: boolean, erro: string|null, id: string|null },
 *   renomearLista: (listaId: string, nome: string) => { ok: boolean, erro: string|null },
 *   excluirLista: (listaId: string) => void, adicionarSala: (listaId: string, salaId: string) => void,
 *   removerSala: (listaId: string, salaId: string) => void }}
 */
export function useColecoes() {
  // Ler o armazenamento somente na inicialização.
  const [leitura] = useState(() => lerPreferencias(pegarLocalStorage(), IDS_DAS_SALAS))
  const [prefs, setPrefs] = useState(leitura.prefs)

  // A ref evita usar preferências antigas em ações consecutivas antes do próximo render.
  const maisNova = useRef(leitura.prefs)

  // Toda mudança passa por aqui: atualiza a versão mais nova na hora e pede o desenho novo.
  const aplicar = (novas) => {
    maisNova.current = novas
    setPrefs(novas)
  }

  // Não sobrescrever o conteúdo original até a primeira alteração, permitindo recuperá-lo.
  useEffect(() => {
    if (prefs === leitura.prefs) {
      return // ainda é exatamente o que foi lido
    }
    // Se o navegador recusar (cheio ou bloqueado), as listas valem até fechar a página.
    // O bloqueado já aparece no aviso da leitura; o cheio é quase impossível (são poucos bytes).
    salvarPreferencias(pegarLocalStorage(), prefs)
  }, [prefs, leitura.prefs])

  // Sincronizar alterações de outras abas para evitar sobrescrever listas desatualizadas.
  useEffect(() => {
    const quandoOutraAbaGravar = (evento) => {
      // A key null quer dizer que a outra aba limpou o localStorage inteiro (localStorage.clear()).
      if (evento.key !== CHAVE_PREFERENCIAS && evento.key !== null) {
        return
      }
      const lida = lerPreferencias(pegarLocalStorage(), IDS_DAS_SALAS)
      // Se não deu para ler o que a outra aba gravou (ex.: outra versão do formato), esta aba
      // continua como está, em vez de trocar tudo pelo vazio e gravar o vazio por cima.
      if (lida.aviso !== null) {
        return
      }
      // Regravar o mesmo valor não dispara outro evento storage nas demais abas.
      maisNova.current = lida.prefs
      setPrefs(lida.prefs)
    }
    window.addEventListener('storage', quandoOutraAbaGravar)
    return () => window.removeEventListener('storage', quandoOutraAbaGravar)
  }, [])

  const ehFavorita = (salaId) => prefs.favorites.includes(salaId)

  const alternarFavorito = (salaId) => {
    aplicar(regras.alternarFavorito(maisNova.current, salaId))
  }

  // Confere o nome na versão mais nova (para devolver o erro na hora) e cria a lista com o id já sorteado.
  const criarLista = (nome) => {
    const id = novoIdDeLista()
    const resultado = regras.criarLista(maisNova.current, nome, id)
    if (resultado.erro !== null) {
      return { ok: false, erro: resultado.erro, id: null }
    }
    aplicar(resultado.prefs)
    return { ok: true, erro: null, id }
  }

  const renomearLista = (listaId, nome) => {
    const resultado = regras.renomearLista(maisNova.current, listaId, nome)
    if (resultado.erro !== null) {
      return { ok: false, erro: resultado.erro }
    }
    aplicar(resultado.prefs)
    return { ok: true, erro: null }
  }

  const excluirLista = (listaId) => {
    aplicar(regras.excluirLista(maisNova.current, listaId))
  }

  const adicionarSala = (listaId, salaId) => {
    aplicar(regras.adicionarSalaNaLista(maisNova.current, listaId, salaId))
  }

  const removerSala = (listaId, salaId) => {
    aplicar(regras.removerSalaDaLista(maisNova.current, listaId, salaId))
  }

  return {
    favoritos: prefs.favorites,
    listas: prefs.lists,
    aviso: leitura.aviso,
    ehFavorita,
    alternarFavorito,
    criarLista,
    renomearLista,
    excluirLista,
    adicionarSala,
    removerSala,
  }
}
