import { act, renderHook } from '@testing-library/react-native';

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

/** Ids the fake server returns for a search (titles are "Product <id>"). */
const matching = (search: string, total: number) =>
  range(1, total).filter((id) => `Product ${id}`.includes(search));

const renderProducts = (search = '') =>
  renderHook(({ search: term }: { search: string }) => useProducts(term), {
    initialProps: { search },
  });

describe('useProducts search', () => {
  it('paginates search results to the end', async () => {
    installFakeProductsServer({ total: 2000, latencyMs: randomLatency(3) });
    const { result } = await renderProducts('1');

    const state = await loadEverything(result);

    const expected = matching('1', 2000);
    expect(expected.length).toBeGreaterThan(1000); // many pages
    expect(state.products.map((p) => p.id)).toEqual(expected);
    expect(state.total).toBe(expected.length);
  });

  it('shows loading right away for a new search, never the old results', async () => {
    installFakeProductsServer({ total: 100, latencyMs: () => 20 });
    const { result, rerender } = await renderProducts('');
    await waitForSettled(result);

    await rerender({ search: '7' });

    expect(result.current.state.status).toBe('loading');
    await waitForSettled(result);
    expect(successState(result).products.map((p) => p.id)).toEqual(matching('7', 100));
  });

  it("drops the previous search's in-flight next page", async () => {
    // Request 1 (next page of the unfiltered list) is slow and still "arrives" after cancel.
    installFakeProductsServer({
      total: 200,
      latencyMs: (i) => (i === 1 ? 100 : 5),
      ignoreAbort: true,
    });
    const { result, rerender } = await renderProducts('');
    await waitForSettled(result);

    await act(async () => result.current.loadMore());
    await rerender({ search: '5' });
    await waitForSettled(result);
    await act(() => sleep(150));

    const state = successState(result);
    expect(state.products.map((p) => p.id)).toEqual(matching('5', 200).slice(0, 20));
    expect(state.nextSkip).toBe(20);
  });

  it('settles on the last of many rapid search changes', async () => {
    // Fixed latency: every request is still in flight when the next search replaces it.
    const { stats } = installFakeProductsServer({ total: 500, latencyMs: () => 50 });
    const { result, rerender } = await renderProducts('');

    for (const search of ['1', '12', '123', '12', '2', '23', '']) {
      await rerender({ search });
    }
    await rerender({ search: '4' });
    await waitForSettled(result);

    expect(successState(result).products.map((p) => p.id)).toEqual(matching('4', 500).slice(0, 20));
    expect(stats.aborted).toBe(stats.requests - 1);
  });

  it('shows the empty state when nothing matches', async () => {
    installFakeProductsServer({ total: 100 });
    const { result } = await renderProducts('no such product');
    await waitForSettled(result);

    expect(result.current.state.status).toBe('empty');
  });
});

describe('useProducts refresh', () => {
  it('keeps the list visible while refreshing, then restarts from page 1', async () => {
    installFakeProductsServer({ total: 200, latencyMs: () => 10 });
    const { result } = await renderProducts('');
    await waitForSettled(result);
    await act(async () => result.current.loadMore());
    await waitForSettled(result);
    expect(successState(result).products).toHaveLength(40);

    await act(async () => result.current.refresh());

    const refreshing = successState(result);
    expect(refreshing.refresh.status).toBe('refreshing');
    expect(refreshing.products).toHaveLength(40);

    await waitForSettled(result);
    await act(() => sleep(30));
    const refreshed = successState(result);
    expect(refreshed.refresh.status).toBe('idle');
    expect(refreshed.products.map((p) => p.id)).toEqual(range(1, 20));
    expect(refreshed.products[0].title).toContain('request 2');
    expect(refreshed.nextSkip).toBe(20);
  });

  it('drops an in-flight next page when refreshing', async () => {
    installFakeProductsServer({
      total: 200,
      latencyMs: (i) => (i === 1 ? 100 : 5),
      ignoreAbort: true,
    });
    const { result } = await renderProducts('');
    await waitForSettled(result);

    await act(async () => result.current.loadMore());
    await act(async () => result.current.refresh());
    await act(() => sleep(150));

    const state = successState(result);
    expect(state.products.map((p) => p.id)).toEqual(range(1, 20));
    expect(state.nextSkip).toBe(20);
  });

  it('does not load more while a refresh is in flight', async () => {
    const { stats } = installFakeProductsServer({
      total: 200,
      latencyMs: (i) => (i === 1 ? 50 : 5),
    });
    const { result } = await renderProducts('');
    await waitForSettled(result);

    await act(async () => result.current.refresh());
    await act(async () => result.current.loadMore());

    expect(stats.requests).toBe(2);
  });

  it('keeps the current list when a refresh fails', async () => {
    installFakeProductsServer({ total: 200, latencyMs: () => 5, shouldFail: (i) => i === 1 });
    const { result } = await renderProducts('');
    await waitForSettled(result);

    await act(async () => result.current.refresh());
    await act(() => sleep(30));

    const state = successState(result);
    expect(state.refresh.status).toBe('error');
    expect(state.products).toHaveLength(20);

    // Loading more still works after a failed refresh.
    await act(async () => result.current.loadMore());
    await waitForSettled(result);
    expect(successState(result).products).toHaveLength(40);
  });

  it('refreshes search results, not the whole catalogue', async () => {
    installFakeProductsServer({ total: 300, latencyMs: () => 5 });
    const { result } = await renderProducts('9');
    await waitForSettled(result);

    await act(async () => result.current.refresh());
    await act(() => sleep(30));

    expect(successState(result).products.map((p) => p.id)).toEqual(matching('9', 300).slice(0, 20));
  });
});
