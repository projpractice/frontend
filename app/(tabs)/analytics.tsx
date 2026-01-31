import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ApiError } from '@/components/common/api-error';
import { LoadingState } from '@/components/common/loading-state';
import { ChartsPanel } from '@/components/analytics/charts-panel';
import { KpiCards } from '@/components/analytics/kpi-cards';
import { DateRangeFilter } from '@/components/filters/date-range-filter';
import { Colors } from '@/constants/theme';
import { useHistorySeries, useSummary, MAX_HISTORY_DAYS } from '@/hooks/use-history';
import { dayjs } from '@/lib/dayjs';
import type { SourceType, SummaryFilters } from '@/types/history';

const sourceOptions: SourceType[] = ['image', 'video'];

function isSupportedSource(value?: string | null): value is SourceType {
  return typeof value === 'string' && sourceOptions.includes(value as SourceType);
}

export default function AnalyticsScreen() {
  const params = useLocalSearchParams<{ from?: string; to?: string; source?: string }>();
  const router = useRouter();

  const now = dayjs();
  const defaultFrom = params.from && typeof params.from === 'string' ? params.from : now.subtract(7, 'day').format('YYYY-MM-DD');
  const defaultTo = params.to && typeof params.to === 'string' ? params.to : now.format('YYYY-MM-DD');
  const sourceParam = typeof params.source === 'string' ? params.source : undefined;
  const defaultSource = isSupportedSource(sourceParam) ? sourceParam : 'image';

  const [draft, setDraft] = useState<SummaryFilters>({ from: defaultFrom, to: defaultTo, source_type: defaultSource });
  const [filters, setFilters] = useState<SummaryFilters>({ from: defaultFrom, to: defaultTo, source_type: defaultSource });

  const summaryQuery = useSummary(filters);
  const seriesQuery = useHistorySeries(filters);

  const handleApply = () => {
    const diffDays = dayjs(draft.to).diff(dayjs(draft.from), 'day');
    if (diffDays > MAX_HISTORY_DAYS) {
      Alert.alert('Слишком большой диапазон', `Выберите не больше ${MAX_HISTORY_DAYS} дней.`);
      return;
    }
    setFilters(draft);
    router.replace({ pathname: '/(tabs)/analytics', params: { from: draft.from, to: draft.to, source: draft.source_type } });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Фильтры</Text>
        <DateRangeFilter
          value={{ from: draft.from, to: draft.to }}
          onChange={range => setDraft(prev => ({ ...prev, from: range.from, to: range.to }))}
        />
        <View style={styles.sourcesRow}>
          {sourceOptions.map(option => {
            const isActive = draft.source_type === option;
            return (
              <Pressable
                key={option}
                onPress={() => setDraft(prev => ({ ...prev, source_type: option }))}
                style={[styles.sourceChip, isActive && styles.sourceChipActive]}>
                <Text style={[styles.sourceChipText, isActive && styles.sourceChipTextActive]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.applied}>
          Период: {dayjs(draft.from).format('DD.MM.YYYY')} — {dayjs(draft.to).format('DD.MM.YYYY')}
        </Text>
        <View style={styles.actions}>
          <Text style={styles.applyBtn} onPress={handleApply}>
            Применить
          </Text>
        </View>
      </View>

{summaryQuery.isLoading ? <LoadingState label="Загружаем KPI…" /> : null}

{summaryQuery.error ? (
  <ApiError message={summaryQuery.error.message} onRetry={summaryQuery.refetch} />
) : null}

{summaryQuery.data ? <KpiCards summary={summaryQuery.data} /> : null}


      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Графики</Text>
        {seriesQuery.isLoading ? <LoadingState label="Готовим данные…" /> : null}
        {seriesQuery.error ? (
          <ApiError message={seriesQuery.error.message} onRetry={seriesQuery.refetch} />
        ) : null}
        {seriesQuery.data ? (
          <ChartsPanel data={seriesQuery.data.data} truncated={seriesQuery.data.truncated} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    padding: 20,
    backgroundColor: '#fff',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  sourcesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sourceChip: {
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sourceChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  sourceChipText: {
    color: '#0F172A',
    textTransform: 'capitalize',
  },
  sourceChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  applied: {
    fontSize: 12,
    color: '#64748B',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  applyBtn: {
    backgroundColor: '#0F172A',
    color: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
});
