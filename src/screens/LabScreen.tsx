import Slider from '@react-native-community/slider';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Bar, Button, Card, SectionLabel } from '../components/ui';
import { formatSeconds } from '../engine/metrics';
import { defaultLab } from '../engine/ranking';
import { useStore } from '../state/store';
import { colors, font, radius, spacing } from '../theme';
import type { LabConfig } from '../types';

const PRESETS: Array<{ label: string; config: Partial<LabConfig> }> = [
  { label: 'Padrão', config: {} },
  {
    label: 'Margem alta',
    config: { wMargin: 0.4, wRelevance: 0.14, wPopularity: 0.16, wQuality: 0.1, wNovelty: 0.04, wProximity: 0.04, exploration: 0.05 },
  },
  {
    label: 'Entrega rápida',
    config: { maxEtaMin: 30, maxDistanceKm: 2, wProximity: 0.3, wRelevance: 0.24, wMargin: 0.1, wNovelty: 0.04, wQuality: 0.12, wPopularity: 0.12 },
  },
  {
    label: 'Descoberta',
    config: { exploration: 0.45, wNovelty: 0.3, wRelevance: 0.18, wMargin: 0.08, wProximity: 0.08, wQuality: 0.12, wPopularity: 0.16 },
  },
  { label: 'Silêncio total', config: { quietHours: true, attentionCap: 0 } },
];

function LabSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{format(value)}</Text>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.accent}
      />
    </View>
  );
}

