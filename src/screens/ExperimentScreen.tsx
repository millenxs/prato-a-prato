import Slider from '@react-native-community/slider';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bar, Button, Card, SectionLabel } from '../components/ui';
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

export function ExperimentScreen() {
  const { state } = useStore();
  const [sessions, setSessions] = useState(120);
  const [seed, setSeed] = useState(2026);
  const [friction, setFriction] = useState<Friction>('media');

  const result = useMemo(
    () => runExperiment({ sessions, seed, searchFriction: friction, lab: state.lab }),
    [sessions, seed, friction, state.lab],
  );

  const maxTime = Math.max(result.feed.avgTimeToDecisionSec, result.search.avgTimeToDecisionSec, 1);
  const maxActions = Math.max(result.feed.avgActionsToDecision, result.search.avgActionsToDecision, 1);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <Text style={styles.title}>A/B: feed-first vs busca-first</Text>
        <Text style={styles.subtitle}>
          Um simulador sintético para demonstrar a hipótese do produto: o feed precisa reduzir o tempo até o pedido,
          não aumentar tempo de tela. Os dois braços usam o mesmo catálogo e as mesmas restrições duras.
        </Text>
      </View>

      <Card>
        <SectionLabel>Resultado</SectionLabel>
        <Text style={[styles.verdict, result.winner === 'feed-first' && { color: colors.success }]}>
          {result.verdict}
        </Text>
        <View style={styles.liftGrid}>
          <Lift label="tempo até decisão" value={pct(result.lift.timeReductionPct)} positive={result.lift.timeReductionPct >= 0} />
          <Lift label="ações até decisão" value={pct(result.lift.actionReductionPct)} positive={result.lift.actionReductionPct >= 0} />
          <Lift label="conversão" value={pp(result.lift.conversionDeltaPctPoints)} positive={result.lift.conversionDeltaPctPoints >= -3} />
          <Lift label="margem" value={pp(result.lift.marginDeltaPctPoints)} positive={result.lift.marginDeltaPctPoints >= 0} />
        </View>
        <Text style={styles.hint}>
          Valores positivos indicam vantagem do feed-first sobre busca-first. A margem de segurança aceita até -3 p.p.
          de conversão para priorizar redução de tempo.
        </Text>
      </Card>

      <View style={styles.armGrid}>
        <ArmCard arm={result.feed} winner={result.winner === 'feed-first'} />
        <ArmCard arm={result.search} winner={result.winner === 'search-first'} />
      </View>

      <Card>
        <SectionLabel>Comparação visual</SectionLabel>
        <CompareRow
          label="Tempo médio até decisão"
          leftLabel="Feed"
          leftValue={result.feed.avgTimeToDecisionSec}
          rightLabel="Busca"
          rightValue={result.search.avgTimeToDecisionSec}
          max={maxTime}
          formatter={(v) => formatSeconds(Math.round(v))}
          lowerIsBetter
        />
        <CompareRow
          label="Ações até decisão"
          leftLabel="Feed"
          leftValue={result.feed.avgActionsToDecision}
          rightLabel="Busca"
          rightValue={result.search.avgActionsToDecision}
          max={maxActions}
          formatter={(v) => v.toFixed(1)}
          lowerIsBetter
        />
        <CompareRow
          label="Taxa de conversão"
          leftLabel="Feed"
          leftValue={result.feed.conversionRate}
          rightLabel="Busca"
          rightValue={result.search.conversionRate}
          max={1}
          formatter={(v) => pct(v)}
        />
        <CompareRow
          label="Concentração no top merchant"
          leftLabel="Feed"
          leftValue={result.feed.avgTopMerchantShare}
          rightLabel="Busca"
          rightValue={result.search.avgTopMerchantShare}
          max={1}
          formatter={(v) => pct(v)}
          lowerIsBetter
        />
      </Card>

      <Card>
        <SectionLabel>Parâmetros do experimento</SectionLabel>
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

        <SectionLabel>Atrito da busca</SectionLabel>
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
          <Button title="Nova amostra" onPress={() => setSeed((value) => value + 101)} />
          <Button title="Amostra padrão" variant="outline" onPress={() => setSeed(2026)} />
        </View>
        <Text style={styles.hint}>
          O experimento usa os pesos e restrições atuais do Laboratório. Mude ETA, raio, margem ou exploração e volte
          aqui para ver o impacto.
        </Text>
      </Card>

      <Card>
        <SectionLabel>Metodologia declarada</SectionLabel>
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
  head: { gap: spacing.sm },
  title: { color: colors.white, fontSize: font.h1, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: font.body, lineHeight: 22 },
  verdict: { color: colors.text, fontSize: font.h3, fontWeight: '800', lineHeight: 27 },
  liftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  liftCard: { width: '47%', backgroundColor: colors.surfaceRaised, borderRadius: radius.md, padding: spacing.md },
  liftValue: { fontSize: font.h3, fontWeight: '900' },
  liftLabel: { color: colors.textFaint, fontSize: 10, marginTop: 2 },
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
  friction: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  frictionActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  frictionTitle: { color: colors.textMuted, fontSize: font.small, fontWeight: '900' },
  frictionTitleActive: { color: colors.accent },
  frictionBody: { color: colors.textFaint, fontSize: 10, marginTop: 3 },
  seedRow: { gap: spacing.sm },
  hint: { color: colors.textFaint, fontSize: font.micro, lineHeight: 16, marginTop: spacing.md },
  methodList: { gap: spacing.sm },
  methodItem: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
});
