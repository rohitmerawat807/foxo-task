import { FlatList, StyleSheet } from 'react-native';
import { ListFooter } from '@/components/global/ListFooter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getErrorMessage } from '@/utils/errorUtils';
import type { ProductSummary } from '../types';
import type { LoadMoreState } from '../useProducts';
import { ProductRow } from './ProductRow';

type ProductListProps = {
  products: ProductSummary[];
  hasMore: boolean;
  loadMore: LoadMoreState;
  refreshing: boolean;
  /** Shown above the list when a pull-to-refresh failed. */
  refreshError?: string;
  onEndReached: () => void;
  onRetryLoadMore: () => void;
  onRefresh: () => void;
};

type FooterProps = {
  hasMore: boolean;
  loadMore: LoadMoreState;
  onRetry: () => void;
};

export function ProductList({
  products,
  hasMore,
  loadMore,
  refreshing,
  refreshError,
  onEndReached,
  onRetryLoadMore,
  onRefresh,
}: ProductListProps) {
  return (
    <FlatList
      data={products}
      keyExtractor={(item: ProductSummary) => String(item.id)}
      renderItem={renderItem}
      ItemSeparatorComponent={Separator}
      onEndReached={onEndReached}
      // Start the next page a full screen early so fast scrolling rarely hits the bottom.
      onEndReachedThreshold={1}
      // Rows can differ in height (the subtitle line is left out when there's no data), so no
      // `getItemLayout`. Instead keep the rendered window small: fewer mounted rows means fewer
      // decoded images in memory on long lists.
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={7}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListHeaderComponent={
        refreshError ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.notice}>
            {refreshError}
          </ThemedText>
        ) : null
      }
      // Typing in the search bar shouldn't fight with taps and scrolls on the list.
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListFooterComponent={
        <Footer hasMore={hasMore} loadMore={loadMore} onRetry={onRetryLoadMore} />
      }
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  );
}

function Footer({ hasMore, loadMore, onRetry }: FooterProps) {
  if (loadMore.status === 'loading') {
    return <ListFooter status="loading" />;
  }
  if (loadMore.status === 'error') {
    return (
      <ListFooter
        status="error"
        message={`Couldn't load more products. ${getErrorMessage(loadMore.error)}`}
        onRetry={onRetry}
      />
    );
  }
  return hasMore ? null : <ListFooter status="end" message="You've seen all products" />;
}

const renderItem = ({ item }: { item: ProductSummary }) => <ProductRow product={item} />;

function Separator() {
  return <ThemedView type="backgroundElement" style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  notice: {
    paddingVertical: Spacing.two,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
