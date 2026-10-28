import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/global/Button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type ErrorStateProps = {
  title?: string;
  message: string;
  action?: { label: string; onPress: () => void };
};

export function ErrorState({ title = 'Something went wrong', message, action }: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
        {message}
      </ThemedText>
      {action && (
        <View style={styles.action}>
          <Button onPress={action.onPress} label={action.label} />
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
