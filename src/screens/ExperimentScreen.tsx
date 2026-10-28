import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Bar, Button, Card, SectionLabel } from '../components/ui';
import { pp, pct, runExperiment, type ArmMetrics, type ExperimentConfig } from '../engine/experiment';
import { formatSeconds } from '../engine/metrics';
import { useStore } from '../state/store';
import { colors, font, radius, spacing } from '../theme';

type Friction = ExperimentConfig['searchFriction'];

const FRICTIONS: Array<{ value: Friction; label: string; body: string }> = [
  { value: 'baixa', label: 'baixa', body: 'usuário sabe o que quer' },
  { value: 'media', label: 'média', body: 'busca + comparação normal' },
  { value: 'alta', label: 'alta', body: 'usuário indeciso / filtro demais' },
];

const PILLARS = [
  {
    tag: '01 · O PROBLEMA',
    title: 'Busca exige intenção; feed social vicia em tela',
    body: 'Quando o usuário está com fome mas sem ideia fixa, a busca tradicional força digitação, abertura de lojas e comparação manual. Já um feed puro de rede social otimiza tempo de tela — o oposto de fechar um pedido.',
  },
  {
    tag: '02 · A ARQUITETURA',
    title: 'Cérebro próprio + restrições duras antes do score',
    body: 'Em vez de delegar campanhas para uma caixa-preta, o motor filtra primeiro a operação real (loja aberta, cozinha com folga, ETA ≤ limite, raio, estoque) e só depois ranqueia relevância, margem, qualidade e novidade.',
  },
  {
    tag: '03 · A CONTRA-MÉTRICA',
    title: 'Sucesso é decidir rápido sem queimar margem',
    body: 'O experimento mede tempo até o primeiro item no carrinho, número de ações, concentração de exposição no top merchant e orçamento diário de interrupções.',
  },
];

