/**
 * Lets the Simulate tab make API requests fail on purpose, so every error state can be
 * exercised without breaking the real network.
 */
export type ApiSimulation =
  'none' | 'network' | 'timeout' | 'server' | 'invalidJson' | 'messyData' | 'emptyList';

let activeSimulation: ApiSimulation = 'none';

export const getApiSimulation = () => activeSimulation;

export const setApiSimulation = (simulation: ApiSimulation) => {
  activeSimulation = simulation;
};

const LONG_TEXT =
  'An unusually long piece of text that wraps over several lines, to check that rows with ' +
  'different heights still lay out and scroll smoothly.';

/** Real data with a different problem in each of every five products. */
function messUpProduct(product: Record<string, unknown>, index: number) {
  switch (index % 5) {
    case 0:
      return { ...product, title: undefined, price: undefined, brand: undefined };
    case 1:
      return { ...product, title: `${product.title} — ${LONG_TEXT}`, description: LONG_TEXT };
    case 2:
      return { ...product, thumbnail: 'https://invalid.example/missing.webp', rating: 'NaN' };
    case 3:
      // Same id as the product before it.
      return { ...product, id: (product.id as number) - 1 };
    default:
      return product;
  }
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Drop-in replacement for `fetch` that applies the active simulation. */
export async function fetchWithSimulation(url: string, init: RequestInit): Promise<Response> {
  switch (activeSimulation) {
    case 'none':
      return fetch(url, init);
    case 'network':
      // Same error React Native's fetch throws when the host is unreachable.
      throw new TypeError('Network request failed');
    case 'timeout':
      // Never responds; the API client's timeout aborts it.
      return new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
      });
    case 'server':
      return jsonResponse({ message: 'Simulated server error' }, 500);
    case 'invalidJson':
      return new Response('<html>Not JSON</html>', { status: 200 });
    case 'messyData': {
      const data = await (await fetch(url, init)).json();
      data.products = data.products.map(messUpProduct);
      return jsonResponse(data);
    }
    case 'emptyList':
      return jsonResponse({ products: [], total: 0, skip: 0, limit: 0 });
  }
}