export function LabScreen() {
  const { state, metrics, actions } = useStore();
  const lab = state.lab;
  const patch = (partial: Partial<LabConfig>) => actions.setLab({ ...lab, ...partial });

  const merchantKeys = Object.keys(state.merchantImpressions);
  const maxImpressions = merchantKeys.reduce(
    (acc, key) => Math.max(acc, state.merchantImpressions[key] ?? 0),
    0,
  );
  const recentEvents = [...state.events].slice(-8).reverse();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <Text style={styles.title}>Laboratório</Text>
        <Text style={styles.subtitle}>
          Os mesmos pesos e limites que o motor usa agora. Mude, gere de novo e veja o feed (e os excluídos) reagirem.
        </Text>
      </View>

      <Card>
        <SectionLabel>Sessão atual</SectionLabel>
        <View style={styles.metricGrid}>
          <Metric label="tempo até decisão" value={formatSeconds(metrics.timeToDecisionSec)} highlight />
          <Metric label="cards até decisão" value={metrics.adds > 0 ? String(metrics.cardsShown) : '—'} />
          <Metric label="taxa de pulo" value={`${Math.round(metrics.skipRate * 100)}%`} />
          <Metric label="taxa de salvo" value={`${Math.round(metrics.saveRate * 100)}%`} />
          <Metric label="lojas alcançadas" value={String(metrics.merchantsReached)} />
          <Metric label="concentração topo" value={`${Math.round(metrics.topMerchantShare * 100)}%`} />
          <Metric label="interrupções" value={`${metrics.triggersShown}/${lab.attentionCap}`} />
          <Metric label="gatilhos barrados" value={String(metrics.triggersSuppressed)} />
          <Metric label="cards cortados pelo teto" value={String(state.feed.cappedOut)} />
        </View>
        <Text style={styles.hint}>
          Concentração alta significa que o feed virou vitrine de uma loja só. Interrupções acima do teto indicam que o
          app está incomodando mais do que ajudando.
        </Text>
      </Card>

      <Card>
        <SectionLabel>Exposição por loja</SectionLabel>
        {merchantKeys.length === 0 ? (
          <Text style={styles.hint}>Nada foi exibido ainda. Volte ao feed e role alguns cards.</Text>
        ) : (
          <View style={styles.exposure}>
            {merchantKeys
              .sort((a, b) => (state.merchantImpressions[b] ?? 0) - (state.merchantImpressions[a] ?? 0))
              .slice(0, 8)
              .map((key) => (
                <View key={key} style={styles.exposureRow}>
                  <Text style={styles.exposureLabel} numberOfLines={1}>
                    {state.feed.items.find((item) => item.merchant.id === key)?.merchant.name ?? key}
                  </Text>
                  <View style={styles.exposureBar}>
                    <Bar
                      value={maxImpressions === 0 ? 0 : (state.merchantImpressions[key] ?? 0) / maxImpressions}
                      color={colors.success}
                      height={6}
                    />
                  </View>
                  <Text style={styles.exposureValue}>{state.merchantImpressions[key]}</Text>
                </View>
              ))}
          </View>
        )}
      </Card>

      <Card>
        <SectionLabel>Pesos do ranking</SectionLabel>
        <LabSlider
          label="Combina com você"
          value={lab.wRelevance}
          min={0}
          max={0.6}
          step={0.02}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => patch({ wRelevance: v })}
        />
        <LabSlider
          label="Margem do restaurante"
          value={lab.wMargin}
          min={0}
          max={0.6}
          step={0.02}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => patch({ wMargin: v })}
        />
        <LabSlider
          label="Novidade"
          value={lab.wNovelty}
          min={0}
          max={0.6}
          step={0.02}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => patch({ wNovelty: v })}
        />
        <LabSlider
          label="Proximidade"
          value={lab.wProximity}
          min={0}
          max={0.6}
          step={0.02}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => patch({ wProximity: v })}
        />
        <LabSlider
          label="Qualidade da loja"
          value={lab.wQuality}
          min={0}
          max={0.6}
          step={0.02}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => patch({ wQuality: v })}
        />
        <LabSlider
          label="Desejo agora (volume)"
          value={lab.wPopularity}
          min={0}
          max={0.6}
          step={0.02}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => patch({ wPopularity: v })}
        />
        <LabSlider
          label="Exploração (furar a bolha)"
          value={lab.exploration}
          min={0}
          max={0.6}
          step={0.02}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => patch({ exploration: v })}
        />
        <Text style={styles.hint}>
          Os pesos são normalizados, então o que importa é a proporção entre eles — não a soma.
        </Text>
      </Card>

      <Card>
        <SectionLabel>Restrições duras</SectionLabel>
        <LabSlider
          label="ETA máximo aceito"
          value={lab.maxEtaMin}
          min={15}
          max={70}
          step={5}
          format={(v) => `${v} min`}
          onChange={(v) => patch({ maxEtaMin: v })}
        />
        <LabSlider
          label="Raio de entrega"
          value={lab.maxDistanceKm}
          min={1}
          max={8}
          step={0.5}
          format={(v) => `${v} km`}
          onChange={(v) => patch({ maxDistanceKm: v })}
        />
        <LabSlider
          label="Máximo de cards por loja"
          value={lab.maxPerMerchant}
          min={1}
          max={4}
          step={1}
          format={(v) => `${v} card(s)`}
          onChange={(v) => patch({ maxPerMerchant: v })}
        />
      </Card>

      <Card>
        <SectionLabel>Orçamento de atenção</SectionLabel>
        <LabSlider
          label="Interrupções permitidas por dia"
          value={lab.attentionCap}
          min={0}
          max={8}
          step={1}
          format={(v) => `${v}`}
          onChange={(v) => patch({ attentionCap: v })}
        />
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Modo silencioso</Text>
            <Text style={styles.hint}>Nenhum gatilho pode aparecer, nem se a regra disparar.</Text>
          </View>
          <Switch
            value={lab.quietHours}
            onValueChange={(value) => patch({ quietHours: value })}
            trackColor={{ false: colors.border, true: colors.accentSoft }}
            thumbColor={lab.quietHours ? colors.accent : colors.textFaint}
          />
        </View>
        <View style={styles.budgetLine}>
          <Text style={styles.hint}>
            restante hoje: {Math.max(0, lab.attentionCap - metrics.triggersShown)} de {lab.attentionCap}
          </Text>
        </View>
      </Card>

      <Card>
        <SectionLabel>Presets</SectionLabel>
        <View style={styles.presetRow}>
          {PRESETS.map((preset) => (
            <Pressable
              key={preset.label}
              style={styles.preset}
              onPress={() => actions.setLab({ ...defaultLab, ...preset.config })}
            >
              <Text style={styles.presetText}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.actionRow}>
          <Button title="Gerar novo feed" onPress={() => actions.rebuild()} />
          <Button title="Resetar sessão" variant="outline" onPress={() => actions.resetSession()} />
        </View>
      </Card>

      <Card>
        <SectionLabel>Últimos eventos</SectionLabel>
        {recentEvents.length === 0 ? (
          <Text style={styles.hint}>Nenhum evento registrado nesta sessão.</Text>
        ) : (
          <View style={styles.log}>
            {recentEvents.map((event) => (
              <View key={event.id} style={styles.logRow}>
                <Text style={styles.logName}>{event.name}</Text>
                <Text style={styles.logMeta} numberOfLines={1}>
                  {event.dishId ? `${event.dishId} · ` : ''}
                  {event.meta ? JSON.stringify(event.meta) : ''}
                </Text>
                <Text style={styles.logTime}>
                  {new Date(event.at).toLocaleTimeString('pt-BR', { hour12: false })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, highlight && { color: colors.accent }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  head: { gap: spacing.sm },
  title: { color: colors.white, fontSize: font.h1, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: font.body, lineHeight: 22 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    width: '47%',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  metricValue: { color: colors.white, fontSize: font.h3, fontWeight: '800' },
  metricLabel: { color: colors.textFaint, fontSize: 10 },
  hint: { color: colors.textFaint, fontSize: font.micro, lineHeight: 16, marginTop: spacing.sm },
  exposure: { gap: spacing.sm },
  exposureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  exposureLabel: { color: colors.text, fontSize: font.micro, width: 130 },
  exposureBar: { flex: 1, flexDirection: 'row' },
  exposureValue: { color: colors.textMuted, fontSize: font.micro, width: 24, textAlign: 'right' },
  sliderBlock: { marginBottom: spacing.sm },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabel: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  sliderValue: { color: colors.accent, fontSize: font.small, fontWeight: '800' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  switchText: { flex: 1 },
  switchLabel: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  budgetLine: { marginTop: spacing.sm },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  preset: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  presetText: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  actionRow: { gap: spacing.sm },
  log: { gap: 6 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logName: { color: colors.accent, fontSize: font.micro, fontWeight: '800', width: 130 },
  logMeta: { color: colors.textMuted, fontSize: font.micro, flex: 1 },
  logTime: { color: colors.textFaint, fontSize: font.micro },
});
