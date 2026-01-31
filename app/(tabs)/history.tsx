import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ApiError } from '@/components/common/api-error';
import { LoadingState } from '@/components/common/loading-state';
import { HistoryFiltersPanel } from '@/components/history/history-filters';
import { HistoryTable } from '@/components/history/history-table';
import { RequestDetailsModal } from '@/components/history/request-details-modal';
import { Colors } from '@/constants/theme';
import { useHistoryList } from '@/hooks/use-history';
import type { HistoryFilters, HistoryItem, SourceType } from '@/types/history';

const LIMIT_OPTIONS = [20, 50, 100];
const SUPPORTED_SOURCE_FILTERS: SourceType[] = ['image', 'video'];

const normalizeSourceFilter = (value?: string): HistoryFilters['source_type'] => {
  if (typeof value !== 'string') {
    return 'all';
  }
  return SUPPORTED_SOURCE_FILTERS.includes(value as SourceType) ? (value as SourceType) : 'all';
};

export default function HistoryScreen() {
  const params = useLocalSearchParams<{ from?: string; to?: string; status?: string; source?: string; limit?: string }>();
  const router = useRouter();

  const defaultLimit = LIMIT_OPTIONS.includes(Number(params.limit)) ? Number(params.limit) : 20;
  const sourceParam = typeof params.source === 'string' ? params.source : undefined;
  const defaultFilters: HistoryFilters = {
    from: typeof params.from === 'string' ? params.from : undefined,
    to: typeof params.to === 'string' ? params.to : undefined,
    status: (params.status as HistoryFilters['status']) ?? 'all',
    source_type: normalizeSourceFilter(sourceParam),
    limit: defaultLimit,
    offset: 0,
  };

  const [draftFilters, setDraftFilters] = useState<HistoryFilters>(defaultFilters);
  const [filters, setFilters] = useState<HistoryFilters>(defaultFilters);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const historyQuery = useHistoryList(filters);

  const pagination = useMemo(() => {
    const limit = filters.limit ?? 20;
    const total = historyQuery.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(totalPages, Math.floor((filters.offset ?? 0) / limit) + 1);
    return { totalPages, currentPage, limit };
  }, [filters.limit, filters.offset, historyQuery.data?.total]);

  const handleApply = () => {
    setFilters({ ...draftFilters, offset: 0 });
    router.replace({
      pathname: '/(tabs)/history',
      params: {
        from: draftFilters.from,
        to: draftFilters.to,
        status: draftFilters.status,
        source: draftFilters.source_type,
        limit: draftFilters.limit,
      },
    });
  };

  const handleReset = () => {
    setDraftFilters(defaultFilters);
    setFilters(defaultFilters);
    router.replace('/(tabs)/history');
  };

  const changePage = (direction: number) => {
    const limit = filters.limit ?? 20;
    const nextPage = pagination.currentPage + direction;
    if (nextPage < 1 || nextPage > pagination.totalPages) {
      return;
    }
    setFilters(prev => ({ ...prev, offset: (nextPage - 1) * limit }));
  };

  const handleSelect = (item: HistoryItem) => {
    setSelected(item);
    setDetailsVisible(true);
  };

  const closeDetails = () => {
    setDetailsVisible(false);
    setSelected(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <HistoryFiltersPanel
        filters={draftFilters}
        onChange={setDraftFilters}
        onApply={handleApply}
        onReset={handleReset}
        limitOptions={LIMIT_OPTIONS}
      />

      {historyQuery.isLoading ? <LoadingState label="Загружаем историю…" /> : null}
      {historyQuery.error ? (
        <ApiError message={historyQuery.error.message} onRetry={historyQuery.refetch} />
      ) : null}

      <HistoryTable items={historyQuery.data?.items ?? []} onSelect={handleSelect} />

      <View style={styles.pagination}>
        <Pressable
          style={[styles.pageButton, pagination.currentPage === 1 && styles.pageButtonDisabled]}
          onPress={() => changePage(-1)}
          disabled={pagination.currentPage === 1}>
          <Text style={styles.pageButtonText}>Назад</Text>
        </Pressable>
        <Text style={styles.pageInfo}>
          Страница {pagination.currentPage} из {pagination.totalPages}
        </Text>
        <Pressable
          style={[
            styles.pageButton,
            pagination.currentPage === pagination.totalPages && styles.pageButtonDisabled,
          ]}
          onPress={() => changePage(1)}
          disabled={pagination.currentPage === pagination.totalPages}>
          <Text style={styles.pageButtonText}>Вперёд</Text>
        </Pressable>
      </View>

      <RequestDetailsModal
        visible={detailsVisible}
        requestId={selected?.id}
        onClose={closeDetails}
      />
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
  pagination: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0F172A',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  pageInfo: {
    fontWeight: '600',
  },
});
