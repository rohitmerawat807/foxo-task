import { useEffect, useRef, useState } from 'react';

import { AppError, toAppError } from '@/utils/errorUtils';

import { fetchProducts } from './api';
import type { ProductSummary } from './types';

const PAGE_SIZE = 20;

export type LoadMoreState =
  { status: 'idle' } | { status: 'loading' } | { status: 'error'; error: AppError };

export type RefreshState =
  { status: 'idle' } | { status: 'refreshing' } | { status: 'error'; error: AppError };

export type ProductsState =
  | { status: 'loading' }
  | {
      status: 'success';
      products: ProductSummary[];
      total: number;
      nextSkip: number;
      loadMore: LoadMoreState;
      refresh: RefreshState;
    }
  | { status: 'empty' }
  | { status: 'error'; error: AppError };

/** Appends `incoming`, skipping ids already in the list (duplicates would break list keys). */
function appendUnique(existing: ProductSummary[], incoming: ProductSummary[]) {
  const seen = new Set(existing.map((product) => product.id));
  const result = [...existing];
  for (const product of incoming) {
    if (!seen.has(product.id)) {
      seen.add(product.id);
      result.push(product);
    }
  }
  return result;
}

/** Paginated products, optionally filtered by `search`. */
export function useProducts(search = '') {
  const [state, setState] = useState<ProductsState>({ status: 'loading' });
  // Bumping this re-runs the first-page fetch (retry and refresh).
  const [requestId, setRequestId] = useState(0);
  // The in-flight next-page request. Blocks duplicate `onEndReached` calls.
  const loadMoreRequest = useRef<AbortController | null>(null);

  // A new search starts from scratch. Updating state during render (instead of in the effect)
  // avoids briefly showing the previous search's results.
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setState({ status: 'loading' });
  }

  // First page: on mount, new search, retry and refresh.
  useEffect(() => {
    const controller = new AbortController();

    // Every handler checks `aborted`: a response that was already arriving when the request
    // was cancelled must not overwrite newer state.
    fetchProducts({ limit: PAGE_SIZE, skip: 0, search }, controller.signal)
      .then(({ products, total, nextSkip }) => {
        if (controller.signal.aborted) return;
        setState(
          products.length > 0
            ? {
                status: 'success',
                products: appendUnique([], products),
                total,
                nextSkip,
                loadMore: { status: 'idle' },
                refresh: { status: 'idle' },
              }
            : { status: 'empty' },
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // A failed refresh keeps the list that is already on screen.
        setState((prev) =>
          prev.status === 'success'
            ? { ...prev, refresh: { status: 'error', error: toAppError(error) } }
            : { status: 'error', error: toAppError(error) },
        );
      });

    return () => {
      controller.abort();
      // A next page of the old search/list must never be appended to the new one.
      loadMoreRequest.current?.abort();
      loadMoreRequest.current = null;
    };
  }, [search, requestId]);

  const fetchNextPage = () => {
    if (state.status !== 'success' || state.nextSkip >= state.total) return;
    if (state.refresh.status === 'refreshing' || loadMoreRequest.current) return;

    const controller = new AbortController();
    loadMoreRequest.current = controller;
    setState({ ...state, loadMore: { status: 'loading' } });

    fetchProducts({ limit: PAGE_SIZE, skip: state.nextSkip, search }, controller.signal)
      .then(({ products, total, nextSkip }) => {
        if (controller.signal.aborted) return;
        setState((prev) =>
          prev.status === 'success'
            ? {
                ...prev,
                products: appendUnique(prev.products, products),
                total,
                nextSkip,
                loadMore: { status: 'idle' },
              }
            : prev,
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((prev) =>
          prev.status === 'success'
            ? { ...prev, loadMore: { status: 'error', error: toAppError(error) } }
            : prev,
        );
      })
      .finally(() => {
        if (loadMoreRequest.current === controller) {
          loadMoreRequest.current = null;
        }
      });
  };

  /** For `onEndReached`. Pauses after a failure until the user taps retry. */
  const loadMore = () => {
    if (state.status === 'success' && state.loadMore.status !== 'error') {
      fetchNextPage();
    }
  };

  /** Pull-to-refresh: reloads page 1 while the current list stays visible. */
  const refresh = () => {
    if (state.status !== 'success') {
      retry();
      return;
    }
    setState({ ...state, loadMore: { status: 'idle' }, refresh: { status: 'refreshing' } });
    setRequestId((id) => id + 1);
  };

  /** Starts over from the first page, showing the full-screen loading state. */
  const retry = () => {
    setState({ status: 'loading' });
    setRequestId((id) => id + 1);
  };

  return { state, loadMore, retryLoadMore: fetchNextPage, refresh, retry };
}
