# Uso de Inteligência Artificial: Study Comfort

## 1. Ferramentas utilizadas

| Ferramenta | Finalidade |
|---|---|
| Claude | Discussão do escopo com a skill `grill-me`, principalmente para brainstorming: objetivo do projeto, tecnologias, viabilidade das funcionalidades, ocupação das mesas e integração entre circuito e aplicação web. As decisões foram organizadas em `contexto.md`, usado como referência na revisão do projeto. |
| GitHub Copilot (Modo auto)| Revisão do código a partir do `contexto.md` e conferência dos requisitos e entregáveis de Front-end Design e Web Development. |

## 2. Exemplos representativos de interações

Os exemplos resumem os pedidos e as orientações discutidas, sem reproduzir todas as mensagens ou os textos exatos.

### 2.1. Claude: definição do escopo

#### Exemplo 1: disponibilidade de lugares e utilidade para o estudante

**Prompt representativo:**

> Considerando os dois PDFs que eu te passei que tem o contexto do projeto que temos que construir (GS), quero que você em ajude definir com mais detalhes a nossa ideia par ao projeto que tivemos com o meu grupo e nos ajude a tampar as lacunas também, nossa ideia é construir um sistema onde os dados de temperatura, ruído, luminosidade e ocupação de uma sala sejam captados por sensores (no prototipo que estamos construindo os sensores estarão no prototipo no wokwi), apartir daí enviaremos esse dados para o supabase e depois o painel de web/front irá consultar os dados que estarão no supabase. Usando a skill /grill-me faça perguntas para identificar lacunas e ajudar a definir um escopo viável para a GS.

**Resumo da resposta:**

A partir daí o claude usou a skill grill-me para fazer algumas perguntas sobre tecnologias que queriamos usar, tipo de conexões com o supabase que usariamos, o escopo do nosso conhecimento, quem seriam as pessoas beneficiadas, como planejavamos implementar o CRUD, etc.
No total foram mais ou menos 20 perguntas até conseguirmos definir o arquivo .md com o contexto total do projeto.
Esse arquivo foi enviado para cada integrante do time para saber exatamente como seria construído o projeto com detalhes.
Depois disso fizemos alguams alterações em grupo e no final conseguimos ter o nosso arquivo chamado contexto.md.

### 2.2. GitHub Copilot: revisão do código

#### Exemplo 2: cadeiras vagas e mesas totalmente livres

**Prompt representativo:**

> Revise se as regras de ocupação e os atalhos de atividade que estão descritos no arquivo contexto.md estão sendo seguidos no prototipo web/front.

**Resumo da resposta:**

O GitHub Copilot identificou que havia algumas divergências em relação as regras para identificar salas boas para gravar videos e para fazer trabalhos em grupo, ou seja, no arquivo contexto.md haviam algumas regras para identificar essas salas que não estavam sendo seguidos firmimente no código do painel de web/front.

**Aplicação no projeto:**

A revisão concentrou-se nas funções de ocupação e nos critérios do ranking. O resultado esperado foi manter as contagens separadas e impedir que uma sala sem mesa vazia participasse dos atalhos de grupo e vídeo.

#### Exemplo 3: interpretação dos valores nos filtros

**Prompt representativo:**

> Revise a conversão dos campos dos filtros. Quando escrevo `1.000` na iluminação, quero dizer mil lux. Confira também números com vírgula e o comportamento quando apago o campo, porque os resultados não estão correspondendo ao valor informado.

**Resumo da resposta:**

O GitHub Copilot identificou que uma conversão numérica direta pode interpretar `1.000` como um e transformar um campo vazio em zero. Sugeriu considerar os separadores usados em português e manter o campo apagado como ausência de limite. Indicou comparar entradas como `1.000`, `1.000,5` e `22,5`.

**Aplicação no projeto:**

A orientação foi usada na revisão da interpretação dos valores dos filtros, preservando a diferença entre um limite igual a zero e um limite não preenchido.

### 2.3. GitHub Copilot - conferência dos entregáveis

#### Exemplo 4 - CRUD imcompleto
**Prompt representativo:**

> Compare o repositório com os requisitos de Front-end Design e Web Development. Confira React com Vite, Tailwind, pelo menos oito componentes, `useState`, `useEffect`, dois custom hooks e a separação das responsabilidades. Veja também a consulta à API, o CRUD e as instruções do README. Mostre o que atende e o que depende de confirmação do grupo.

**Resumo da resposta:**

O GitHub Copilot organizou a conferência por requisito e destacou os quatro custom hooks existentes, porém faltava a operação Delete no CRUD, e identificou que o código estava pouco comentado.
Com base nisso fizemos as correções cabíveis.
Os itens externos, como ZIP, deploy e acesso dos professores ao repositório, ficaram sob responsabilidade da equipe.

**Aplicação no projeto:**

A conferência serviu para revisar a organização da aplicação e a documentação de execução. A equipe passou a distinguir os requisitos verificáveis no código daqueles que dependem da preparação da entrega.

## 3. Validação das orientações

As sugestões que obtivemos através da discussão com o claude usando a skill grill-me foram levadas ao grupo e marcamos um reunião para ver se essas sugestões eram as que mais se encaixavam para o escopo do projeto, no final fizemos algumas mudanças em relação a sugestão pura do Claude, e apartir daí começamos a construir os entregaveis de todas as materias.

Agora as revisões que pedimos que o github copilot faça foram feitas sem alterar o código, então nós lemos o plano de alteração, implementamos e testamos o código para ver se as funcionalidades anteriores se mantinham e se os problemas relatados foram resolvidos também.

Houve também uma revisão que pedimos que o github copilot faça em relação aos entregaveis de web/front, antes de pedir essa revisão nós mesmos já haviamos revisado tudo para ver se os entregaveis estavam todos presentes e usamos o github copilot apenas para complementar essa revisão e no final achamos coisas que estavam pendentes sim e corrigimos essas pendências.

## 4. Análise crítica

O Claude ajudou a identificar decisões que ainda estavam abertas, principalmente sobre ocupação, integração e limites do protótipo. Registrar essas escolhas em um contexto comum tornou a revisão posterior mais objetiva.

O GitHub Copilot ajudou muito na parte da correção de código e detalhes finos, afinal em projetos sempre há pequenos detalhes que não são tão perceptiveis, tipo pequenos trechos de código mal implementados que parecem certos, mas provocam resultados diferentes do esperado, ou alguns entregaveis que ainda faltam no projeto, esses detalhes não foram identificados com correção puramente humana, mas puderam ser identificados por IA.

Notamos que o idela é sempre discutir em grupo grandes mudanças ou decisões tomadas juntamente com IA, afinal a IA sugeriu fazer alguns scripts em python que aumentariam a complexidade do projeto, quando na realidade a integração com o supabase já estava ótima.
Se houvessemos seguido as sugestões da IA segamente, com certeza o projeto estaria desnecessáriamente maior agora, aumentando a complexidade e diminuindo o controle sobre o projeto.