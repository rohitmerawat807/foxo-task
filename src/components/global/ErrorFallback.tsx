import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/global/ErrorState';
import { ThemedView } from '@/components/themed-view';
import { getCrashMessage } from '@/utils/errorUtils';

type ErrorFallbackProps = {
  error: Error;
  onRetry: () => void;
};

/** Full-screen message shown in place of a screen (or the app) that crashed. */
export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ErrorState
          title="Something went wrong"
          message={getCrashMessage(error)}
          action={{ label: 'Try again', onPress: onRetry }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
