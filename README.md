# prato a prato.

> **A tese:** apps tradicionais de delivery funcionam bem quando você já sabe exatamente o que quer buscar; feeds sociais otimizam tempo de tela. Em comida, um feed vertical precisa **encurtar a decisão até o pedido**, acertar a recomendação em tempo real e respeitar restrições operacionais reais antes do score.

Aplicação Full Stack de descoberta e pedido de comida construída em **React Native (Expo) + TypeScript** (rodando em **iOS, Android e Web**) integrada a uma **API REST em Node.js + TypeScript (`server/index.ts`)** com motor próprio de recomendação, análise real de gosto do usuário, sacola multi-restaurante com roteamento paralelo e telemetria A/B em tempo real.

---

## Principais Funcionalidades

### 1. Feed Vertical de Descoberta (`≤ 60s` por slide)
- **Design orientado a apetite:** paleta em **Vermelho Carmim (`#EA1D2C`) + Dourado Âmbar (`#FFB800`)** sobre superfícies escuras quentes (`#0E0808`), tipografia `Manrope`, ícones vetoriais `Lucide` e fotografias gastronômicas locais.
- **Formatos até 60s:** pratos do dia, ofertas quentes (com preço original riscado), combos e bastidores da cozinha.
- **Interações rápidas:** toque simples para pausar/retomar, duplo-toque ou botão de coração para curtir (`Curtidos`), botão de detalhes com explicabilidade (*"Por que apareceu para mim?"*) e adição imediata à sacola.

### 2. Análise Real de Gosto & Predição de Recomendação (`src/engine/tasteAnalyzer.ts`)
O motor constrói um **vetor real de características do usuário** (tags de ingredientes, culinária do restaurante e formato do conteúdo) a partir de **5 sinais reais** capturados durante a sessão:

| Sinal capturado | Tipo | Peso no vetor de gosto | Efeito no feed e nas recomendações |
| --- | --- | --- | --- |
| **Adicionar à sacola (`add`)** | Explícito (alta intenção) | **+0,48** | Sobe fortemente pratos com as mesmas tags/culinária |
| **Curtir no coração (`save`)** | Explícito (preferência) | **+0,34** | Salva na coleção *Curtidos* e reforça afinidade |
| **Assistir 100% do slide (`watch_complete`)** | Implícito (atenção) | **+0,22** | Reconhece interesse mesmo sem clique explícito |
| **Pular / descurtir (`skip` / `unsave`)** | Explícito (rejeição) | **−0,32** | Rebaixa imediatamente tags e culinária rejeitadas |
| **Impressão ignorada (`impression` sem ação)** | Implícito (baixo interesse) | **−0,09** | Reduz gradualmente temas que não geram engajamento |

Com base nesse vetor, `analyzeUserTaste` calcula a **Similaridade de Cosseno + Confiança Bayesiana** de todo o catálogo elegível e expõe nas telas **Perfil** e **Case study A/B**:
- **O que você GOSTA (`willLike`):** sabores, tags e culinárias com afinidade positiva comprovada e barra de força.
- **O que você EVITA (`willDislike`):** características que o algoritmo detectou como rejeitadas e rebaixou automaticamente.
- **Recomendações Corretas para Você Agora (`predictedFavorites`):** os pratos mais compatíveis com o seu perfil (`% compatível` + justificativa exata de cada fator).
- **Pratos Rebaixados (`predictedAvoid`):** transparência sobre o que foi movido para o fim da fila para não errar na recomendação.
- **Reordenação em tempo real (`rerankUpcoming`):** a cada interação, os próximos slides ainda não vistos na fila são reordenados sem tirar do lugar o prato que está na tela.

### 3. Sacola Multi-Restaurante, Checkout Único e Pedidos Separados (`src/engine/orders.ts`)
Como um feed vertical apresenta pratos de diferentes restaurantes em sequência, o usuário não fica preso a uma única loja:
1. **Passo 1 · Sacola Multi-Restaurante (`groupCartByMerchant`):** agrupa automaticamente os itens por restaurante (`RESTAURANTE 1`, `RESTAURANTE 2`...), exibindo o frete e o tempo estimado de cada cozinha, além de cupons aplicáveis (`FOME10` e `FRETEGRATIS`).
2. **Passo 2 · Checkout Único com Roteamento Automático:** o usuário escolhe endereço (`Casa` ou `Trabalho`), modalidade (`Padrão` ou `Prioritária ⚡`), forma de pagamento (`Pix`, `Cartão`, `Apple Pay` ou `Na entrega`) e observações em um único fluxo.
3. **Passo 3 · Pedidos em Andamento por Restaurante (`splitCartIntoOrders`):** ao confirmar, a sacola é dividida em **pedidos independentes por restaurante** (`#PP-4821`, `#PP-4822`...), cada um com sua própria barra de progresso de 4 estágios (`Confirmado` → `Na cozinha` → `A caminho` → `Entregue`) e acompanhamento em tempo real na barra flutuante do app.

