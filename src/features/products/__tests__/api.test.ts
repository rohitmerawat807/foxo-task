import { toProductSummary } from '../api';

jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn() }));

const GARBAGE = [undefined, null, '', '   ', 'text', '12.5', 0, -1, 7, NaN, Infinity, [], {}, true];

describe('toProductSummary', () => {
  it('keeps a product with only an id, filling in what is missing', () => {
    expect(toProductSummary({ id: 1 })).toEqual({
      id: 1,
      title: 'Untitled product',
      description: undefined,
      brand: undefined,
      category: undefined,
      price: undefined,
      rating: undefined,
      thumbnail: undefined,
    });
  });

  it('rejects values without a numeric id', () => {
    for (const id of [undefined, null, '1', NaN, Infinity]) {
      expect(toProductSummary({ id, title: 'x' })).toBeNull();
    }
    expect(toProductSummary(null)).toBeNull();
    expect(toProductSummary('product')).toBeNull();
  });

  it('drops values of the wrong type or out of range', () => {
    const product = toProductSummary({
      id: 1,
      title: '  Trimmed  ',
      price: -5,
      rating: 9,
      brand: 42,
      category: '   ',
    });
    expect(product).toMatchObject({
      title: 'Trimmed',
      price: undefined,
      rating: undefined,
      brand: undefined,
      category: undefined,
    });
  });

  it('falls back to the first full-size image when there is no thumbnail', () => {
    expect(toProductSummary({ id: 1, images: ['a.png', 'b.png'] })?.thumbnail).toBe('a.png');
    expect(toProductSummary({ id: 1, thumbnail: 't.png', images: ['a.png'] })?.thumbnail).toBe(
      't.png',
    );
  });

  it('never throws and always returns a usable shape for random input', () => {
    const pick = () => GARBAGE[Math.floor(Math.random() * GARBAGE.length)];
    for (let i = 0; i < 5_000; i++) {
      const raw = {
        id: Math.random() < 0.9 ? i : pick(),
        title: pick(),
        description: pick(),
        brand: pick(),
        category: pick(),
        price: pick(),
        rating: pick(),
        thumbnail: pick(),
        images: pick(),
      };
      const product = toProductSummary(raw);
      if (product === null) continue;

      expect(Number.isFinite(product.id)).toBe(true);
      expect(product.title.trim()).not.toBe('');
      if (product.price !== undefined) expect(product.price).toBeGreaterThanOrEqual(0);
      if (product.rating !== undefined) expect(product.rating).toBeLessThanOrEqual(5);
      for (const field of ['description', 'brand', 'category', 'thumbnail'] as const) {
        const value = product[field];
        if (value !== undefined) expect(typeof value).toBe('string');
      }
    }
  });
});
