import { Modal, StyleSheet, View } from 'react-native';

import { Button } from '@/components/global/Button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { ModalError } from '@/services/errorModal';

type ErrorModalProps = {
  error: ModalError | null;
  onDismiss: () => void;
};

export function ErrorModal({ error, onDismiss }: ErrorModalProps) {
  return (
    <Modal
      visible={error !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <ThemedView style={styles.card} accessibilityRole="alert" accessibilityViewIsModal>
          <ThemedView type="backgroundElement" style={styles.icon}>
            <ThemedText type="smallBold">!</ThemedText>
          </ThemedView>
          <ThemedText type="smallBold" style={styles.centered}>
            {error?.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            {error?.message}
          </ThemedText>
          <View style={styles.action}>
            <Button onPress={onDismiss} label="OK" />
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const ICON_SIZE = 40;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.two,
  },
});
