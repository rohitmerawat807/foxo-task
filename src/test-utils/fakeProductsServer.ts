import type { Product } from '@/features/products/types';

/*
 * In-memory stand-in for DummyJSON's `GET /products?limit&skip`, installed as `global.fetch`.
 * Lets tests control latency, failures and data quality per request, deterministically.
 */

type FakeServerOptions = {
  total: number;
  /** Delay for the nth request (0-based). `Infinity` never responds. */
  latencyMs?: (requestIndex: number) => number;
  /** Chance (0–1) that a request fails like an unreachable host. */
  failRate?: number;
  /** Fails exactly the requests it returns true for; overrides `failRate`. */
  shouldFail?: (requestIndex: number) => boolean;
  /** Chance (0–1) that a product loses one of its required fields. */
  corruptRate?: number;
  /** Respond even after the request was aborted, as if the response was already in flight. */
  ignoreAbort?: boolean;
  seed?: number;
};

export type FakeServerStats = {
  requests: number;
  failures: number;
  aborted: number;
  corrupted: number;
  inFlight: number;
  maxInFlight: number;
};

const REQUIRED_FIELDS = ['title', 'price', 'thumbnail', 'category', 'rating'] as const;

/** Small seeded PRNG so "random" failures are the same on every run. */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeProduct(id: number, requestIndex = 0): Product {
  return {
    id,
    title: `Product ${id} (request ${requestIndex})`,
    description: '',
    category: 'test',
    price: id,
    discountPercentage: 0,
    rating: 4,
    stock: 1,
    tags: [],
    sku: `SKU-${id}`,
    weight: 1,
    dimensions: { width: 1, height: 1, depth: 1 },
    warrantyInformation: '',
    shippingInformation: '',
    availabilityStatus: 'In Stock',
    reviews: [],
    returnPolicy: '',
    minimumOrderQuantity: 1,
    meta: { createdAt: '', updatedAt: '', barcode: '', qrCode: '' },
    images: [],
    thumbnail: `https://example.com/${id}.png`,
  };
}

export function installFakeProductsServer(options: FakeServerOptions) {
  const {
    total,
    latencyMs = () => 0,
    failRate = 0,
    shouldFail,
    corruptRate = 0,
    ignoreAbort = false,
    seed = 1,
  } = options;
  const random = createRandom(seed);
  const stats: FakeServerStats = {
    requests: 0,
    failures: 0,
    aborted: 0,
    corrupted: 0,
    inFlight: 0,
    maxInFlight: 0,
  };

  const buildBody = (url: URL, requestIndex: number) => {
    const limit = Number(url.searchParams.get('limit'));
    const skip = Number(url.searchParams.get('skip'));
    // `/products/search?q=` matches "Product <id>" titles, so q=1 finds 1, 10–19, 100…
    const query = url.pathname.endsWith('/search') ? url.searchParams.get('q') : null;
    const matchingIds = Array.from({ length: total }, (_, i) => i + 1).filter(
      (id) => query === null || `Product ${id}`.toLowerCase().includes(query.toLowerCase()),
    );
    const products: Partial<Product>[] = [];
    for (const id of matchingIds.slice(skip, skip + limit)) {
      const product: Partial<Product> = makeProduct(id, requestIndex);
      if (random() < corruptRate) {
        delete product[REQUIRED_FIELDS[Math.floor(random() * REQUIRED_FIELDS.length)]];
        stats.corrupted++;
      }
      products.push(product);
    }
    return { products, total: matchingIds.length, skip, limit: products.length };
  };

  const fetchMock = jest.fn((input: string, init?: RequestInit) => {
    const requestIndex = stats.requests++;
    stats.inFlight++;
    stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);

    return new Promise<Response>((resolve, reject) => {
      let settled = false;
      const settle = () => {
        settled = true;
        stats.inFlight--;
      };

      const delay = latencyMs(requestIndex);
      if (Number.isFinite(delay)) {
        setTimeout(() => {
          if (settled) return;
          settle();
          if (shouldFail ? shouldFail(requestIndex) : random() < failRate) {
            stats.failures++;
            reject(new TypeError('Network request failed'));
            return;
          }
          const url = new URL(input);
          // `/products/<id>`: one product, or 404 like DummyJSON for unknown ids.
          const single = url.pathname.match(/\/products\/(\d+)$/);
          if (single) {
            const id = Number(single[1]);
            const found = id >= 1 && id <= total;
            const body = found ? makeProduct(id, requestIndex) : { message: 'not found' };
            resolve({ ok: found, status: found ? 200 : 404, json: async () => body } as Response);
            return;
          }
          const body = buildBody(url, requestIndex);
          resolve({ ok: true, status: 200, json: async () => body } as Response);
        }, delay);
      }

      init?.signal?.addEventListener('abort', () => {
        stats.aborted++;
        if (ignoreAbort || settled) return;
        settle();
        reject(new Error('Aborted'));
      });
    });
  });

  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { stats, fetchMock };
}
