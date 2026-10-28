import { apiGet } from '@/services/apiClient';
import { reportError } from '@/services/errorReporter';
import { AppError } from '@/utils/errorUtils';

import type { ProductSummary, ProductsPage, ProductsQuery } from './types';

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

const asText = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const asNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * Turns one raw product into what the list shows. Missing or malformed fields become
 * `undefined` instead of rejecting the product; only a product without an id is unusable.
 */
export function toProductSummary(value: unknown): ProductSummary | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const id = asNumber(raw.id);
  if (id === undefined) {
    return null;
  }

  const price = asNumber(raw.price);
  const rating = asNumber(raw.rating);
  const images = Array.isArray(raw.images) ? raw.images : [];

  return {
    id,
    title: asText(raw.title) ?? 'Untitled product',
    description: asText(raw.description),
    brand: asText(raw.brand),
    category: asText(raw.category),
    price: price !== undefined && price >= 0 ? price : undefined,
    rating: rating !== undefined && rating >= 0 && rating <= 5 ? rating : undefined,
    // The full-size `images` are much heavier; only fall back to them without a thumbnail.
    thumbnail: asText(raw.thumbnail) ?? asText(images[0]),
  };
}

export async function fetchProducts(
  { limit = DEFAULT_LIMIT, skip = 0, search = '' }: ProductsQuery = {},
  signal?: AbortSignal,
): Promise<ProductsPage> {
  // Search results page with `limit`/`skip` exactly like the full list.
  const data = search
    ? await apiGet<unknown>('/products/search', { query: { q: search, limit, skip }, signal })
    : await apiGet<unknown>('/products', { query: { limit, skip }, signal });

  if (!isProductsResponse(data)) {
    throw new AppError('parse', 'Unexpected products response shape');
  }

  const products = data.products.map(toProductSummary).filter((product) => product !== null);
  const droppedCount = data.products.length - products.length;
  if (droppedCount > 0) {
    reportError(new Error(`Dropped ${droppedCount} product(s) without an id`), { skip, limit });
  }
  if (products.length === 0 && droppedCount > 0) {
    throw new AppError('parse', 'No product in the response had an id');
  }

  return { products, total: data.total, nextSkip: skip + data.products.length };
}
