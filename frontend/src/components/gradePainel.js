// As colunas do painel largo (a partir de 1280 px), com e sem a coluna da posição no ranking.
// Ficam num arquivo só delas porque a LinhaSala e o QuadroSalas usam as mesmas: assim o
// cabeçalho e as linhas nunca desalinham. As classes ficam escritas por inteiro porque o
// Tailwind só gera as classes que encontra escritas no código.
export const GRADE = {
  comRanking: 'xl:grid-cols-[3.5rem_minmax(13rem,1.4fr)_minmax(10rem,1.1fr)_8.75rem_8.75rem_9rem_9.5rem_6.5rem]',
  semRanking: 'xl:grid-cols-[minmax(13rem,1.4fr)_minmax(10rem,1.1fr)_8.75rem_8.75rem_9rem_9.5rem_6.5rem]',
}
