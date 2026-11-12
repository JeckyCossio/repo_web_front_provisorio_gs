# Study Comfort

Global Solution 2026.2 | FIAP | Engenharia de Software, 1º ano | Front-end Design e Web Development

## Ficha CitizenTech

| Campo | Definição |
|---|---|
| Nome da solução | Study Comfort. |
| Cidade e bairro | São Paulo/SP |
| Cidadão beneficiado | Estudantes universitários que querem escolher um ambiente adequado para estudar, trabalhar em grupo ou gravar vídeos/projetos. |
| Problema em uma frase | Estudantes têm dificuldade para identificar, antes de se deslocar, salas com espaço e condições adequadas de ruído, temperatura e luminosidade para suas atividades. |
| Como funciona | O fluxo da S01 (Sala 1) é ESP32 simulado no Wokwi → Supabase → painel React. A conexão local está configurada e a leitura pelo painel foi validada. S02 a S09 usam simulações locais. O painel oferece filtros, recomendações, favoritos e listas no navegador. |
| O que cada parte faz | Edge: leitura simulada e decisão local (LEDs); Supabase: guarda o histórico da sala IoT; React/Web: exibição, filtros, rankings e CRUD local de listas.
| Repositório | https://github.com/JeckyCossio/study-comfort (público) |
| Indicador de impacto | Novas entrevistas com os usuários da plataforma, perguntando quanto tempo provavelmente foi economizado através do uso da plataforma, e quantas vezes por seman é usado a plataforma pelo usuário |
| ODS conectados | ODS 4: Educação de Qualidade (principal: melhores condições para estudar); ODS 9: Indústria, Inovação e Infraestrutura (apoio: IoT aplicada à infraestrutura do campus); possivelmente ODS 11: Cidades e Comunidades Sustentáveis (uso eficiente de espaços coletivos). |

### Equipe

| Integrante | RM |
|---|---|
| Daniel Roberto | 571746 |
| Felipe Pedrol | 569631 |
| Jecky Cossio | 572226 |
| Felipi Godoy | 573741 |

## Sobre a aplicação

No Study Comfort, o estudante entra com uma matrícula e senha fictícias (login só demonstrativo, sem cadastro), vê as nove salas numa página só, com a ocupação total e por mesa, as mesas totalmente livres, a temperatura, a luminosidade e o ruído, e usa os atalhos *Estudar sozinho*, *Trabalho em grupo* e *Gravar vídeo/projeto* para ver o ranking das salas. Favoritos e listas ficam só no `localStorage` do navegador.

### Origem dos dados

Apenas A S01 (Sala 01) recebe a telemetria do Wokwi pelo Supabase, as outras salas tem seus dados mudados por simulações locais, isso ocorre apenas para mostrar como o painel web se comporta com diferentes dados. A configuração local usa a URL e a chave publicável do projeto em `.env.local`, ignorado pelo Git. Em outra instalação, preencha essas variáveis; sem elas, o painel aguarda a conexão. Essa sala não recebe simulação local.

O painel consulta a tabela `room_telemetry_history` que está no supabase, ordenando os dados por `measured_at` e `measurement_id` decrescentes, com limite de uma linha. 
O Wokwi envia novas leituras com POST e o banco atribui o horário. Com o Wokwi desligado, os valores permanecerão estáticos, com o horário original e o aviso de leitura antiga. Falhas de consulta também preservam a última leitura recebida enquanto o painel estiver aberto. Uma nova consulta ao banco não atualiza a data do registro.

As salas S02 a S09 usam dados fictícios gerados no navegador, sem sensores, Wokwi ou Supabase. A S01 receberá dados transmitidos por um circuito simulado no Wokwi, não medições físicas de uma sala. As unidades do projeto são °C, lux estimados e dB simulados.

