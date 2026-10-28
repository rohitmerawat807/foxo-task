import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type ProductImageProps = {
  uri?: string;
  /** Its first letter stands in for a missing or broken image. */
  title: string;
  style: StyleProp<ViewStyle>;
};

export function ProductImage({ uri, title, style }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <ThemedView type="backgroundElement" style={[styles.container, style]}>
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
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
