import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import type { ProductSummary } from '../types';
import { ProductImage } from './ProductImage';

type ProductRowProps = {
  product: ProductSummary;
};

const THUMBNAIL_SIZE = 72;

// Memoized because FlatList calls `renderItem` outside the React Compiler's reach; without it,
// every visible row re-renders whenever a new page is appended.
export const ProductRow = memo(function ProductRow({ product }: ProductRowProps) {
  const { id, title, brand, category, price, rating, thumbnail } = product;
  const subtitle = [brand, category].filter(Boolean).join(' · ');

  return (
    <Pressable
      // Only the id travels to the details screen; it fetches the full, fresh product itself.
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(id) } })}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="link"
      accessibilityHint="Opens product details">
      <ProductImage uri={thumbnail} title={title} style={styles.thumbnail} />

      <View style={styles.details}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle !== '' && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        )}
        <View style={styles.meta}>
          {price !== undefined ? (
            <ThemedText type="smallBold">${price.toFixed(2)}</ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Price unavailable
            </ThemedText>
          )}
          {rating !== undefined && (
            <ThemedText type="small" themeColor="textSecondary">
              ★ {rating.toFixed(1)}
            </ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Spacing.two,
  },
  details: {
    flex: 1,
    gap: Spacing.half,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
