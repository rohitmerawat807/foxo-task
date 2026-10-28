import { apiGet } from '@/services/apiClient';
import { AppError } from '@/utils/errorUtils';

import type { ProductsQuery, ProductsResponse } from './types';

const DEFAULT_LIMIT = 100;

function isProductsResponse(data: unknown): data is ProductsResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as ProductsResponse).products) &&
    typeof (data as ProductsResponse).total === 'number'
  );
}

export async function fetchProducts(
  { limit = DEFAULT_LIMIT, skip = 0 }: ProductsQuery = {},
  signal?: AbortSignal,
): Promise<ProductsResponse> {
  const data = await apiGet<unknown>('/products', { query: { limit, skip }, signal });

  if (!isProductsResponse(data)) {
    throw new AppError('parse', 'Unexpected products response shape');
  }
  return data;
}
