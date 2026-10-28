import { apiGet } from '@/services/apiClient';
import { reportError } from '@/services/errorReporter';
import { AppError } from '@/utils/errorUtils';

import type { Product, ProductsPage, ProductsQuery } from './types';

const DEFAULT_LIMIT = 20;

type RawProductsResponse = {
  products: unknown[];
  total: number;
};

function isProductsResponse(data: unknown): data is RawProductsResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as RawProductsResponse).products) &&
    typeof (data as RawProductsResponse).total === 'number'
  );
}

/** Checks the fields the UI relies on; a product missing any of them can't be shown. */
function isDisplayableProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const product = value as Record<string, unknown>;
  return (
    typeof product.id === 'number' &&
    typeof product.title === 'string' &&
    typeof product.category === 'string' &&
    typeof product.price === 'number' &&
    typeof product.rating === 'number' &&
    typeof product.thumbnail === 'string'
  );
}

export async function fetchProducts(
  { limit = DEFAULT_LIMIT, skip = 0 }: ProductsQuery = {},
  signal?: AbortSignal,
): Promise<ProductsPage> {
  const data = await apiGet<unknown>('/products', { query: { limit, skip }, signal });

  if (!isProductsResponse(data)) {
    throw new AppError('parse', 'Unexpected products response shape');
  }

  // Skip incomplete products instead of failing the whole page.
  const products = data.products.filter(isDisplayableProduct);
  const droppedCount = data.products.length - products.length;
  if (droppedCount > 0) {
    reportError(new Error(`Dropped ${droppedCount} invalid product(s)`), { skip, limit });
  }
  if (products.length === 0 && droppedCount > 0) {
    throw new AppError('parse', 'Every product in the response was invalid');
  }

  return { products, total: data.total, nextSkip: skip + data.products.length };
}
