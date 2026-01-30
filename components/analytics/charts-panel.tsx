import { lazy, Suspense } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import type { DailyMetrics } from '@/types/history';

const ChartsWeb = lazy(() => import('./charts-web'));

export type ChartsPanelProps = {
  data: DailyMetrics[];
  truncated?: boolean;
};

export function ChartsPanel({ data, truncated }: ChartsPanelProps) {
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Графики доступны в веб-версии</Text>
        <Text style={styles.fallbackText}>
          Expo Web использует Recharts, поэтому на мобильных графики пока не отображаются.
        </Text>
      </View>
    );
  }

  return (
    <Suspense fallback={<Text>Загружаем графики…</Text>}>
      <ChartsWeb data={data} truncated={truncated} />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  fallback: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    backgroundColor: '#fff',
    gap: 6,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  fallbackText: {
    color: '#475569',
  },
});
