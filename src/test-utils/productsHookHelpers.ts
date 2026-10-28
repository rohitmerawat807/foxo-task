import { act, waitFor } from '@testing-library/react-native';

import type { useProducts } from '@/features/products/useProducts';

/* Helpers for driving `useProducts` through `renderHook` in tests. */

export type HookResult = { current: ReturnType<typeof useProducts> };

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const randomLatency = (max: number) => () => Math.floor(Math.random() * max);

export function successState(result: HookResult) {
  const { state } = result.current;
  if (state.status !== 'success') {
    throw new Error(`Expected success, got ${state.status}`);
  }
  return state;
}

export async function waitForSettled(result: HookResult) {
  await waitFor(
    () => {
      const { state } = result.current;
      expect(state.status).not.toBe('loading');
      if (state.status === 'success') {
        expect(state.loadMore.status).not.toBe('loading');
      }
    },
    { interval: 5, timeout: 15_000 },
  );
}

/** Scrolls to the end, retrying whatever fails, like a persistent user would. */
export async function loadEverything(result: HookResult) {
  await waitForSettled(result);
  while (result.current.state.status === 'error') {
    await act(async () => result.current.retry());
    await waitForSettled(result);
  }
  for (let guard = 0; guard < 10_000; guard++) {
    const state = successState(result);
    if (state.loadMore.status === 'error') {
      await act(async () => result.current.retryLoadMore());
    } else if (state.nextSkip < state.total) {
      await act(async () => result.current.loadMore());
    } else {
      return state;
    }
    await waitForSettled(result);
  }
  throw new Error('Pagination did not finish');
}

export const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
