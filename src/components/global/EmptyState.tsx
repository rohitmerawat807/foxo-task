import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/global/Button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type EmptyStateProps = {
  title?: string;
  message?: string;
  onRefresh?: () => void;
};

export function EmptyState({
  title = 'Nothing here yet',
  message = 'There is nothing to show right now.',
  onRefresh,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
        {message}
      </ThemedText>
      {onRefresh && (
        <View style={styles.action}>
          <Button onPress={onRefresh} label="Refresh" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  message: {
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.two,
  },
});