export function ExperimentScreen() {
  const { state, tasteAnalysis, backendOnline } = useStore();
  const [sessions, setSessions] = useState(120);
  const [seed, setSeed] = useState(2026);
  const [friction, setFriction] = useState<Friction>('media');

  const result = useMemo(
    () => runExperiment({ sessions, seed, searchFriction: friction, lab: state.lab }),
    [sessions, seed, friction, state.lab],
  );

  const maxTime = Math.max(result.feed.avgTimeToDecisionSec, result.search.avgTimeToDecisionSec, 1);
  const maxActions = Math.max(result.feed.avgActionsToDecision, result.search.avgActionsToDecision, 1);
  const rt = tasteAnalysis.realTelemetry;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#2A1215', '#15151C', '#121824']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroBadges}>
          <Badge label="CASE STUDY & TELEMETRIA REAL" tone="accent" />
          <Badge label={backendOnline ? 'API NODE.JS + TS ATIVA (:3333)' : 'MOTOR EM TEMPO REAL'} tone="success" />
          <Badge label={`${tasteAnalysis.totalSignals} SINAIS REAIS`} tone="gold" />
        </View>
        <Text style={styles.title}>Feed-first vs. Busca-first</Text>
        <Text style={styles.subtitle}>
          Como um feed vertical com restrições duras de supply, Fast Lane e análise de gosto em tempo real encurta a
          decisão de pedido sem sacrificar a margem do restaurante.
        </Text>

        <View style={styles.heroQuote}>
          <Text style={styles.heroQuoteLabel}>TESE CENTRAL</Text>
          <Text style={styles.heroQuoteText}>
            “Delivery tradicional otimiza busca; feeds sociais otimizam atenção. Em comida, o feed só vence se reduzir
            o tempo até o pedido mantendo conversão e recomendação assertiva.”
          </Text>
        </View>
      </LinearGradient>

      <Card>
        <View style={styles.verdictHeader}>
          <SectionLabel>Dados reais da sua sessão (Você vs. Busca Tradicional)</SectionLabel>
          <Badge
            label={rt.hasRealInteractions ? `CONFIANÇA ${tasteAnalysis.confidencePct}%` : 'AGUARDANDO INTERAÇÃO'}
            tone={rt.hasRealInteractions ? 'success' : 'neutral'}
          />
        </View>
        <Text style={styles.chartIntro}>{tasteAnalysis.summaryText}</Text>

        <View style={styles.liftGrid}>
          <Lift
            label="seu tempo até o 1º pedido"
            value={rt.realTimeToDecisionSec !== null ? `${rt.realTimeToDecisionSec}s` : '—'}
            positive={rt.realTimeToDecisionSec === null || rt.realTimeToDecisionSec <= rt.searchBaselineSec}
          />
          <Lift
            label="economia vs busca (44s)"
            value={rt.timeSavedVsSearchPct !== null ? `${rt.timeSavedVsSearchPct >= 0 ? '+' : ''}${rt.timeSavedVsSearchPct}%` : '—'}
            positive={(rt.timeSavedVsSearchPct ?? 0) >= 0}
          />
          <Lift
            label="acerto da recomendação"
            value={rt.recommendationHitRatePct > 0 ? `${rt.recommendationHitRatePct}%` : '—'}
            positive={rt.recommendationHitRatePct >= 60}
          />
          <Lift
            label="sinais reais capturados"
            value={`${rt.realLikes}♥ · ${rt.realWatchedComplete}🎬 · ${rt.realCartAdds}🛒`}
            positive
          />
        </View>

        <View style={styles.guardrailWrap}>
          <Text style={styles.subHeading}>Predição real de gosto (O que você vai gostar vs. evitar)</Text>
          <View style={styles.guardrailList}>
            {tasteAnalysis.predictedFavorites.slice(0, 2).map((fav) => (
              <View key={fav.item.dish.id} style={styles.guardrailRow}>
                <View style={styles.guardrailText}>
                  <Text style={styles.guardrailLabel}>
                    Recomendado: {fav.item.dish.name} ({fav.item.merchant.name})
                  </Text>
                  <Text style={styles.guardrailMeta}>{fav.reasonsToLike.join(' · ')}</Text>
                </View>
                <Badge label={`${fav.matchPct}% MATCH`} tone="success" />
              </View>
            ))}
            {tasteAnalysis.predictedAvoid.slice(0, 1).map((av) => (
              <View key={av.item.dish.id} style={styles.guardrailRow}>
                <View style={styles.guardrailText}>
                  <Text style={styles.guardrailLabel}>
                    Rebaixado p/ você: {av.item.dish.name} ({av.item.merchant.name})
                  </Text>
                  <Text style={styles.guardrailMeta}>
                    {av.reasonsToAvoid.length > 0 ? av.reasonsToAvoid.join(' · ') : 'Menor compatibilidade com seu histórico'}
                  </Text>
                </View>
                <Badge label="EVITADO" tone="danger" />
              </View>
            ))}
          </View>
        </View>
      </Card>

      <View style={styles.pillarList}>
        {PILLARS.map((pillar) => (
          <Card key={pillar.tag} style={styles.pillarCard}>
            <Text style={styles.pillarTag}>{pillar.tag}</Text>
            <Text style={styles.pillarTitle}>{pillar.title}</Text>
            <Text style={styles.pillarBody}>{pillar.body}</Text>
          </Card>
        ))}
      </View>

      <Card>
        <View style={styles.verdictHeader}>
          <SectionLabel>Veredito executivo do experimento</SectionLabel>
          <Badge
            label={
              result.winner === 'feed-first'
                ? 'FEED-FIRST VENCE'
                : result.winner === 'search-first'
                  ? 'BUSCA-FIRST VENCE'
                  : 'INCONCLUSIVO'
            }
            tone={result.winner === 'feed-first' ? 'success' : result.winner === 'search-first' ? 'gold' : 'neutral'}
          />
        </View>
        <Text style={[styles.verdict, result.winner === 'feed-first' && { color: colors.success }]}>
          {result.verdict}
        </Text>
        <View style={styles.liftGrid}>
          <Lift
            label="redução no tempo até decisão"
            value={pct(result.lift.timeReductionPct)}
            positive={result.lift.timeReductionPct >= 0}
          />
          <Lift
            label="redução de ações do usuário"
            value={pct(result.lift.actionReductionPct)}
            positive={result.lift.actionReductionPct >= 0}
          />
          <Lift
            label="delta de conversão"
            value={pp(result.lift.conversionDeltaPctPoints)}
            positive={result.lift.conversionDeltaPctPoints >= -3}
          />
          <Lift
            label="delta de margem bruta"
            value={pp(result.lift.marginDeltaPctPoints)}
            positive={result.lift.marginDeltaPctPoints >= 0}
          />
        </View>

        <View style={styles.guardrailWrap}>
          <Text style={styles.subHeading}>Guardrails de negócio</Text>
          <View style={styles.guardrailList}>
            {result.guardrails.map((g) => (
              <View key={g.label} style={styles.guardrailRow}>
                <View style={styles.guardrailText}>
                  <Text style={styles.guardrailLabel}>{g.label}</Text>
                  <Text style={styles.guardrailMeta}>meta {g.target}</Text>
                </View>
                <Text style={styles.guardrailActual}>{g.actual}</Text>
                <Badge label={g.passed ? 'OK' : 'ALERTA'} tone={g.passed ? 'success' : 'danger'} />
              </View>
            ))}
          </View>
        </View>
      </Card>

      <Card>
        <SectionLabel>Gráfico 1 · Funil de decisão passo a passo</SectionLabel>
        <Text style={styles.chartIntro}>
          Ambos os braços partem do mesmo estoque elegível ({state.feed.eligible}/{state.feed.candidates} pratos que
          passaram pelas restrições duras). Veja onde o atrito de busca derruba a jornada:
        </Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Feed-first (swipe + Fast Lane)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.legendText}>Busca-first (digitar + filtrar)</Text>
          </View>
        </View>

        <View style={styles.funnelList}>
          {result.funnel.map((step) => (
            <View key={step.step} style={styles.funnelBlock}>
              <View style={styles.funnelHeader}>
                <Text style={styles.funnelTitle}>{step.step}</Text>
                <Text style={styles.funnelCaption}>{step.caption}</Text>
              </View>
              <View style={styles.compareLine}>
                <Text style={[styles.compareName, { color: colors.success }]}>Feed</Text>
                <Bar value={step.feedRate} color={colors.success} height={10} />
                <Text style={styles.compareValue}>{pct(step.feedRate)}</Text>
              </View>
              <View style={styles.compareLine}>
                <Text style={[styles.compareName, { color: colors.accent }]}>Busca</Text>
                <Bar value={step.searchRate} color={colors.accent} height={10} />
                <Text style={styles.compareValue}>{pct(step.searchRate)}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <SectionLabel>Gráfico 2 · Distribuição do tempo até a decisão</SectionLabel>
        <Text style={styles.chartIntro}>
          Proporção dos pedidos convertidos por faixa de tempo. O feed desloca a curva para a esquerda (decisões em até
          30s), enquanto a busca concentra decisões acima de 45s.
        </Text>
        <View style={styles.bucketList}>
          {result.timeBuckets.map((bucket) => (
            <View key={bucket.label} style={styles.bucketBlock}>
              <Text style={styles.bucketLabel}>{bucket.label}</Text>
              <View style={styles.compareLine}>
                <Text style={[styles.compareName, { color: colors.success }]}>Feed</Text>
                <Bar value={bucket.feedShare} color={colors.success} height={9} />
                <Text style={styles.compareValue}>{pct(bucket.feedShare)}</Text>
              </View>
              <View style={styles.compareLine}>
                <Text style={[styles.compareName, { color: colors.gold }]}>Busca</Text>
                <Bar value={bucket.searchShare} color={colors.gold} height={9} />
                <Text style={styles.compareValue}>{pct(bucket.searchShare)}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <SectionLabel>Gráfico 3 · Tempo médio por intenção de consumo</SectionLabel>
        <Text style={styles.chartIntro}>
          Quanto menor a barra, mais rápida foi a decisão naquela categoria de fome:
        </Text>
        <View style={styles.intentList}>
          {result.byIntent.map((row) => {
            const feedWins = row.winner === 'feed-first';
            return (
              <View key={row.intent} style={styles.intentRow}>
                <View style={styles.intentHeader}>
                  <Text style={styles.intentTitle}>
                    {row.emoji} {row.intent}
                  </Text>
                  <Badge
                    label={feedWins ? `Feed -${Math.max(0, row.searchSec - row.feedSec)}s` : `Busca -${Math.max(0, row.feedSec - row.searchSec)}s`}
                    tone={feedWins ? 'success' : 'gold'}
                  />
                </View>
                <Text style={styles.intentNumbers}>
                  Feed: <Text style={styles.intentStrong}>{row.feedSec}s</Text> · Busca:{' '}
                  <Text style={styles.intentStrong}>{row.searchSec}s</Text>
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <SectionLabel>Gráfico 4 · Métricas-chave frente a frente</SectionLabel>
        <CompareRow
          label="Tempo médio até decisão (menor é melhor)"
          leftLabel="Feed"
          leftValue={result.feed.avgTimeToDecisionSec}
          rightLabel="Busca"
          rightValue={result.search.avgTimeToDecisionSec}
          max={maxTime}
          formatter={(v) => formatSeconds(Math.round(v))}
          lowerIsBetter
        />
        <CompareRow
          label="Ações até decisão (menor é melhor)"
          leftLabel="Feed"
          leftValue={result.feed.avgActionsToDecision}
          rightLabel="Busca"
          rightValue={result.search.avgActionsToDecision}
          max={maxActions}
          formatter={(v) => v.toFixed(1)}
          lowerIsBetter
        />
        <CompareRow
          label="Taxa de conversão (maior é melhor)"
          leftLabel="Feed"
          leftValue={result.feed.conversionRate}
          rightLabel="Busca"
          rightValue={result.search.conversionRate}
          max={1}
          formatter={(v) => pct(v)}
        />
        <CompareRow
          label="Concentração no top merchant (menor = mais diverso)"
          leftLabel="Feed"
          leftValue={result.feed.avgTopMerchantShare}
          rightLabel="Busca"
          rightValue={result.search.avgTopMerchantShare}
          max={1}
          formatter={(v) => pct(v)}
          lowerIsBetter
        />
      </Card>

      <View style={styles.armGrid}>
        <ArmCard arm={result.feed} winner={result.winner === 'feed-first'} />
        <ArmCard arm={result.search} winner={result.winner === 'search-first'} />
      </View>

      <Card>
        <SectionLabel>Simulador interativo · Teste outros cenários</SectionLabel>
        <View style={styles.sliderBlock}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Sessões sintéticas</Text>
            <Text style={styles.sliderValue}>{sessions}</Text>
          </View>
          <Slider
            minimumValue={40}
            maximumValue={400}
            step={20}
            value={sessions}
            onValueChange={setSessions}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
          />
        </View>

        <SectionLabel>Atrito da busca tradicional</SectionLabel>
        <View style={styles.frictionRow}>
          {FRICTIONS.map((item) => (
            <Pressable
              key={item.value}
              style={[styles.friction, friction === item.value && styles.frictionActive]}
              onPress={() => setFriction(item.value)}
            >
              <Text style={[styles.frictionTitle, friction === item.value && styles.frictionTitleActive]}>
                {item.label}
              </Text>
              <Text style={styles.frictionBody}>{item.body}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.seedRow}>
          <Button title="Sortear nova amostra" onPress={() => setSeed((value) => value + 101)} />
          <Button title="Voltar à amostra padrão (seed 2026)" variant="outline" onPress={() => setSeed(2026)} />
        </View>
        <Text style={styles.hint}>
          Conectado ao vivo com a aba Laboratório: se você alterar pesos de margem, ETA máximo, raio ou exploração lá,
          todos os gráficos deste case study recalculam na hora.
        </Text>
      </Card>

      <Card>
        <SectionLabel>Metodologia & Limites declarados</SectionLabel>
        <View style={styles.methodList}>
          {result.methodology.map((item) => (
            <Text key={item} style={styles.methodItem}>
              • {item}
            </Text>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

function ArmCard({ arm, winner }: { arm: ArmMetrics; winner: boolean }) {
  return (
    <Card style={[styles.armCard, winner && styles.armWinner]}>
      <View style={styles.armHeader}>
        <Text style={styles.armTitle}>{arm.label}</Text>
        {winner ? <Text style={styles.winner}>vence</Text> : null}
      </View>
      <Metric label="conversão" value={`${arm.conversions} · ${pct(arm.conversionRate)}`} />
      <Metric label="tempo médio" value={formatSeconds(Math.round(arm.avgTimeToDecisionSec))} />
      <Metric label="mediana" value={formatSeconds(Math.round(arm.medianTimeToDecisionSec))} />
      <Metric label="ações" value={arm.avgActionsToDecision.toFixed(1)} />
      <Metric label="vistos" value={arm.avgCardsOrResultsSeen.toFixed(1)} />
      <Metric label="ticket" value={`R$ ${arm.avgTicket.toFixed(2).replace('.', ',')}`} />
      <Metric label="margem" value={pct(arm.avgMarginPct)} />
      <Metric label="interrupção/sessão" value={arm.interruptionRate.toFixed(2)} />
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricLine}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Lift({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <View style={styles.liftCard}>
      <Text style={[styles.liftValue, { color: positive ? colors.success : colors.danger }]}>{value}</Text>
      <Text style={styles.liftLabel}>{label}</Text>
    </View>
  );
}

function CompareRow({
  label,
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
  max,
  formatter,
  lowerIsBetter,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  leftValue: number;
  rightValue: number;
  max: number;
  formatter: (value: number) => string;
  lowerIsBetter?: boolean;
}) {
  const leftWins = lowerIsBetter ? leftValue <= rightValue : leftValue >= rightValue;
  return (
    <View style={styles.compare}>
      <Text style={styles.compareTitle}>{label}</Text>
      <View style={styles.compareLine}>
        <Text style={[styles.compareName, leftWins && styles.compareWinner]}>{leftLabel}</Text>
        <Bar value={leftValue / max} color={leftWins ? colors.success : colors.accent} height={8} />
        <Text style={styles.compareValue}>{formatter(leftValue)}</Text>
      </View>
      <View style={styles.compareLine}>
        <Text style={[styles.compareName, !leftWins && styles.compareWinner]}>{rightLabel}</Text>
        <Bar value={rightValue / max} color={!leftWins ? colors.success : colors.accent} height={8} />
        <Text style={styles.compareValue}>{formatter(rightValue)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  title: { color: colors.white, fontSize: font.h1, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: font.body, lineHeight: 22 },
  heroQuote: {
    backgroundColor: 'rgba(6, 6, 10, 0.55)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    gap: 4,
  },
  heroQuoteLabel: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroQuoteText: { color: colors.text, fontSize: font.small, lineHeight: 20, fontStyle: 'italic' },
  pillarList: { gap: spacing.sm },
  pillarCard: { gap: 4 },
  pillarTag: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  pillarTitle: { color: colors.white, fontSize: font.body, fontWeight: '800' },
  pillarBody: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  verdictHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  verdict: { color: colors.text, fontSize: font.h3, fontWeight: '800', lineHeight: 27 },
  liftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  liftCard: { width: '47%', backgroundColor: colors.surfaceRaised, borderRadius: radius.md, padding: spacing.md },
  liftValue: { fontSize: font.h3, fontWeight: '900' },
  liftLabel: { color: colors.textFaint, fontSize: 10, marginTop: 2 },
  guardrailWrap: { marginTop: spacing.lg, gap: spacing.sm },
  subHeading: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  guardrailList: { gap: spacing.xs },
  guardrailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  guardrailText: { flex: 1 },
  guardrailLabel: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  guardrailMeta: { color: colors.textFaint, fontSize: 10 },
  guardrailActual: { color: colors.white, fontSize: font.small, fontWeight: '800' },
  chartIntro: { color: colors.textMuted, fontSize: font.small, lineHeight: 20, marginBottom: spacing.md },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginBottom: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.textMuted, fontSize: font.micro, fontWeight: '700' },
  funnelList: { gap: spacing.md },
  funnelBlock: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },
  funnelHeader: { marginBottom: 2 },
  funnelTitle: { color: colors.white, fontSize: font.small, fontWeight: '800' },
  funnelCaption: { color: colors.textFaint, fontSize: 10 },
  bucketList: { gap: spacing.md },
  bucketBlock: { gap: 4 },
  bucketLabel: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  intentList: { gap: spacing.sm },
  intentRow: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  intentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  intentTitle: { color: colors.white, fontSize: font.small, fontWeight: '800' },
  intentNumbers: { color: colors.textMuted, fontSize: font.micro },
  intentStrong: { color: colors.text, fontWeight: '800' },
  armGrid: { gap: spacing.md },
  armCard: {},
  armWinner: { borderColor: colors.success },
  armHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  armTitle: { color: colors.white, fontSize: font.h3, fontWeight: '900' },
  winner: { color: colors.success, fontSize: font.micro, fontWeight: '900', textTransform: 'uppercase' },
  metricLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: spacing.md },
  metricLabel: { color: colors.textMuted, fontSize: font.small },
  metricValue: { color: colors.white, fontSize: font.small, fontWeight: '800' },
  compare: { gap: spacing.sm, marginBottom: spacing.lg },
  compareTitle: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  compareLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  compareName: { color: colors.textMuted, fontSize: font.micro, width: 54, fontWeight: '700' },
  compareWinner: { color: colors.success },
  compareValue: { color: colors.text, fontSize: font.micro, width: 54, textAlign: 'right' },
  sliderBlock: { marginBottom: spacing.lg },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabel: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  sliderValue: { color: colors.accent, fontSize: font.small, fontWeight: '800' },
  frictionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  friction: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  frictionActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  frictionTitle: { color: colors.textMuted, fontSize: font.small, fontWeight: '900' },
  frictionTitleActive: { color: colors.accent },
  frictionBody: { color: colors.textFaint, fontSize: 10, marginTop: 3 },
  seedRow: { gap: spacing.sm },
  hint: { color: colors.textFaint, fontSize: font.micro, lineHeight: 16, marginTop: spacing.md },
  methodList: { gap: spacing.sm },
  methodItem: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
});
