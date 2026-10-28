import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import type { ProductSummary } from '../types';

type ProductRowProps = {
  product: ProductSummary;
};

const THUMBNAIL_SIZE = 72;

// Memoized because FlatList calls `renderItem` outside the React Compiler's reach; without it,
// every visible row re-renders whenever a new page is appended.
export const ProductRow = memo(function ProductRow({ product }: ProductRowProps) {
  const { title, description, brand, category, price, rating, thumbnail } = product;
  const subtitle = [brand, category].filter(Boolean).join(' · ');

  return (
    <ThemedView style={styles.container}>
      <Thumbnail uri={thumbnail} title={title} />

      <View style={styles.details}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {title}
        </ThemedText>
        {subtitle !== '' && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        )}
        {description && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {description}
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
    </ThemedView>
  );
});

type ThumbnailProps = {
  uri?: string;
  title: string;
};

function Thumbnail({ uri, title }: ThumbnailProps) {
  const [failed, setFailed] = useState(false);

  return (
    <ThemedView type="backgroundElement" style={styles.thumbnail}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          // Keeps decoded images in memory so scrolling back doesn't reload them from disk.
          cachePolicy="memory-disk"
          transition={150}
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <ThemedText type="subtitle" themeColor="textSecondary">
          {title.charAt(0).toUpperCase()}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Spacing.two,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
