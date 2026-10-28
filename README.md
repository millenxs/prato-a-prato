# prato a prato.

**Seu próximo favorito pode estar a um deslize.**

Protótipo de descoberta de comida em React Native + Expo + TypeScript.
Feed vertical de slides, curtidas e carrinho, com recomendações que se adaptam
às interações da sessão.

## Experiência

- **Explorar:** fotografias em destaque, paginação vertical, pausa/retomada e
  duplo-toque para curtir. Filtros Para você e Ofertas.
- **Curtidos:** coleção visual dos pratos salvos, com acesso ao carrinho.
- **Escolhas:** atalhos por tempo de entrega, custo-benefício e popularidade.
- **Perfil:** interesses aprendidos e acesso ao Laboratório e Case A/B.
- **Carrinho:** itens, quantidades, subtotal e entrega por restaurante; checkout simulado.
- **Detalhes:** descrição, avaliação e entrega. A explicação do ranking fica
  disponível em “Por que apareceu para mim?”.

Direção visual: grafite, tons claros quentes, acento cítrico, tipografia Manrope,
ícones vetoriais e fotos locais. No desktop, a navegação lateral acompanha o feed
e a coleção; no celular, a navegação fica na base, respeitando as áreas seguras.

## Rodar

Requisitos: Node 22 e npm (use as versões compatíveis com Expo SDK 58).

```bash
npm ci
npm start          # Metro + QR do Expo Go
npm run web        # desenvolvimento no navegador
npm run typecheck
npm run smoke
npm run export:web # site estático em dist/
```

No iPhone, use Expo Go compatível com o SDK, na mesma rede do computador, e o
QR `exp://` exibido pelo Metro. Um link `http://` do site abre a versão web.
Se o Expo solicitar autenticação, entre no Expo Go e rode `npx expo login` no
terminal. O acesso depende também da rede local e das permissões do dispositivo.

## Recomendações

O catálogo sintético contém 40 itens e 12 restaurantes. Antes de calcular o score,
o motor verifica loja aberta, estoque, capacidade, ETA e distância. A ordenação
combina afinidade, margem, novidade, proximidade, qualidade e popularidade.

Sinais locais ajustam tags e culinária:

| Interação | Incremento de afinidade |
| --- | --- |
| Adicionar ao carrinho | +0,32 |
| Curtir | +0,22 |
| Completar um slide | +0,16 |
| Pular explicitamente (motor) | −0,14 |

Os valores são heurísticas, não percentuais de probabilidade. A fila futura é
reordenada preservando a posição do item visível. A reprodução só conta enquanto
o slide está ativo, carregado, em primeiro plano e sem modal sobreposto. O sinal
de conclusão exige 100% da duração, uma vez por item/sessão. Cada slide dura até
60 segundos. Preferência por movimento reduzido é respeitada.

## Case A/B e laboratório

Em **Perfil → Por dentro do projeto**, o Laboratório permite ajustar os pesos e
filtros. O Case A/B apresenta funil, distribuição temporal e comparações de uma
**simulação sintética**. Seus números dependem das hipóteses codificadas; não
demonstram ganhos observados com usuários reais nem significância estatística.
O motor de gatilhos permanece disponível para estudo; o feed principal prioriza
a navegação e oferece os atalhos de escolha de forma voluntária.

## Estrutura

```text
src/
  data/          catálogo e mapeamento das fotos
  engine/        ranking, métricas, gatilhos e simulação A/B
  state/         estado da sessão, perfil e eventos
  components/    slides, detalhes, carrinho e componentes visuais
  screens/       feed, curtidos/perfil, escolhas, laboratório e case
assets/
  brand/         identidade visual
  food/          fotografias e créditos
scripts/smoke.ts verificações do motor
```

## Limites do protótipo

As mídias desta versão são **slides fotográficos**, não vídeos gravados. Fotos
ilustrativas do Unsplash, armazenadas localmente, com fontes em
[assets/food/CREDITS.md](assets/food/CREDITS.md). As imagens não representam os
pratos ou restaurantes fictícios. Manrope: Google Fonts / OFL; ícones: Lucide / ISC.

Preços, ofertas, notas e popularidade são sintéticos. Não há pagamento, entrega,
upload de conteúdo, login de cliente ou persistência entre recarregamentos.
O modelo é baseado em regras locais, sem treinamento de machine learning.
