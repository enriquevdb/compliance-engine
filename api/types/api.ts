/**
 * API-specific types
 */

export interface HealthCheckResponse {
  status: string;
  service: string;
  timestamp: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

export interface ApiRequest {
  transaction: unknown;
  context?: Record<string, unknown>;
}

