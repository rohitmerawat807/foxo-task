import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorModal } from '@/components/global/ErrorModal';
import { useErrorModal } from '@/services/errorModal';
import { installGlobalErrorHandler } from '@/services/globalErrorHandler';

// Catches render errors from any screen without its own boundary.
export { RouteErrorBoundary as ErrorBoundary } from '@/components/global/RouteErrorBoundary';

SplashScreen.preventAutoHideAsync();
installGlobalErrorHandler();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const errorModal = useErrorModal();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {/* Tabs at the bottom of the stack; detail screens push on top of them. */}
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Product', headerBackTitle: 'Back' }} />
      </Stack>
      <ErrorModal error={errorModal.error} onDismiss={errorModal.dismiss} />
    </ThemeProvider>
  );
}
