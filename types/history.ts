export type SourceType = 'image' | 'video' | 'stream' | 'webcam' | 'unknown';

export type RequestStatus = 'success' | 'error' | 'processing' | 'queued' | 'unknown';

export type HistoryItem = {
  id: string;
  created_at: string;
  source_type: SourceType;
  filename?: string | null;
  dogs_total: number;
  dogs_nomuzzle: number;
  nomuzzle_rate: number;
  inference_time_ms: number;
  status: RequestStatus;
};

export type HistoryResponse = {
  total: number;
  items: HistoryItem[];
};

export type HistoryFilters = {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
  status?: RequestStatus | 'all';
  source_type?: SourceType | 'all';
};

export type RequestDetails = HistoryItem & {
  request_id?: string;
  dogs_with_muzzle?: number;
  raw_result_json?: unknown;
  parameters?: Record<string, unknown>;
  media_type?: SourceType;
};

type SummaryApiResponse = {
  period: { from: string; to: string };
  requests: { total: number; success: number; error: number };
  dogs: { total: number; nomuzzle: number; muzzle: number; nomuzzle_rate: number };
  performance: {
    inference_time_ms_avg?: number | null;
    inference_time_ms_p95?: number | null;
  };
};


export type SummaryResponse = {
  requests_total: number;
  requests_ok: number;
  requests_error: number;
  dogs_total: number;
  dogs_nomuzzle: number;
  nomuzzle_rate: number;
  avg_inference_ms: number;
  p95_inference_ms?: number;
};

export type SummaryFilters = {
  from: string;
  to: string;
  source_type?: SourceType;
};

export type DailyMetrics = {
  date: string;
  requests: number;
  dogs_total: number;
  dogs_nomuzzle: number;
  avg_inference_ms: number;
};
