# prato a prato

> **A tese:** um feed de comida não pode otimizar tempo de tela. Ele tem que **encurtar a decisão** — e provar isso com números.

Protótipo de aplicativo de delivery que troca a busca por um feed vertical (estilo TikTok/Reels) com swipe de salvar/pular (estilo Tinder), mas coloca as regras de negócio **antes** do algoritmo de atenção:

- Restrições duras decidem **quem pode aparecer** (loja aberta, ETA, raio, capacidade da cozinha, item disponível).
- O ranking decide **em que ordem** aparecem (relevância, margem, novidade, proximidade, qualidade, volume).
- Um **orçamento de atenção** decide **quantas vezes o app pode interromper** — e registra o que foi barrado.
- Um **atalho de decisão** corta o feed infinito quando rolar deixa de ser divertido.

Tudo isso é visível e ajustável em tempo real no **Laboratório**.

---

## O que este projeto é (e o que não é)

**É** um protótipo de portfólio focado em uma única pergunta de produto: *como um feed de vídeo pode reduzir o tempo até o pedido sem aumentar o subsídio?*

**Não é** um app de delivery funcional. Declaradamente fora do escopo:

| Fora de escopo | Por quê |
|---|---|
| Pagamento e entrega reais | não mudam a tese em teste e custam semanas |
| Catálogo real / scraping | dados sintéticos bastam para exercitar o motor |
| Login, multi-cidade, moderação | não provam nada sobre a decisão |
| Push remoto | notificação local + banner no app já demonstram o funil |
| Módulo nativo de vídeo | Expo + vídeo/imagem remota resolve; nativo só com medição que justifique |

---

## Rodando

Requisitos: Node 20+ (testado com Node 22) e npm.

```bash
npm install

npm start          # Expo — abre no dispositivo via Expo Go
npm run web        # versão web (bundle Metro)
npm run android    # emulador/dispositivo Android
npm run typecheck  # tsc --noEmit
npm run smoke      # testes do motor de decisão (sem React Native)
npm run export:web # gera build web estático em dist/
```

O `smoke` compila `src/engine` e `src/data` com TypeScript e roda asserções sobre ranking, diversidade, exploração, gatilhos e métricas. É o teste que protege a parte que realmente importa aqui.

---

## Estrutura

```
src/
  data/seed.ts            12 lojas, 40 pratos, mídia placeholder
  engine/ranking.ts       restrições duras → score → diversidade → exploração
  engine/triggers.ts      regras de interrupção + orçamento de atenção
  engine/metrics.ts       contra-métricas (tempo até decisão, concentração)
  state/store.tsx         estado da sessão, perfil de gosto, log de eventos
  components/             FeedCard, WhySheet, CartSheet, TriggerBanner, ui
  screens/                FeedScreen, FastLaneScreen, LabScreen
scripts/smoke.ts          verificação do motor sem UI
```

Toda a lógica de decisão é pura e vive em `src/engine`. A UI só desenha e registra eventos — nada de regra de negócio em componente.

---

## Como a decisão é montada

### 1. Restrições duras (não há exceção)

Um prato só entra no feed se passar em **todas**:

```
loja aberta agora
openOrders < capacidade da cozinha
ETA ≤ maxEta (padrão 45 min)
distância ≤ maxDistance (padrão 4 km)
item disponível
```

O que for barrado não desaparece: vai para o painel **"Por que outros ficaram de fora"** com o motivo. Na configuração padrão, 27 dos 40 pratos são elegíveis e os 13 restantes aparecem como `ETA acima do limite`, `cozinha lotada`, `fora do raio`, `loja fechada` ou `item esgotado`.

### 2. Score ponderado

Cada fator é normalizado em 0–1 e multiplicado por um peso. O score final é a soma das contribuições — os pesos são normalizados, então o que importa é a proporção:

| Fator | Padrão | O que mede |
|---|---|---|
| Combina com você | 30% | afinidade com as tags que você salvou/pulou |
| Margem do restaurante | 12% | contribuição estimada para a operação |
| Novidade | 10% | prato novo ou pouco pedido hoje |
| Proximidade | 12% | distância até a loja |
| Qualidade | 16% | nota da loja + histórico |
| Desejo agora | 20% | volume de pedidos nas últimas horas |

### 3. Diversidade

Ordenação gulosa: nunca **3 cozinhas iguais seguidas** e nunca mais que **N cards por loja**. Se não há candidato que respeite o teto, o feed termina — e o número de cards cortados é reportado, em vez de escondido.

### 4. Exploração

Com probabilidade `exploration` (padrão 10%), o feed troca posições para furar a bolha do topo. Sorteia **posição**, nunca elegibilidade.

### 5. Perfil de gosto

Salvar e pular atualizam o perfil por tag (`+0.18` / `-0.12`, entre -1 e 1). O próximo feed já reflete a mudança — o atual não se reordena no meio da rolagem.

---

## Gatilhos e orçamento de atenção

O app pode interromper por quatro motivos: carrinho parado, rolagem longa, pratos salvos sem pedido e janela de fome (11h–13h / 18h–21h). Uma regra só vira interrupção se:

