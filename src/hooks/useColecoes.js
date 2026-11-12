import { useEffect, useRef, useState } from 'react'
import { SALAS } from '../data/salas.js'
import * as regras from '../utils/colecoes.js'
import { CHAVE_PREFERENCIAS, lerPreferencias, salvarPreferencias } from '../services/colecoesLocais.js'

const IDS_DAS_SALAS = SALAS.map((sala) => sala.id)

// Obtém o armazenamento ou retorna null se o acesso estiver bloqueado.
function pegarLocalStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

// Usa um ID alternativo quando randomUUID não está disponível.
function novoIdDeLista() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `lista-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Gerencia favoritos e listas usando as regras de colecoes.js.
export function useColecoes() {
  const [leitura] = useState(() => lerPreferencias(pegarLocalStorage(), IDS_DAS_SALAS))
  const [prefs, setPrefs] = useState(leitura.prefs)

  // A ref mantém as preferências atuais entre ações feitas antes do próximo render.
  const maisNova = useRef(leitura.prefs)

  // Atualiza a referência e o estado com as novas preferências.
  const aplicar = (novas) => {
    maisNova.current = novas
    setPrefs(novas)
  }

  // Só grava após uma alteração, preservando os dados salvos na abertura.
  useEffect(() => {
    if (prefs === leitura.prefs) {
      return
    }
    salvarPreferencias(pegarLocalStorage(), prefs)
  }, [prefs, leitura.prefs])

  // Sincroniza as listas e os favoritos entre abas.
  useEffect(() => {
    // Carrega as preferências alteradas em outra aba.
    const quandoOutraAbaGravar = (evento) => {
      if (evento.key !== CHAVE_PREFERENCIAS && evento.key !== null) {
        return
      }
      const lida = lerPreferencias(pegarLocalStorage(), IDS_DAS_SALAS)
      if (lida.aviso !== null) {
        return
      }
      maisNova.current = lida.prefs
      setPrefs(lida.prefs)
    }
    window.addEventListener('storage', quandoOutraAbaGravar)
    return () => window.removeEventListener('storage', quandoOutraAbaGravar)
  }, [])

  // Confere se a sala está nos favoritos.
  const ehFavorita = (salaId) => prefs.favorites.includes(salaId)

  // Adiciona ou retira a sala dos favoritos.
  const alternarFavorito = (salaId) => {
    aplicar(regras.alternarFavorito(maisNova.current, salaId))
  }

  // Valida o nome e cria uma lista vazia.
  const criarLista = (nome) => {
    const id = novoIdDeLista()
    const resultado = regras.criarLista(maisNova.current, nome, id)
    if (resultado.erro !== null) {
      return { ok: false, erro: resultado.erro, id: null }
    }
    aplicar(resultado.prefs)
    return { ok: true, erro: null, id }
  }

  // Valida o novo nome e atualiza a lista.
  const renomearLista = (listaId, nome) => {
    const resultado = regras.renomearLista(maisNova.current, listaId, nome)
    if (resultado.erro !== null) {
      return { ok: false, erro: resultado.erro }
    }
    aplicar(resultado.prefs)
    return { ok: true, erro: null }
  }

  // Remove a lista e mantém os favoritos.
  const excluirLista = (listaId) => {
    aplicar(regras.excluirLista(maisNova.current, listaId))
  }

  // Inclui a sala na lista escolhida.
  const adicionarSala = (listaId, salaId) => {
    aplicar(regras.adicionarSalaNaLista(maisNova.current, listaId, salaId))
  }

  // Retira a sala da lista escolhida.
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
