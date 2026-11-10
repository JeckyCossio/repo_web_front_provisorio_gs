# Uso de Inteligência Artificial

## 1. Ferramentas utilizadas

- **Claude Code** (Anthropic): planejamento das etapas, geração de código e de testes, revisão.
- **Codex** (OpenAI): ajuste da origem dos dados da S01, remoção da simulação local dessa sala e atualização do README, a pedido do grupo.

## 2. Interações realizadas

Exemplos representativos (resumidos):

- **Pedido:** ler o edital e o documento de contexto do grupo e planejar a parte web, apontando o que depende das outras partes. **Resposta:** um plano por etapas e a lista do que precisa ser combinado com o Edge (o formato dos dados da sala S01) e com o grupo (os limiares de conforto).
- **Pedido:** montar a base do projeto e seguir as etapas, com o código explicado por escrito. **Resposta:** o projeto React + Vite + Tailwind configurado, o código de cada etapa com testes e um documento explicando cada arquivo.

## 3. Aplicação no projeto

A IA ajudou a planejar as etapas a partir do edital e do documento de contexto do grupo, configurou a base do projeto (React + Vite + Tailwind + Vitest) e gerou o código da aplicação e os testes a partir dos requisitos e das regras definidos pelo grupo.

## 4. Validação das respostas

Testes automatizados (Vitest), build e lint a cada etapa; testes manuais no navegador; leitura do código com uma explicação por escrito de cada parte, para o integrante entender e saber explicar o que foi feito.

## 5. Análise crítica

> A escrever pelo grupo antes da entrega.

## Atualização — simulações locais dinâmicas

A pedido do grupo, o Codex implementou a variação gradual de S02–S09: luz e temperatura lentas e limitadas; ocupação por uma pessoa em uma mesa; ruído influenciado pela ocupação. A S01 permanece fora do simulador. Os testes conferem ritmos, limites, imutabilidade dos seeds e separação da telemetria.

## Atualização — recomendações de grupo e vídeo — 10/11/2026

O Codex ajustou as regras conforme a decisão do grupo: mesa totalmente livre obrigatória nos dois atalhos, mesma pontuação de mesas, limites de ruído distintos e vídeo com silêncio/mesas de pesos iguais, sem temperatura na nota. Também atualizou os testes, README e orientações de alinhamento com UX/slides.

## Nome do projeto — 10/11/2026

O Codex aplicou o nome Study Comfort, definido pelo grupo, à interface, aos metadados e à documentação. A alteração preserva as regras de negócio e as chaves de armazenamento existentes.

## Revisão editorial e técnica

O Codex pesquisou limites da identificação de conteúdo gerado por IA e revisou a documentação e os comentários do código. A revisão reduziu repetições e corrigiu descrições antigas. O uso das ferramentas permanece registrado neste arquivo. O relatório auxiliar foi retirado do pacote de entrega.

## Alinhamento com o material das aulas — 10/11/2026

A pedido do usuário, o Codex examinou os arquivos de `contexto_aulas/` e comparou os conteúdos com a implementação. Substituiu conversões de objetos, congelamento de constantes e validações com expressões regulares por objetos, arrays, laços e funções. As fontes passaram de pacotes Fontsource para arquivos locais com CSS e licenças. As regras de simulação e recomendação foram preservadas. O relatório auxiliar foi arquivado fora do repositório; ele não é um entregável das duas disciplinas. A revisão foi conferida com Vitest, lint, build, comparação de filtros/datas e testes locais no navegador.

## Reorganização para a entrega — 10/11/2026

O Codex reorganizou a aplicação em `frontend/`, seguindo os exemplos de projeto React das aulas. As telas passaram para `src/pages/` e as regras para `src/utils/`, mantendo componentes, custom hooks e serviços separados conforme o edital. Atualizou imports e instruções de execução. PDFs, exemplos das aulas e documentos auxiliares foram preservados fora do repositório. Os testes foram mantidos para validar a mudança.
