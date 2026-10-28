import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';

import { ErrorFallback } from '@/components/global/ErrorFallback';
import { reportError } from '@/services/errorReporter';

/**
 * Catches errors thrown while rendering a route. Use it from a route file with
 * `export { RouteErrorBoundary as ErrorBoundary } from '@/components/global/RouteErrorBoundary';`
 */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportError(error, { source: 'ErrorBoundary' });
  }, [error]);

  return <ErrorFallback error={error} onRetry={retry} />;
}
