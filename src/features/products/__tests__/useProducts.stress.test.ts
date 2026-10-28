import { act, renderHook, waitFor } from '@testing-library/react-native';

import { installFakeProductsServer } from '@/test-utils/fakeProductsServer';
import {
  loadEverything,
  randomLatency,
  range,
  sleep,
  successState,
  waitForSettled,
} from '@/test-utils/productsHookHelpers';

import { useProducts } from '../useProducts';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}));
jest.mock('@/services/errorReporter', () => ({ reportError: jest.fn() }));

jest.setTimeout(60_000);

describe('useProducts under stress', () => {
  it('paginates through 2,000 products with no duplicates or gaps', async () => {
    const { stats } = installFakeProductsServer({ total: 2000, latencyMs: randomLatency(5) });
    const { result } = await renderHook(() => useProducts());

    const state = await loadEverything(result);

    expect(state.products.map((p) => p.id)).toEqual(range(1, 2000));
    expect(stats.requests).toBe(100);
    expect(stats.maxInFlight).toBe(1);
  });

  it('sends one request for 100 rapid onEndReached calls', async () => {
    const { stats } = installFakeProductsServer({ total: 200, latencyMs: () => 20 });
    const { result } = await renderHook(() => useProducts());
    await waitForSettled(result);

    await act(async () => {
      for (let i = 0; i < 100; i++) result.current.loadMore();
    });
    await waitForSettled(result);

    expect(stats.requests).toBe(2);
    expect(successState(result).products).toHaveLength(40);
  });

  it('loads everything over a network that drops 30% of requests', async () => {
    const { stats } = installFakeProductsServer({
      total: 500,
      failRate: 0.3,
      latencyMs: randomLatency(5),
      seed: 42,
    });
    const { result } = await renderHook(() => useProducts());

    const state = await loadEverything(result);

    expect(stats.failures).toBeGreaterThan(5);
    expect(state.products.map((p) => p.id)).toEqual(range(1, 500));
  });

  it('settles on one consistent state after 50 rapid retries', async () => {
    const { stats } = installFakeProductsServer({ total: 100, latencyMs: randomLatency(30) });
    const { result } = await renderHook(() => useProducts());

    await act(async () => {
      for (let i = 0; i < 50; i++) result.current.retry();
    });
    await waitForSettled(result);

    expect(successState(result).products.map((p) => p.id)).toEqual(range(1, 20));
    // Every superseded request was cancelled, not left running.
    expect(stats.aborted).toBe(stats.requests - 1);
  });

  it('ignores a first-page response that lands after a retry', async () => {
    // Request 0 is slow and still "arrives" after being cancelled; request 1 is fast.
    installFakeProductsServer({
      total: 100,
      latencyMs: (i) => (i === 0 ? 100 : 5),
      ignoreAbort: true,
    });
    const { result } = await renderHook(() => useProducts());

    await act(async () => result.current.retry());
    await waitForSettled(result);
    await act(() => sleep(150)); // let the stale response land

    expect(successState(result).products[0].title).toContain('request 1');
  });

  it('ignores a next-page response that lands after a retry', async () => {
    // Request 0: first page. Request 1: slow next page, cancelled by the retry. Request 2: retry.
    installFakeProductsServer({
      total: 100,
      latencyMs: (i) => (i === 1 ? 100 : 5),
      ignoreAbort: true,
    });
    const { result } = await renderHook(() => useProducts());
    await waitForSettled(result);

    await act(async () => result.current.loadMore());
    await act(async () => result.current.retry());
    await waitForSettled(result);
    await act(() => sleep(150));

    const state = successState(result);
    expect(state.products.map((p) => p.id)).toEqual(range(1, 20));
    expect(state.nextSkip).toBe(20);
  });

  it('cancels the request when the screen unmounts mid-load', async () => {
    const { stats } = installFakeProductsServer({ total: 100, latencyMs: () => 50 });
    const { unmount } = await renderHook(() => useProducts());

    await unmount();
    await act(() => sleep(80));

    expect(stats.aborted).toBe(1);
  });

  it('keeps corrupted products, with fallbacks, without breaking pagination', async () => {
    const { stats } = installFakeProductsServer({
      total: 1000,
      corruptRate: 0.2,
      latencyMs: randomLatency(3),
      seed: 7,
    });
    const { result } = await renderHook(() => useProducts());

    const state = await loadEverything(result);

    expect(stats.corrupted).toBeGreaterThan(100);
    expect(state.products.map((p) => p.id)).toEqual(range(1, 1000));
    for (const product of state.products) {
      expect(product.title).not.toBe('');
    }
    expect(state.nextSkip).toBe(1000);
  });

  it('reports a timeout when the server never answers', async () => {
    jest.useFakeTimers();
    installFakeProductsServer({ total: 100, latencyMs: () => Infinity });
    const { result } = await renderHook(() => useProducts());

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    const { state } = result.current;
    expect(state.status === 'error' && state.error.kind).toBe('timeout');
    jest.useRealTimers();
  });
});
