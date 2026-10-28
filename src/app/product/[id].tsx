import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ErrorState } from '@/components/global/ErrorState';
import { LoadingState } from '@/components/global/LoadingState';
import { OfflineBanner } from '@/components/global/OfflineBanner';
import { ThemedView } from '@/components/themed-view';
import { parseProductId } from '@/features/products/api';
import { ProductDetailsView } from '@/features/products/components/ProductDetailsView';
import { useProductDetails } from '@/features/products/useProductDetails';
import { AppError, getErrorMessage } from '@/utils/errorUtils';

// A crash while rendering the details stays on this screen; Back still works.
export { RouteErrorBoundary as ErrorBoundary } from '@/components/global/RouteErrorBoundary';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
const goBackAction = { label: 'Go back', onPress: goBack };

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Links can come from outside the app (deep links, typed URLs), so the id can't be trusted.
  const productId = parseProductId(id);

  return (
    <ThemedView style={styles.container}>
      <OfflineBanner />
      {productId === null ? (
        <ErrorState
          title="Invalid product link"
          message="This link doesn't point to a product."
          action={goBackAction}
        />
      ) : (
        <ProductDetailsContent id={productId} />
      )}
    </ThemedView>
  );
}

function ProductDetailsContent({ id }: { id: number }) {
  const { state, retry } = useProductDetails(id);

  switch (state.status) {
    case 'loading':
      return <LoadingState message="Loading product…" />;
    case 'error':
      return <ProductError error={state.error} onRetry={retry} />;
    case 'success':
      return (
        <>
          <Stack.Screen options={{ title: state.product.title }} />
          <ProductDetailsView product={state.product} />
        </>
      );
  }
}

function ProductError({ error, onRetry }: { error: AppError; onRetry: () => void }) {
  // Retrying can't make a missing product appear; offer a way out instead.
  if (error.kind === 'http' && error.status === 404) {
    return (
      <ErrorState
        title="Product not found"
        message="This product doesn't exist or is no longer available."
        action={goBackAction}
      />
    );
  }
  return (
    <ErrorState
      title="Couldn't load this product"
      message={getErrorMessage(error)}
      action={{ label: 'Try again', onPress: onRetry }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