### 4. Backend REST API em Node.js + TypeScript (`server/index.ts`)
O projeto inclui um servidor HTTP REST em **Node.js + TypeScript** (porta `3333`) que compartilha os motores de domínio (`src/engine/*`) e persiste eventos, perfil de gosto, sessões concluídas e pedidos multi-restaurante em disco (`server/data/db.json`). Quando o backend está ativo, o app sincroniza automaticamente todas as interações; se estiver offline, continua funcionando localmente sem interrupção.

| Método & Rota | Responsabilidade |
| --- | --- |
| `GET /api/health` | Status da API, total de eventos persistidos, pedidos ativos, confiança do perfil e top afinidades |
| `GET /api/feed` | Constrói o feed elegível e ranqueado a partir do perfil persistido no servidor |
| `POST /api/interactions` | Registra `impression`, `save`, `unsave`, `watch_complete`, `add`, `remove`, `skip` ou `reset` e atualiza o modelo |
| `GET /api/taste-analysis` | Retorna `willLike`, `willDislike`, `predictedFavorites`, `predictedAvoid` e telemetria real |
| `POST /api/orders` | Divide a sacola multi-restaurante em pedidos independentes por cozinha e grava a sessão |
| `PATCH /api/orders/:id/stage` | Avança o estágio de preparo/entrega de um restaurante específico (`confirmado` → `entregue`) |
| `GET /api/ab-telemetry` | Retorna a telemetria real da sessão + histórico de sessões concluídas + comparativo A/B |

### 5. Telemetria A/B Real + Simulador de Benchmark (`src/screens/ExperimentScreen.tsx`)
A tela **Case study A/B** combina duas camadas:
- **Dados reais da sua sessão (`realTelemetry`):** mede o seu tempo real até o 1º item na sacola, compara com o baseline de busca tradicional (`44s`), calcula a economia percentual de tempo e mede a **taxa de acerto real da recomendação (`Hit Rate %`)** nas suas escolhas.
- **Simulador de Benchmark (`runExperiment`):** compara *Feed-first* vs. *Busca-first* em múltiplas sessões com funil de 4 etapas, histograma de tempo até decisão, matriz por intenção gastronômica e 4 guardrails de negócio.

---

## Como Rodar

Requisitos: **Node.js 22+** e **npm**.

```bash
# 1. Instalar dependências
npm ci

# 2. Subir a API REST Node.js + TypeScript (porta 3333)
npm run server

# 3. Subir o app (Expo Go / Web)
npm start          # Inicia o Metro Bundler para abrir no Expo Go (iOS / Android)
npm run web        # Inicia no navegador

# 4. Qualidade e build estático
npm run typecheck  # Verificação estrita do TypeScript (tsc --noEmit)
npm run smoke      # 35 verificações automatizadas do motor (ranking, gosto, pedidos e A/B)
npm run export:web # Gera o bundle web estático em dist/
```

---

## Estrutura do Projeto

```text
server/
  index.ts               API REST Node.js + TypeScript (:3333) com persistência em JSON
src/
  data/
    seed.ts              Catálogo com 12 restaurantes e 40 itens (pratos, promoções, combos)
    artwork.ts           Mapeamento das fotografias gastronômicas locais
  engine/
    ranking.ts           Restrições duras pré-score, ranking multi-objetivo e reordenação ao vivo
    tasteAnalyzer.ts     Análise real de gosto (Cosine + Bayes), predição e telemetria A/B real
    orders.ts            Agrupamento e divisão de pedidos multi-restaurante por cozinha
    triggers.ts          Motor de gatilhos e orçamento diário de atenção
    experiment.ts        Benchmark comparativo Feed-first vs. Busca-first
    metrics.ts           Métricas de sessão e formatação
  state/
    store.tsx            Estado global React, integração em tempo real com os motores e sync com a API
  components/
    FeedCard.tsx         Slide vertical (até 60s) com curtida, sacola, timer e detalhes
    CartSheet.tsx        Fluxo completo em 3 etapas: Sacola Multi-Restaurante → Checkout → Tracking
    WhySheet.tsx         Modal de detalhes e explicabilidade ("Por que apareceu para mim?")
  screens/
    FeedScreen.tsx       Feed principal com filtros (Para você / Ofertas quentes) e sacola no topo
    CollectionScreen.tsx Coleção de Curtidos + Tela de Perfil com diagnóstico real de paladar
    FastLaneScreen.tsx   Atalho de decisão rápida em 3 rotas (mais rápido, custo-benefício, popular)
    ExperimentScreen.tsx Case Study A/B com telemetria real da sessão, funil e histograma
    LabScreen.tsx        Laboratório interativo para ajuste de pesos e restrições do motor
scripts/
  smoke.ts               Suíte de 35 verificações automatizadas dos motores de domínio
```

---

## Créditos e Limites Declarados

- Fotografias ilustrativas sob licença Unsplash documentadas em [assets/food/CREDITS.md](assets/food/CREDITS.md).
- Tipografia `Manrope` (Google Fonts / OFL) e ícones `Lucide` (ISC).
- Catálogo, preços e pagamentos são demonstrativos para portfólio de engenharia de produto e software.