1. o **modo silencioso** estiver desligado, e
2. ainda houver **orçamento de atenção** (interrupções do dia < teto), e
3. o usuário **não tiver convertido** nesta sessão, e
4. o gatilho não tiver sido **dispensado** antes, e
5. tiver passado o **cooldown de 45s** desde a última interrupção, e
6. nenhuma **outra interrupção** já estiver na tela.

Toda negação é registrada com o motivo. O Laboratório mostra `interrupções exibidas / teto` e `gatilhos barrados` — o custo de incomodar é medido, não estimado.

---

## O Laboratório

| Controle | Efeito observável |
|---|---|
| Pesos do ranking | reordena o feed na hora |
| `maxEta` / raio / cards por loja | muda quem é excluído e quanto o feed encolhe |
| Exploração | muda a ordem sem mudar o conjunto elegível |
| Teto de interrupções | liga/desliga os gatilhos e o modo silencioso |
| Presets | "Margem alta", "Entrega rápida", "Descoberta", "Silêncio total" |

Também ficam lá: distribuição de exposição por loja, tempo até decisão, taxas de pulo/salvo, concentração do topo e os últimos eventos registrados.

---

## Contra-métrica

A métrica principal **não** é tempo de sessão nem cards vistos. É:

- **tempo até a decisão** (primeiro item adicionado), e
- **cards até a decisão**, e
- **concentração de exposição no topo** (prova de que o feed não virou vitrine de uma loja), e
- **interrupções exibidas vs. barradas**.

Um feed que aumenta o tempo no app e atrasa o pedido está falhando, mesmo com engajamento bonito.

---

## Experimento A/B: feed-first vs busca-first

A aba **A/B** roda uma simulação sintética para comparar dois caminhos com o mesmo catálogo e as mesmas restrições duras:

| Braço | Como decide | O que mede |
|---|---|---|
| **Feed-first** | cards ranqueados + swipe + fast lane | cards vistos, ações até add, tempo até decisão, concentração por loja, interrupções |
| **Busca-first** | intenção explícita + lista de resultados + comparação | resultados vistos, ações de busca/filtro, tempo até decisão, conversão |

Parâmetros ajustáveis na tela:

- número de sessões sintéticas;
- semente da amostra;
- atrito da busca: baixa, média ou alta;
- pesos e restrições herdados do **Laboratório**.

Critério de vitória do protótipo: o feed-first vence se reduzir o tempo até decisão em pelo menos 8% sem perder mais que 3 pontos percentuais de conversão. O resultado mostra redução de tempo, redução de ações, delta de conversão e delta de margem.

Limite importante: isso **não** é evidência de mercado. É um simulador de portfólio para explicar a hipótese, o desenho do experimento e quais métricas seriam levadas para um A/B real.

---

## Decisões de arquitetura

- **React Native + Expo.** Um código, três alvos (Android, iOS, web). `npm run export:web` gera o link que um recrutador abre sem instalar nada.
- **Sem backend.** O motor é determinístico e puro; roda no cliente. Colocar API/banco aqui só atrasaria a demo — a decisão de migrar para servidor viria quando o A/B precisasse coletar eventos reais.
- **Gesto com `PanResponder` + `Animated` do core.** Sem dependência nativa extra: o swipe funciona igual em Android, iOS e web.
- **Mídia é placeholder.** Trocar por vídeo é mudar `type` em `Media` — o card já aceita `'image' | 'video'`. Se a mídia falhar, o card cai no gradiente da marca + emoji, então a demo nunca fica em branco.
- **Eventos locais.** `impression`, `skip`, `save`, `add`, `checkout`, `trigger_shown`, `trigger_suppressed`, `feed_rebuilt` — o mesmo vocabulário que um pipeline real teria, sem a infraestrutura.

---

## Roteiro de demo (90 segundos)

1. **0–15s** — "delivery otimiza busca; feed otimiza atenção. Em comida, o feed tem que *encurtar* a decisão."
2. **15–45s** — rolar o feed, salvar dois pratos, mostrar o swipe e o card com score.
3. **45–65s** — abrir **"Por que este prato?"** e mostrar uma pizza barrada por ETA, uma cozinha lotada e um item esgotado.
4. **65–80s** — abrir **A/B** e mostrar feed-first vs busca-first: tempo, ações, conversão e concentração.
5. **80–90s** — Laboratório: alterar atrito/ETA/margem e voltar ao A/B para ver a hipótese mudar.

---

## Limites declarados

- Dados, preços, margens e volumes são **sintéticos**.
- Sem pagamento, entrega, autenticação ou persistência entre sessões.
- A "janela de fome" usa o relógio do dispositivo.
- Métricas vêm de eventos locais do protótipo; **não** são um experimento com usuários reais.
- A linha de pesquisa que motivou a tese (feed-first + orçamento de atenção) veio de análise pública de apps de delivery brasileiros e de material público de engenharia de mercado. Este repositório é independente e não usa código, marca ou dados de terceiros.

## Próximos passos plausíveis

1. Persistir eventos e transformar o A/B sintético em experimento real com usuários.
2. Trocar mídia por vídeo curto com prefetch de 2 cards e medir custo de rede.
3. Mover o ranking para um serviço só quando o experimento exigir mudar pesos sem publicar app.
4. Adicionar restrição de horário por categoria (café da manhã, almoço, jantar) para testar relevância contextual.
