import { FlatList, StyleSheet } from 'react-native';
import { ListFooter } from '@/components/global/ListFooter';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getErrorMessage } from '@/utils/errorUtils';
import type { Product } from '../types';
import type { LoadMoreState } from '../useProducts';
import { ProductRow } from './ProductRow';

type ProductListProps = {
  products: Product[];
  hasMore: boolean;
  loadMore: LoadMoreState;
  onEndReached: () => void;
  onRetryLoadMore: () => void;
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
  onEndReached,
  onRetryLoadMore,
}: ProductListProps) {
  return (
    <FlatList
      data={products}
      keyExtractor={(item: Product) => String(item.id)}
      renderItem={renderItem}
      ItemSeparatorComponent={Separator}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
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

const renderItem = ({ item }: { item: Product }) => <ProductRow product={item} />;

function Separator() {
  return <ThemedView type="backgroundElement" style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
