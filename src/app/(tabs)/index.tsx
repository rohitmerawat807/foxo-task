import { useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/global/EmptyState';
import { ErrorState } from '@/components/global/ErrorState';
import { LoadingState } from '@/components/global/LoadingState';
import { OfflineBanner } from '@/components/global/OfflineBanner';
import { SearchBar } from '@/components/global/SearchBar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ProductList } from '@/features/products/components/ProductList';
import { useProducts } from '@/features/products/useProducts';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getErrorMessage } from '@/utils/errorUtils';

// Keeps the tab bar usable if this screen crashes while rendering.
export { RouteErrorBoundary as ErrorBoundary } from '@/components/global/RouteErrorBoundary';

const SEARCH_DEBOUNCE_MS = 300;

export default function HomeScreen() {
  const [searchText, setSearchText] = useState('');
  // Only search once typing pauses, so each keystroke doesn't fire a request.
  const search = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const { state, loadMore, retryLoadMore, refresh, retry } = useProducts(search);

  const renderContent = () => {
    switch (state.status) {
      case 'loading':
        return <LoadingState message={search ? 'Searching…' : 'Loading products…'} />;
      case 'error':
        return (
          <ErrorState
            message={getErrorMessage(state.error)}
            action={{ label: 'Try again', onPress: retry }}
          />
        );
      case 'empty':
        return search ? (
          <EmptyState title="No results" message={`Nothing matches "${search}".`} />
        ) : (
          <EmptyState
            title="No products found"
            message="Check back later for new arrivals."
            onRefresh={retry}
          />
        );
      case 'success':
        return (
          <ProductList
            products={state.products}
            hasMore={state.nextSkip < state.total}
            loadMore={state.loadMore}
            refreshing={state.refresh.status === 'refreshing'}
            refreshError={
              state.refresh.status === 'error'
                ? `Couldn't refresh. ${getErrorMessage(state.refresh.error)}`
                : undefined
            }
            onEndReached={loadMore}
            onRetryLoadMore={retryLoadMore}
            onRefresh={refresh}
          />
        );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Products</ThemedText>
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search products"
          />
          {state.status === 'success' && (
            <ThemedText type="small" themeColor="textSecondary">
              Showing {state.products.length} of {state.total}
              {search ? ` results for "${search}"` : ''}
            </ThemedText>
          )}
        </ThemedView>

        <OfflineBanner />
        {renderContent()}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  header: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    // On web the tab bar floats over the top of the screen.
    paddingTop: Platform.select({ web: Spacing.six + Spacing.three, default: Spacing.three }),
    paddingBottom: Spacing.two,
  },
});
