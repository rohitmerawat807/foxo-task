import { render, screen } from '@testing-library/react-native';

import { ProductList } from '../components/ProductList';
import type { ProductSummary } from '../types';

const noop = () => {};

function renderList(products: ProductSummary[]) {
  return render(
    <ProductList
      products={products}
      hasMore
      loadMore={{ status: 'idle' }}
      refreshing={false}
      onEndReached={noop}
      onRetryLoadMore={noop}
      onRefresh={noop}
    />,
  );
}

describe('ProductList', () => {
  it('only mounts a small window of rows from a 5,000 item list', async () => {
    const products = Array.from({ length: 5_000 }, (_, i) => ({
      id: i + 1,
      title: `Product ${i + 1}`,
      price: i,
    }));

    await renderList(products);

    const mounted = screen.queryAllByText(/^Product \d+$/).length;
    expect(mounted).toBeGreaterThan(0);
    expect(mounted).toBeLessThanOrEqual(8);
  });

  it('renders rows that are missing every optional field', async () => {
    await renderList([
      { id: 1, title: 'Bare product' },
      { id: 2, title: 'Has price', price: 10, rating: 4.25, brand: 'Brand', category: 'cat' },
    ]);

    expect(screen.getByText('Bare product')).toBeOnTheScreen();
    expect(screen.getByText('Price unavailable')).toBeOnTheScreen();
    // First-letter placeholder instead of an image.
    expect(screen.getByText('B')).toBeOnTheScreen();
    expect(screen.getByText('$10.00')).toBeOnTheScreen();
    expect(screen.getByText('★ 4.3')).toBeOnTheScreen();
    expect(screen.getByText('Brand · cat')).toBeOnTheScreen();
  });
});
