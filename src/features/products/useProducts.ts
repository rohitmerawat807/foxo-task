import { useEffect, useRef, useState } from 'react';

import { AppError, toAppError } from '@/utils/errorUtils';

import { fetchProducts } from './api';
import type { Product } from './types';

const PAGE_SIZE = 20;

export type LoadMoreState =
  { status: 'idle' } | { status: 'loading' } | { status: 'error'; error: AppError };

export type ProductsState =
  | { status: 'loading' }
  | { status: 'success'; products: Product[]; total: number; loadMore: LoadMoreState }
  | { status: 'empty' }
  | { status: 'error'; error: AppError };

export function useProducts() {
  const [state, setState] = useState<ProductsState>({ status: 'loading' });
  // Bumping this re-runs the first-page fetch.
  const [requestId, setRequestId] = useState(0);
  // The in-flight next-page request. Blocks duplicate `onEndReached` calls.
  const loadMoreRequest = useRef<AbortController | null>(null);

  // First page
  useEffect(() => {
    const controller = new AbortController();

    fetchProducts({ limit: PAGE_SIZE, skip: 0 }, controller.signal)
      .then(({ products, total }) => {
        setState(
          products.length > 0
            ? { status: 'success', products, total, loadMore: { status: 'idle' } }
            : { status: 'empty' },
        );
      })
      .catch((error: unknown) => {
        // Unmounted or replaced by a retry; nothing to show.
        if (!controller.signal.aborted) {
          setState({ status: 'error', error: toAppError(error) });
        }
      });

    return () => controller.abort();
  }, [requestId]);

  // Cancel a pending next-page request on unmount.
  useEffect(() => () => loadMoreRequest.current?.abort(), []);

  const fetchNextPage = () => {
    if (state.status !== 'success' || state.products.length >= state.total) return;
    if (loadMoreRequest.current) return;

    const controller = new AbortController();
    loadMoreRequest.current = controller;
    setState({ ...state, loadMore: { status: 'loading' } });

    fetchProducts({ limit: PAGE_SIZE, skip: state.products.length }, controller.signal)
      .then(({ products, total }) => {
        setState((prev) =>
          prev.status === 'success'
            ? {
                ...prev,
                products: [...prev.products, ...products],
                total,
                loadMore: { status: 'idle' },
              }
            : prev,
        );
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState((prev) =>
            prev.status === 'success'
              ? { ...prev, loadMore: { status: 'error', error: toAppError(error) } }
              : prev,
          );
        }
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

  /** Starts over from the first page. */
  const retry = () => {
    loadMoreRequest.current?.abort();
    loadMoreRequest.current = null;
    setState({ status: 'loading' });
    setRequestId((id) => id + 1);
  };

  return { state, loadMore, retryLoadMore: fetchNextPage, retry };
}
