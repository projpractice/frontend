import { useQuery } from '@tanstack/react-query';

import {
  MAX_HISTORY_DAYS,
  MAX_HISTORY_RECORDS_FOR_CHARTS,
  aggregateHistoryByDay,
  fetchHistory,
  fetchHistoryForCharts,
  fetchRequestDetails,
  fetchSummary,
} from '@/lib/history';
import type {
  DailyMetrics,
  HistoryFilters,
  HistoryResponse,
  RequestDetails,
  SummaryFilters,
  SummaryResponse,
} from '@/types/history';

export const historyKeys = {
  base: ['history'] as const,
  list: (params: HistoryFilters) => [...historyKeys.base, params] as const,
  detail: (id: string, includeRaw: boolean) => [...historyKeys.base, id, includeRaw] as const,
  charts: (params: SummaryFilters) => [...historyKeys.base, 'charts', params] as const,
};

export const summaryKeys = {
  summary: (params: SummaryFilters) => ['summary', params] as const,
};

export function useHistoryList(params: HistoryFilters) {
  return useQuery<HistoryResponse>({
    queryKey: historyKeys.list(params),
    queryFn: () => fetchHistory(params),
    staleTime: 60_000,
    keepPreviousData: true,
  });
}

export function useRequestDetails(requestId?: string, includeRaw?: boolean) {
  return useQuery<RequestDetails>({
    queryKey: requestId ? historyKeys.detail(requestId, Boolean(includeRaw)) : ['history', 'detail'],
    queryFn: () => {
      if (!requestId) {
        throw new Error('requestId is required');
      }
      return fetchRequestDetails(requestId, includeRaw);
    },
    enabled: Boolean(requestId),
    staleTime: 60_000,
  });
}

export function useSummary(filters: SummaryFilters) {
  return useQuery<SummaryResponse>({
    queryKey: summaryKeys.summary(filters),
    queryFn: () => fetchSummary(filters),
    staleTime: 60_000,
  });
}

export function useHistorySeries(filters: SummaryFilters) {
  return useQuery<{ data: DailyMetrics[]; truncated: boolean }>({
    queryKey: historyKeys.charts(filters),
    queryFn: async () => {
      const { items, truncated } = await fetchHistoryForCharts(filters);
      return {
        data: aggregateHistoryByDay(items),
        truncated,
      };
    },
    enabled: Boolean(filters.from && filters.to),
    staleTime: 60_000,
  });
}

export { MAX_HISTORY_DAYS, MAX_HISTORY_RECORDS_FOR_CHARTS };
