import { getNetworkStateAsync } from 'expo-network';

import { fetchWithSimulation } from '@/services/errorSimulator';
import { AppError } from '@/utils/errorUtils';

const BASE_URL = 'https://dummyjson.com';
const DEFAULT_TIMEOUT_MS = 10_000;

type QueryParams = Record<string, string | number | boolean | undefined>;

export type RequestOptions = {
  query?: QueryParams;
  signal?: AbortSignal;
  timeoutMs?: number;
};

// Built by hand: React Native's URL polyfill doesn't fully implement `searchParams`.
function buildUrl(path: string, query?: QueryParams): string {
  const queryString = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `${BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;
}

/** Tells "no connection on the device" apart from "server unreachable". */
async function isDeviceOffline(): Promise<boolean> {
  try {
    const { isConnected, isInternetReachable } = await getNetworkStateAsync();
    return isConnected === false || isInternetReachable === false;
  } catch {
    return false;
  }
}

/**
 * Performs a GET request and resolves with the parsed JSON body.
 * Every failure is rejected as an `AppError` with a `kind` describing what went wrong.
 */
export async function apiGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  // Own controller so both the caller's signal and our timeout can abort the request.
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller);

  try {
    let response: Response;
    try {
      response = await fetchWithSimulation(buildUrl(path, query), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) {
        throw new AppError('timeout', `Request timed out after ${timeoutMs}ms`, { cause: error });
      }
      if (controller.signal.aborted) {
        throw new AppError('cancelled', 'Request was cancelled', { cause: error });
      }
      if (await isDeviceOffline()) {
        throw new AppError('offline', 'Device is offline', { cause: error });
      }
      throw new AppError('network', 'Network request failed', { cause: error });
    }

    if (!response.ok) {
      throw new AppError('http', `Request failed with status ${response.status}`, {
        status: response.status,
      });
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new AppError('parse', 'Response body is not valid JSON', { cause: error });
    }
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}
