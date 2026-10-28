import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ErrorModal } from '@/components/global/ErrorModal';
import { useErrorModal } from '@/services/errorModal';
import { installGlobalErrorHandler } from '@/services/globalErrorHandler';

// Catches render errors from any screen without its own boundary.
export { RouteErrorBoundary as ErrorBoundary } from '@/components/global/RouteErrorBoundary';

SplashScreen.preventAutoHideAsync();
installGlobalErrorHandler();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const errorModal = useErrorModal();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
      <ErrorModal error={errorModal.error} onDismiss={errorModal.dismiss} />
    </ThemeProvider>
  );
}
