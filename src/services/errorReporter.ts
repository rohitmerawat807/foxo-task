import { LogBox } from 'react-native';

const LOG_PREFIX = '[reportError]';

// These errors are already shown in the app's own error UI; keep them in the terminal only,
// not as LogBox overlays.
LogBox.ignoreLogs([LOG_PREFIX]);

/**
 * Single place unexpected errors are sent to. Logs during development; plug a crash reporting
 * service (e.g. Sentry) in here to collect errors from release builds.
 */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (__DEV__) {
    console.error(LOG_PREFIX, error, context ?? '');
  }
}
