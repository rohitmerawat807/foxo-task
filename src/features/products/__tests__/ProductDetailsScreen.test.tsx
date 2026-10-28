import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import ProductDetailsScreen from '@/app/product/[id]';
import { installFakeProductsServer } from '@/test-utils/fakeProductsServer';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
  useNetworkState: () => ({ isConnected: true }),
}));
jest.mock('@/services/errorReporter', () => ({ reportError: jest.fn() }));

/** Renders the real details route at `url`, with a stand-in home screen behind it. */
function openDetails(url: string) {
  return renderRouter(
    {
      index: () => <Text>Home</Text>,
      'product/[id]': ProductDetailsScreen,
    },
    { initialUrl: url },
  );
}

describe('Product details screen', () => {
  it('loads the product from the id in the link', async () => {
    const { stats } = installFakeProductsServer({ total: 100, latencyMs: () => 5 });
    await openDetails('/product/42');

    expect(screen.getByText('Loading product…')).toBeOnTheScreen();
    expect(await screen.findByText('Product 42 (request 0)')).toBeOnTheScreen();
    expect(screen.getByText('$42.00')).toBeOnTheScreen();
    expect(stats.requests).toBe(1);
  });

  it('rejects a malformed id without sending a request', async () => {
    const { stats } = installFakeProductsServer({ total: 100 });
    await openDetails('/product/abc');

    expect(screen.getByText('Invalid product link')).toBeOnTheScreen();
    expect(screen.getByText('Go back')).toBeOnTheScreen();
    expect(stats.requests).toBe(0);
  });

  it('shows "not found" with a way back for an unknown id', async () => {
    installFakeProductsServer({ total: 100, latencyMs: () => 5 });
    await openDetails('/product/9999');

    expect(await screen.findByText('Product not found')).toBeOnTheScreen();
    expect(screen.getByText('Go back')).toBeOnTheScreen();
    expect(screen.queryByText('Try again')).toBeNull();
  });

  it('offers a retry after a network failure, and recovers', async () => {
    installFakeProductsServer({ total: 100, latencyMs: () => 5, shouldFail: (i) => i === 0 });
    await openDetails('/product/7');

    expect(await screen.findByText("Couldn't load this product")).toBeOnTheScreen();
    expect(screen.getByText("Couldn't reach the server. Please try again.")).toBeOnTheScreen();

    await act(async () => fireEvent.press(screen.getByText('Try again')));
    expect(await screen.findByText('Product 7 (request 1)')).toBeOnTheScreen();
  });

  it('cancels the request when going back mid-load', async () => {
    const { stats } = installFakeProductsServer({ total: 100, latencyMs: () => 50 });
    await openDetails('/');
    await act(async () => router.push('/product/3'));
    expect(screen.getByText('Loading product…')).toBeOnTheScreen();

    // Unmounting the screen aborts synchronously, so there's nothing to wait for.
    await act(async () => router.back());

    expect(screen.getByText('Home')).toBeOnTheScreen();
    expect(stats.requests).toBe(1);
    expect(stats.aborted).toBe(1);
  });
});
