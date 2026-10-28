/**
 * Lets the Simulate tab make API requests fail on purpose, so every error state can be
 * exercised without breaking the real network.
 */
export type ApiSimulation =
  'none' | 'network' | 'timeout' | 'server' | 'invalidJson' | 'missingFields' | 'emptyList';

let activeSimulation: ApiSimulation = 'none';

export const getApiSimulation = () => activeSimulation;

export const setApiSimulation = (simulation: ApiSimulation) => {
  activeSimulation = simulation;
};

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
    case 'missingFields': {
      // Real data, but every other product loses its title and price.
      const data = await (await fetch(url, init)).json();
      data.products = data.products.map((product: object, index: number) =>
        index % 2 === 0 ? { ...product, title: undefined, price: undefined } : product,
      );
      return jsonResponse(data);
    }
    case 'emptyList':
      return jsonResponse({ products: [], total: 0, skip: 0, limit: 0 });
  }
}
