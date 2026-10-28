import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { RetryButton } from '@/components/global/RetryButton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ListFooterProps =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'end'; message?: string };

/** Footer for paginated lists: next-page spinner, inline retry, or end-of-list note. */
export function ListFooter(props: ListFooterProps) {
  const theme = useTheme();

  switch (props.status) {
    case 'loading':
      return (
        <View style={styles.container} accessibilityLabel="Loading more">
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      );
    case 'error':
      return (
        <View style={styles.container} accessibilityRole="alert">
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            {props.message}
          </ThemedText>
          <RetryButton onPress={props.onRetry} />
        </View>
      );
    case 'end':
      return (
        <View style={styles.container}>
          <ThemedText type="small" themeColor="textSecondary">
            {props.message ?? "You've reached the end"}
          </ThemedText>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  message: {
    textAlign: 'center',
  },
});
