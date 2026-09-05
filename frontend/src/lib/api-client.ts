const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type HealthResponse = { status: string; service: string; version: string };
export const getHealth = () => apiRequest<HealthResponse>("/health");

export type FingerprintResponse = {
  symbol: string;
  timestamp: string;
  features: Record<string, number>;
  vector: number[];
  data_source: string;
  is_demo_data: boolean;
  is_stale: boolean;
  delay_seconds: number;
  persisted: boolean;
  persistence_warning?: string | null;
  metadata: Record<string, string | string[]>;
};

export const getFingerprint = (symbol: string) => apiRequest<FingerprintResponse>(`/api/fingerprint/${encodeURIComponent(symbol)}`);

export type SimilarHistoricalMatch = {
  event_date: string;
  similarity: number;
  matching_features: string[];
  future_return_1d: number;
  future_return_3d: number;
  future_return_5d: number;
  source: string;
  is_demo_data: boolean;
};

export type MarketMemoryResponse = {
  symbol: string;
  current_features: Record<string, number>;
  current_vector: number[];
  matches: SimilarHistoricalMatch[];
  outcomes: Record<string, { median_return: number; mean_return: number; positive_frequency: number; sample_size: number }>;
  data_source: string;
  is_demo_data: boolean;
  methodology: Record<string, string | number>;
};

export const getMarketMemory = (symbol: string) => apiRequest<MarketMemoryResponse>(`/api/market-memory/${encodeURIComponent(symbol)}`);

export type Relationship = {
  related_symbol: string;
  correlation: number;
  historical_correlation: number;
  correlation_change: number;
  similarity: number;
  relationship_type: string;
  confidence: number;
  explanation: string;
  is_significant: boolean;
  is_demo_data: boolean;
  is_stale: boolean;
  data_source: string;
};

export type RelationshipGraphResponse = {
  symbol: string;
  relationships: Relationship[];
  is_demo_data: boolean;
  data_source: string;
};

export const getRelationships = (symbol: string) => apiRequest<RelationshipGraphResponse>(`/api/relationships/${encodeURIComponent(symbol)}`);

export type MeaningfulChange = {
  symbol: string;
  change_type: string;
  score: number;
  confidence: number;
  explanation: string;
  signals: Record<string, unknown>;
  detected_at: string;
};

export type VisitStatusResponse = {
  watchlist_id: string;
  has_baseline: boolean;
  last_checked_at: string | null;
  meaningful_changes: MeaningfulChange[];
};

export type CheckInResponse = VisitStatusResponse & {
  visit_id: string;
  first_visit: boolean;
  baseline_set: boolean;
  previous_checked_at: string | null;
  current_checked_at: string;
  unchanged_symbols: string[];
};

export function authenticatedApiRequest<T>(path: string, accessToken: string, init?: RequestInit) {
  return apiRequest<T>(path, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...init?.headers },
  });
}

export const getLatestVisit = (watchlistId: string, accessToken: string) => authenticatedApiRequest<VisitStatusResponse>(`/api/visits/latest/${encodeURIComponent(watchlistId)}`, accessToken);
export const checkInWatchlist = (watchlistId: string, accessToken: string) => authenticatedApiRequest<CheckInResponse>("/api/visits/check-in", accessToken, { method: "POST", body: JSON.stringify({ watchlist_id: watchlistId }) });
