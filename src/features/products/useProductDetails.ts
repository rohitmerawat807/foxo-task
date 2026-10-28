import { useEffect, useState } from 'react';

import { AppError, toAppError } from '@/utils/errorUtils';

import { fetchProductDetails } from './api';
import type { ProductDetails } from './types';

export type ProductDetailsState =
  | { status: 'loading' }
  | { status: 'success'; product: ProductDetails }
  | { status: 'error'; error: AppError };

export function useProductDetails(id: number) {
  const [state, setState] = useState<ProductDetailsState>({ status: 'loading' });
  // Bumping this re-runs the fetch.
  const [requestId, setRequestId] = useState(0);

  // A different product starts from scratch, without showing the previous one first.
  const [prevId, setPrevId] = useState(id);
  if (id !== prevId) {
    setPrevId(id);
    setState({ status: 'loading' });
  }

  useEffect(() => {
    const controller = new AbortController();

    fetchProductDetails(id, controller.signal)
      .then((product) => {
        if (controller.signal.aborted) return;
        setState({ status: 'success', product });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error: toAppError(error) });
      });

    // Leaving the screen (or switching product) cancels the request.
    return () => controller.abort();
  }, [id, requestId]);

  const retry = () => {
    setState({ status: 'loading' });
    setRequestId((value) => value + 1);
  };

  return { state, retry };
}
