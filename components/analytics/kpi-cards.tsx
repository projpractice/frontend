import { StyleSheet, Text, View } from 'react-native';

import type { SummaryResponse } from '@/types/history';

type KpiCardsProps = {
  summary?: SummaryResponse | null;
};

export function KpiCards({ summary }: KpiCardsProps) {
  const cards = buildCards(summary);
  return (
    <View style={styles.grid}>
      {cards.map(card => (
        <View key={card.label} style={styles.card}>
          <Text style={styles.label}>{card.label}</Text>
          <Text style={styles.value}>{card.value}</Text>
          {card.subLabel ? <Text style={styles.subLabel}>{card.subLabel}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function buildCards(summary?: SummaryResponse | null) {
  if (!summary) {
    return placeholderCards;
  }
  return [
    {
      label: 'Всего запросов',
      value: summary.requests_total.toLocaleString('ru-RU'),
      subLabel: `Успешно: ${summary.requests_ok.toLocaleString('ru-RU')} · Ошибок: ${summary.requests_error.toLocaleString('ru-RU')}`,
    },
    {
      label: 'Всего собак',
      value: summary.dogs_total.toLocaleString('ru-RU'),
    },
    {
      label: 'Собаки без намордника',
      value: summary.dogs_nomuzzle.toLocaleString('ru-RU'),
      subLabel: `Доля нарушений: ${(summary.nomuzzle_rate * 100).toFixed(1)}%`,
    },
    {
      label: 'Средний инференс',
      value: `${Math.round(summary.avg_inference_ms)} мс`,
      subLabel: summary.p95_inference_ms
        ? `p95: ${Math.round(summary.p95_inference_ms)} мс`
        : undefined,
    },
  ];
}

const placeholderCards = [
  { label: 'Всего запросов', value: '—' },
  { label: 'Всего собак', value: '—' },
  { label: 'Собаки без намордника', value: '—' },
  { label: 'Средний инференс', value: '—' },
];

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    flexBasis: '48%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    padding: 16,
  },
  label: {
    fontSize: 12,
    color: '#475569',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 6,
  },
  subLabel: {
    marginTop: 4,
    color: '#475569',
  },
});
