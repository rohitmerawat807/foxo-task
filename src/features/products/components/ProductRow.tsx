import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import type { Product } from '../types';

type ProductRowProps = {
  product: Product;
};

const THUMBNAIL_SIZE = 72;

export function ProductRow({ product }: ProductRowProps) {
  const { title, brand, category, price, rating, thumbnail } = product;
  const subtitle = brand ? `${brand} · ${category}` : category;

  return (
    <ThemedView style={styles.container}>
      <ThemedView type="backgroundElement" style={styles.thumbnail}>
        <Image
          source={{ uri: thumbnail }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      </ThemedView>

      <View style={styles.details}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {subtitle}
        </ThemedText>
        <View style={styles.meta}>
          <ThemedText type="smallBold">${price.toFixed(2)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            ★ {rating.toFixed(1)}
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Spacing.two,
    overflow: 'hidden',
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
