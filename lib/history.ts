import { HISTORY_ENDPOINT, STATS_SUMMARY_ENDPOINT } from '@/constants/config';
import { dayjs } from '@/lib/dayjs';
import type {
  DailyMetrics,
  HistoryFilters,
  HistoryItem,
  HistoryResponse,
  RequestDetails,
  SummaryFilters,
  SummaryResponse,
  SummaryApiResponse
  
} from '@/types/history';

const JSON_HEADERS: Record<string, string> = {
  Accept: 'application/json',
};

export const MAX_HISTORY_DAYS = 31;
export const MAX_HISTORY_RECORDS_FOR_CHARTS = 5000;
const HISTORY_BATCH_SIZE = 100;

export async function fetchHistory(params: HistoryFilters): Promise<HistoryResponse> {
  const query = buildQuery(params);
  const response = await fetch(`${HISTORY_ENDPOINT}?${query}`, {
    headers: JSON_HEADERS,
  });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить историю (${response.status}).`);
  }
  const payload = (await response.json()) as HistoryResponse;
  return payload;
}

export async function fetchRequestDetails(
  requestId: string,
  includeRaw?: boolean
): Promise<RequestDetails> {
  const query = includeRaw ? '?include_raw=true' : '';
  const response = await fetch(`${HISTORY_ENDPOINT}/${requestId}${query}`, {
    headers: JSON_HEADERS,
  });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить детали (${response.status}).`);
  }
  const payload = (await response.json()) as RequestDetails;
  return payload;
}

export async function fetchSummary(filters: SummaryFilters): Promise<SummaryResponse> {
  const query = buildQuery(filters);
  const response = await fetch(`${STATS_SUMMARY_ENDPOINT}?${query}`, {
    headers: JSON_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`Не удалось загрузить статистику (${response.status}).`);
  }

  const api = (await response.json()) as SummaryApiResponse;

  return {
    requests_total: api.requests.total,
    requests_ok: api.requests.success,
    requests_error: api.requests.error,

    dogs_total: api.dogs.total,
    dogs_nomuzzle: api.dogs.nomuzzle,
    nomuzzle_rate: api.dogs.nomuzzle_rate,

    avg_inference_ms: api.performance.inference_time_ms_avg ?? 0,
    p95_inference_ms: api.performance.inference_time_ms_p95 ?? undefined,
  };
}


export async function fetchHistoryForCharts(
  filters: SummaryFilters,
  maxRecords: number = MAX_HISTORY_RECORDS_FOR_CHARTS
): Promise<{ items: HistoryItem[]; truncated: boolean }> {
  const items: HistoryItem[] = [];
  let offset = 0;
  let truncated = false;

  while (items.length < maxRecords) {
    const response = await fetchHistory({
      ...filters,
      limit: HISTORY_BATCH_SIZE,
      offset,
    });
    items.push(...response.items);
    if (response.items.length < HISTORY_BATCH_SIZE) {
      break;
    }
    offset += HISTORY_BATCH_SIZE;
  }

  if (items.length >= maxRecords) {
    truncated = true;
  }

  return { items: items.slice(0, maxRecords), truncated };
}

export function aggregateHistoryByDay(items: HistoryItem[]): DailyMetrics[] {
  const buckets = new Map<string, DailyMetrics>();

  items.forEach(item => {
    const day = dayjs(item.created_at).utc().format('YYYY-MM-DD');
    const current = buckets.get(day) ?? {
      date: day,
      requests: 0,
      dogs_total: 0,
      dogs_nomuzzle: 0,
      avg_inference_ms: 0,
    };
    const totalRequests = current.requests + 1;
    const cumulativeInference =
      current.avg_inference_ms * current.requests + (item.inference_time_ms ?? 0);

    current.requests = totalRequests;
    current.dogs_total += item.dogs_total ?? 0;
    current.dogs_nomuzzle += item.dogs_nomuzzle ?? 0;
    current.avg_inference_ms = totalRequests > 0 ? cumulativeInference / totalRequests : 0;

    buckets.set(day, current);
  });

  return Array.from(buckets.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

function buildQuery(params: Record<string, unknown> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return;
    }
    search.set(key, String(value));
  });
  return search.toString();
}
