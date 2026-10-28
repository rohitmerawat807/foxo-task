import { apiGet } from '@/services/apiClient';
import { reportError } from '@/services/errorReporter';
import { AppError } from '@/utils/errorUtils';

import type {
  ProductDetails,
  ProductReviewSummary,
  ProductSummary,
  ProductsPage,
  ProductsQuery,
} from './types';

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

const asNonNegative = (value: unknown) => {
  const number = asNumber(value);
  return number !== undefined && number >= 0 ? number : undefined;
};

const asTextList = (value: unknown) =>
  Array.isArray(value) ? value.map(asText).filter((item) => item !== undefined) : [];

const asObject = (value: unknown) =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

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

function toReview(value: unknown): ProductReviewSummary | null {
  const raw = asObject(value);
  if (!raw) return null;
  const rating = asNumber(raw.rating);
  const review = {
    rating: rating !== undefined && rating >= 0 && rating <= 5 ? rating : undefined,
    comment: asText(raw.comment),
    reviewerName: asText(raw.reviewerName),
    date: asText(raw.date),
  };
  // A review with nothing to show is noise.
  return review.comment || review.rating !== undefined ? review : null;
}

/** Turns a raw product into what the details screen shows; `null` if it has no id. */
export function toProductDetails(value: unknown): ProductDetails | null {
  const summary = toProductSummary(value);
  if (!summary) return null;
  const raw = value as Record<string, unknown>;

  const dimensions = asObject(raw.dimensions);
  const width = asNonNegative(dimensions?.width);
  const height = asNonNegative(dimensions?.height);
  const depth = asNonNegative(dimensions?.depth);
  const discount = asNumber(raw.discountPercentage);

  return {
    ...summary,
    discountPercentage:
      discount !== undefined && discount > 0 && discount < 100 ? discount : undefined,
    stock: asNonNegative(raw.stock),
    availabilityStatus: asText(raw.availabilityStatus),
    tags: asTextList(raw.tags),
    images: asTextList(raw.images),
    sku: asText(raw.sku),
    weight: asNonNegative(raw.weight),
    dimensions:
      width !== undefined && height !== undefined && depth !== undefined
        ? { width, height, depth }
        : undefined,
    warrantyInformation: asText(raw.warrantyInformation),
    shippingInformation: asText(raw.shippingInformation),
    returnPolicy: asText(raw.returnPolicy),
    minimumOrderQuantity: asNonNegative(raw.minimumOrderQuantity),
    reviews: (Array.isArray(raw.reviews) ? raw.reviews : [])
      .map(toReview)
      .filter((review) => review !== null),
  };
}

export async function fetchProductDetails(
  id: number,
  signal?: AbortSignal,
): Promise<ProductDetails> {
  const data = await apiGet<unknown>(`/products/${id}`, { signal });
  const product = toProductDetails(data);
  if (!product) {
    throw new AppError('parse', 'Product response has no id');
  }
  return product;
}

/** Product ids are positive integers; anything else in a link is rejected without a request. */
export function parseProductId(param: string | string[] | undefined): number | null {
  const value = Array.isArray(param) ? param[0] : param;
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
