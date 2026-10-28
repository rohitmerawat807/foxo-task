import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/global/EmptyState';
import { ErrorState } from '@/components/global/ErrorState';
import { LoadingState } from '@/components/global/LoadingState';
import { OfflineBanner } from '@/components/global/OfflineBanner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ProductList } from '@/features/products/components/ProductList';
import { useProducts } from '@/features/products/useProducts';
import { getErrorMessage } from '@/utils/errorUtils';

// Keeps the tab bar usable if this screen crashes while rendering.
export { RouteErrorBoundary as ErrorBoundary } from '@/components/global/RouteErrorBoundary';

export default function HomeScreen() {
  const { state, loadMore, retryLoadMore, retry } = useProducts();

  const renderContent = () => {
    switch (state.status) {
      case 'loading':
        return <LoadingState message="Loading products…" />;
      case 'error':
        return <ErrorState message={getErrorMessage(state.error)} onRetry={retry} />;
      case 'empty':
        return (
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
            onEndReached={loadMore}
            onRetryLoadMore={retryLoadMore}
            onRefresh={retry}
          />
        );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Products</ThemedText>
          {state.status === 'success' && (
            <ThemedText type="small" themeColor="textSecondary">
              Showing {state.products.length} of {state.total}
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
    paddingHorizontal: Spacing.four,
    // On web the tab bar floats over the top of the screen.
    paddingTop: Platform.select({ web: Spacing.six + Spacing.three, default: Spacing.three }),
    paddingBottom: Spacing.two,
  },
});
