const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const fallbackBase = rawApiUrl && rawApiUrl.length > 0 ? rawApiUrl : 'http://localhost:8000';
const ensuredProtocol = /^https?:\/\//i.test(fallbackBase) ? fallbackBase : `http://${fallbackBase}`;

export const API_BASE_URL = ensuredProtocol.replace(/\/$/, '');

export const USE_MOCK_RESPONSES = (process.env.EXPO_PUBLIC_USE_MOCK ?? '').toLowerCase() === 'true';

export const DETECT_IMAGE_ENDPOINT = `${API_BASE_URL}/detect/image`;
export const DETECT_VIDEO_ENDPOINT = `${API_BASE_URL}/detect/video`;
export const STREAM_WS_ENDPOINT = buildWsEndpoint(API_BASE_URL, '/ws/stream');

export const API_ANALYTICS_BASE_URL = `${API_BASE_URL}/api/v1`;
export const HISTORY_ENDPOINT = `${API_ANALYTICS_BASE_URL}/history`;
export const STATS_SUMMARY_ENDPOINT = `${API_ANALYTICS_BASE_URL}/stats/summary`;

function buildWsEndpoint(baseUrl: string, path: string) {
  try {
    const url = new URL(baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const sanitizedPath = url.pathname.replace(/\/$/, '');
    url.pathname = `${sanitizedPath}${path}`;
    return url.toString();
  } catch {
    const sanitizedBase = baseUrl.replace(/\/$/, '').replace(/^https?:\/\//, '');
    return `ws://${sanitizedBase}${path}`;
  }
}