O protótipo de edge que envia os dados para o supabase está em [Study Comfort: S01 / Histórico](https://wokwi.com/projects/480352166150085633). 

### Períodos das simulações locais (S02 a S09)

| Indicador | Período de atualização | Variação |
|---|---|---|
| Ruído | A cada 10 segundos | Altera de 1 a 2 dB simulados por vez, influenciado pela ocupação, até ±8 dB do valor inicial e sempre dentro de 30 a 80 dB. |
| Ocupação | A cada 1 minuto | Entra ou sai uma pessoa em uma única mesa, respeitando 0 a 3 pessoas por mesa. Em sala cheia há saída; em sala vazia há entrada. |
| Temperatura | A cada 180 a 250 segundos, conforme a sala | Até 0,1 °C por vez, limitada a ±0,6 °C do valor inicial; pode permanecer igual em um intervalo. |
| Luminosidade | A cada 240 a 310 segundos, conforme a sala | Até 1 lux estimado por vez, em torno de ±1% do valor inicial; pode permanecer igual em um intervalo. |

### Por que as salas têm comportamentos diferentes?

As condições iniciais e os ritmos foram escolhidos para demonstrar as funcionalidades do protótipo em situações diferentes. Há salas frias, quentes, cheias, vazias, silenciosas, barulhentas e com luz insuficiente. Esses cenários permitem experimentar os filtros, as recomendações e os motivos de exclusão. Não descrevem salas físicas observadas.

Temperatura e luz mudam pouco para representar ambientes estáveis. Ocupação e ruído variam com mais frequência; o ruído acompanha a tendência da ocupação e recebe uma pequena oscilação aleatória.

Ruído e ocupação têm períodos iguais em todas as salas: 10 e 60 segundos, respectivamente. Os períodos de temperatura e luz diferem por sala. Os valores iniciais e os sorteios separados fazem com que as salas evoluam de formas diferentes, mesmo quando o período é igual.

### Valores iniciais e períodos exatos por sala

`Mesas iniciais` indica o número de pessoas em cada mesa. Todas as mesas têm três lugares.

| Sala | Mesas iniciais | Temperatura inicial / período | Luz inicial / período | Ruído inicial / período | Ocupação: período |
|---|---|---|---|---|---|
| S02 | `[0,2]` | 22 °C / 180 s (3 min) | 410 lux / 240 s (4 min) | 42 dB / 10 s | 60 s |
| S03 | `[3,3]` | 18 °C / 190 s (3 min 10 s) | 920 lux / 250 s (4 min 10 s) | 71 dB / 10 s | 60 s |
| S04 | `[1,1,1]` | 21 °C / 200 s (3 min 20 s) | 500 lux / 260 s (4 min 20 s) | 46 dB / 10 s | 60 s |
| S05 | `[0,3,3]` | 24 °C / 210 s (3 min 30 s) | 350 lux / 270 s (4 min 30 s) | 57 dB / 10 s | 60 s |
| S06 | `[2,2,1]` | 19 °C / 220 s (3 min 40 s) | 180 lux / 280 s (4 min 40 s) | 61 dB / 10 s | 60 s |
| S07 | `[0,0,1]` | 23 °C / 230 s (3 min 50 s) | 450 lux / 290 s (4 min 50 s) | 39 dB / 10 s | 60 s |
| S08 | `[3,2,1,0]` | 25 °C / 240 s (4 min) | 600 lux / 300 s (5 min) | 53 dB / 10 s | 60 s |
| S09 | `[3,3,3,0]` | 28 °C / 250 s (4 min 10 s) | 760 lux / 310 s (5 min 10 s) | 68 dB / 10 s | 60 s |

Luz é expressa em lux estimados e ruído em dB simulados. Cada período é recorrente: por exemplo, a temperatura da S03 pode mudar aos 190, 380, 570 segundos etc.; não é apenas um atraso inicial. Nos intervalos de temperatura e luz, o sorteio permite diminuir, manter ou aumentar o valor. A margem de luz é `máximo(2, arredondar(valor inicial × 1%))`; por isso, os limites inteiros variam entre salas.

### Mínimos e máximos das simulações locais

Os limites usam o valor inicial fixo de cada sala. Cada atualização respeita essa faixa, mesmo após horas de execução. Ao chegar à borda, o valor permanece nela ou volta para dentro.

| Sala | Temperatura mínima a máxima (°C) | Ruído mínima a máxima (dB simulados) | Ocupação mínima a máxima (pessoas) | Iluminação mínima a máxima (lux estimados) |
|---|---|---|---|---|
| S02 | 21,4 a 22,6 | 34 a 50 | 0 a 6 | 406 a 414 |
| S03 | 17,4 a 18,6 | 63 a 79 | 0 a 6 | 911 a 929 |
| S04 | 20,4 a 21,6 | 38 a 54 | 0 a 9 | 495 a 505 |
| S05 | 23,4 a 24,6 | 49 a 65 | 0 a 9 | 346 a 354 |
| S06 | 18,4 a 19,6 | 53 a 69 | 0 a 9 | 178 a 182 |
| S07 | 22,4 a 23,6 | 31 a 47 | 0 a 9 | 445 a 455 |
| S08 | 24,4 a 25,6 | 45 a 61 | 0 a 9 | 594 a 606 |
| S09 | 27,4 a 28,6 | 60 a 76 | 0 a 9 | 752 a 768 |

Nas salas grandes S08 e S09, a ocupação simulada fica entre 0 e 9 pessoas, mantendo sempre pelo menos uma mesa totalmente livre, inclusive na leitura inicial. A simulação impede a entrada na última mesa vazia; ao atingir nove pessoas, o próximo evento é uma saída. A capacidade física continua sendo 12 lugares (quatro mesas de três). O intervalo de atualização permanece em 1 minuto, com entrada ou saída de uma pessoa por sala.

A ocupação também respeita 0 a 3 pessoas por mesa. Esses limites de simulação são diferentes dos limites usados para avaliar conforto e recomendar atividades. A S01 não participa desta tabela, pois não recebe simulação local.

A simulação recomeça nos valores iniciais ao recarregar ou reabrir o painel. Os temporizadores rodam enquanto ele está aberto e podem atrasar em abas em segundo plano. S01 permanece fora desse processo.

## Como os atalhos escolhem as salas

“Gravar vídeo” significa gravar trabalhos, apresentações e projetos acadêmicos. O painel recomenda ambientes e não reserva mesas.

| Critério | Estudar sozinho | Trabalho em grupo | Gravar vídeo |
|---|---|---|---|
| Lugar/mesa obrigatória | Pelo menos 1 cadeira vaga | Pelo menos 1 mesa totalmente livre (0 pessoas) | Pelo menos 1 mesa totalmente livre (0 pessoas) |
| Mesas adicionais | Sem pontuação própria por mesa | Cada mesa adicional melhora a pontuação, até 4 mesas | Mesma regra do grupo |
| Ruído permitido para participar | Sem corte específico da atividade; ruído afeta a nota | Até 65 dB simulados, inclusive | Até 45 dB simulados, inclusive |
| Peso de mesas livres | 0 | 35 | 35 |
| Peso de ruído/silêncio | 40 | 20 | 35 |
| Peso de menor ocupação | 20 | 25 | 20 |
| Peso de iluminação | 20 | 10 | 10 |
| Peso de temperatura | 20 | 10 | 0 (não participa da escolha automática de vídeo) |
| Total dos pesos | 100 | 100 | 100 |

Uma mesa com uma ou duas pessoas não conta como totalmente livre. A ocupação pontua pela proporção de lugares vagos: quanto menor a taxa de ocupação, melhor.

Grupo e vídeo usam `35 × mesas totalmente livres ÷ 4`: uma mesa soma 8,75 pontos, duas 17,5, três 26,25 e quatro 35. Uma mesa já permite participar; as demais melhoram a nota. O silêncio do vídeo tem os mesmos 35 pontos máximos, com preferência progressiva por menos ruído: 30 dB simulados somam 35 pontos; 45 dB somam zero nesse critério, mas ainda atendem ao limite. Entre esses valores, a pontuação é linear.

Temperatura permanece visível como informação ambiental, mas não soma nem retira pontos no atalho de vídeo. A situação ambiental geral da sala é diferente da adequação à atividade. As validações de leitura confiável continuam valendo, e o usuário pode aplicar filtros manuais. A última leitura da S01, quando desatualizada, mantém o aviso e perde 15 pontos no ranking. Os pesos são critérios didáticos do protótipo, sem calibração científica.

### Como cada parâmetro vira pontos

Primeiro, o painel aplica os filtros manuais e as regras de participação. Uma sala sem leitura confiável não recebe nota; grupo e vídeo também excluem salas sem mesa totalmente livre ou com ruído acima do limite da atividade. Estudar sozinho exclui salas sem cadeira vaga. As salas excluídas permanecem listadas com o motivo, depois das elegíveis.

- Temperatura e iluminação: recebem 100% do peso quando adequadas, 50% em atenção e zero quando críticas. Temperatura tem peso zero no vídeo.
- Ruído em estudo individual e grupo: usa a mesma proporção por severidade (100%, 50% ou zero). No grupo, acima de 65 dB a sala já é excluída.
- Ruído em vídeo: usa `35 × (45 − ruído) / 15` dentro da faixa válida de 30 a 45 dB simulados. Menor ruído aumenta a nota; acima de 45 dB a sala é excluída.
- Ocupação: usa `peso × lugares vagos / capacidade física`. Assim, compara a proporção disponível em salas de tamanhos diferentes. Nas grandes, a capacidade da conta continua sendo 12; o teto de nove pessoas é uma regra da simulação.
- Mesas livres: grupo e vídeo usam a mesma conta de até quatro mesas descrita acima; cadeiras vagas em mesas ocupadas não pontuam como mesas livres.

A soma é arredondada para um inteiro de 0 a 100. Uma leitura desatualizada perde 15 pontos, com mínimo de zero. A ordem usa maior nota; em caso de empate, menor taxa de ocupação, mais mesas totalmente livres e, por fim, identificador da sala. Para os mesmos dados e filtros, o resultado é sempre o mesmo: o sorteio ocorre na geração das simulações, não no ranking.

### Faixas usadas na avaliação ambiental

Estes são os limiares provisórios atualmente implementados, para demonstrar a classificação e o cálculo dos pesos; não constituem validação científica ou certificação de conforto. Não confundir com os mínimos/máximos fixos que limitam a geração das simulações.

| Indicador | Adequado (100% do peso, quando aplicável) | Atenção (50%) | Crítico (0%) |
|---|---|---|---|
| Temperatura | 21 a 25 °C, inclusive | 18 até menos de 21 °C; acima de 25 até 26 °C | Abaixo de 18 °C ou acima de 26 °C |
| Iluminação | 300 a 2.000 lux estimados, inclusive | 200 até menos de 300; acima de 2.000 até 3.000 lux estimados | Abaixo de 200 ou acima de 3.000 lux estimados |
| Ruído | Até 45 dB simulados | Acima de 45 até 65 dB simulados | Acima de 65 dB simulados |
| Ocupação | Até 50% dos lugares | Acima de 50% até 90% | Acima de 90% |

A severidade da ocupação serve à situação ambiental geral; sua pontuação no ranking é proporcional aos lugares vagos, conforme a fórmula, em vez de usar os degraus de 100%/50%/0%. O vídeo também usa sua fórmula própria de silêncio.

Os rótulos de faixa baixo/médio/alto descrevem a quantidade, enquanto adequado/atenção/crítico descrevem a severidade. Os limites de faixa são: temperatura abaixo de 21 °C / 21 a 26 °C / acima de 26 °C; luz abaixo de 300 / 300 a 750 / acima de 750 lux estimados; ruído abaixo de 40 / 40 a 55 / acima de 55 dB simulados; ocupação abaixo de 35% / 35 a 70% / acima de 70%. Por isso, luz classificada como “alta” não é necessariamente crítica, e ocupação “baixa” não é um problema.

As regras estão em `src/services/simulacaoLocal.js` (ritmos e limites), `src/data/salas.js` (valores iniciais), `src/utils/limiares.js` (avaliação ambiental) e `src/utils/ranking.js` (pesos, elegibilidade e pontuação).

## Estado

O painel, o login de demonstração, os filtros, os rankings, os favoritos e as listas estão implementados. A integração local com Wokwi/Supabase da S01 está configurada, com publicação e leitura pelo painel verificadas. Os limiares ambientais são provisórios e os pesos servem à demonstração acadêmica.


## Pré-requisitos

- Node.js 20.19 ou mais novo (ou 22.12+), com o npm. Testado com o Node 24.19.0 e o npm 11.17.0.
- Git.

## Instalação e execução

```bash
git clone https://github.com/JeckyCossio/study-comfort.git
cd study-comfort
npm install
cp .env.example .env.local   # preencher URL e chave publicável do Supabase
npm run dev                  # abre em http://localhost:5173
```

| Comando (na raiz do projeto) | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | o build de produção em `dist/` |
| `npm run lint` | o lint (ESLint) |
| `npm run preview` | serve o build de produção |

### Variáveis de ambiente (`.env.local`)

| Variável | Para quê |
|---|---|
| `VITE_TELEMETRIA_MODO` | `supabase` (padrão); sem URL/chave, a S01 aguarda a conexão |
| `VITE_SUPABASE_URL` | a URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | a chave publicável do Supabase (a aplicação recusa uma chave secreta) |

## Estrutura

```text
├── README.md              descrição, regras e execução
├── AI.md                  registro de uso de IA
├── package.json
├── package-lock.json
├── index.html
├── vite.config.js
├── eslint.config.js
├── .env.example
├── supabase/migrations/   migração para histórico único
├── public/                favicon e arquivos públicos
└── src/                   aplicação compartilhada por Front-end e Web
    ├── App.jsx            alterna entre login e painel
    ├── main.jsx           entrada do React
    ├── index.css          estilos globais e Tailwind
    ├── pages/             Login.jsx e Painel.jsx
    ├── components/        elementos reutilizáveis da interface
    ├── hooks/             estado e efeitos personalizados
    ├── services/          Supabase, armazenamento e simulação
    ├── utils/             regras e funções de cálculo/validação
    ├── data/              metadados e valores iniciais das salas
    └── assets/            fontes locais e suas licenças
```

## Limitações assumidas

- O login é fictício e só visual; não protege nada.
- Listas e favoritos ficam no navegador: outro navegador ou perfil não os vê, e limpar os dados do site os apaga.
- A chave publicável do Supabase ficará no navegador. A tabela usa RLS para permitir leitura e inserção somente da S01; a chave pública não pode editar/excluir o histórico nem definir o horário ou identificador da medição.