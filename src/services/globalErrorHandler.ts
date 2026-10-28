import { Platform } from 'react-native';

import { showErrorModal } from '@/services/errorModal';
import { reportError } from '@/services/errorReporter';
import { getCrashMessage } from '@/utils/errorUtils';

/**
 * Catches JS errors that happen outside rendering (event handlers, timers, native module
 * callbacks), which error boundaries can't see, and shows them in the app's error modal.
 * This replaces React Native's default handler, so these errors no longer close the app in
 * release builds or open the red error screen in development. They are still logged.
 */
export function installGlobalErrorHandler() {
  // `ErrorUtils` is React Native only. On web, render errors are still caught by the
  // error boundaries.
  if (Platform.OS === 'web') {
    return;
  }

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    reportError(error, { source: 'globalHandler', isFatal });
    showErrorModal({ title: 'Something went wrong', message: getCrashMessage(error) });
  });
}
