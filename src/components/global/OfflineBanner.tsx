import { useNetworkState } from 'expo-network';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Shows a notice while the device has no network connection. */
export function OfflineBanner() {
  const { isConnected } = useNetworkState();

  // `undefined` while the state is still unknown; only react to a confirmed disconnect.
  if (isConnected !== false) {
    return null;
  }

  return (
    <ThemedView type="backgroundElement" style={styles.banner} accessibilityRole="alert">
      <ThemedText type="small">You&apos;re offline. Some content may not load.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
});
