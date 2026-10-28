import { useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { showErrorModal } from '@/services/errorModal';
import { reportError } from '@/services/errorReporter';
import { getApiSimulation, setApiSimulation, type ApiSimulation } from '@/services/errorSimulator';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/global/RouteErrorBoundary';

const API_OPTIONS: { value: ApiSimulation; label: string; description: string }[] = [
  { value: 'none', label: 'Real API', description: 'Requests behave normally.' },
  { value: 'network', label: 'Network failure', description: 'The server cannot be reached.' },
  { value: 'timeout', label: 'Timeout', description: 'No response; gives up after 10 seconds.' },
  { value: 'server', label: 'Server error', description: 'The server responds with HTTP 500.' },
  { value: 'invalidJson', label: 'Invalid response', description: 'The body is not valid JSON.' },
  {
    value: 'missingFields',
    label: 'Missing fields',
    description: 'Half the products have no title or price.',
  },
  { value: 'emptyList', label: 'Empty list', description: 'The server returns no products.' },
];

function CrashOnRender(): never {
  throw new Error('Simulated crash while rendering');
}

async function openUnsupportedUrl() {
  try {
    // Rejected by the native Linking module because no app handles this scheme.
    await Linking.openURL('unsupported-scheme://simulated');
  } catch (error) {
    reportError(error, { source: 'Linking.openURL' });
    showErrorModal({ title: "Couldn't open link", message: 'No app on this device can open it.' });
  }
}

export default function SimulateScreen() {
  const [apiSimulation, setSelected] = useState(getApiSimulation);
  const [shouldCrash, setShouldCrash] = useState(false);

  const selectSimulation = (value: ApiSimulation) => {
    setApiSimulation(value);
    setSelected(value);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Simulate errors</ThemedText>

          <Section
            title="API response"
            hint="Applies to the next requests. Pull to refresh or scroll on Home to see it.">
            {API_OPTIONS.map((option) => (
              <Option
                key={option.value}
                label={option.label}
                description={option.description}
                selected={apiSimulation === option.value}
                onPress={() => selectSimulation(option.value)}
              />
            ))}
          </Section>

          <Section
            title="Crashes"
            hint="Each one should end in an error screen or modal, not a closed app.">
            <Option
              label="Crash while rendering"
              description="Caught by this screen's error boundary."
              onPress={() => setShouldCrash(true)}
            />
            <Option
              label="Throw in a button handler"
              description="Shown in the error modal."
              onPress={() => {
                throw new Error('Simulated error in a button handler');
              }}
            />
            <Option
              label="Throw in a timer"
              description="Shown in the error modal."
              onPress={() =>
                setTimeout(() => {
                  throw new Error('Simulated error in a timer');
                })
              }
            />
            <Option
              label="Native module error"
              description="A native call fails; shown in the error modal."
              onPress={openUnsupportedUrl}
            />
          </Section>

          {shouldCrash && <CrashOnRender />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

type SectionProps = {
  title: string;
  hint: string;
  children: ReactNode;
};

function Section({ title, hint, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {hint}
      </ThemedText>
      <View style={styles.options}>{children}</View>
    </View>
  );
}

type OptionProps = {
  label: string;
  description: string;
  selected?: boolean;
  onPress: () => void;
};

function Option({ label, description, selected = false, onPress }: OptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={selected ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.option}>
        <View style={styles.optionText}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        </View>
        {selected && <ThemedText type="smallBold">✓</ThemedText>}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    // On web the tab bar floats over the top of the screen.
    paddingTop: Platform.select({ web: Spacing.six + Spacing.three, default: Spacing.three }),
    paddingBottom: BottomTabInset + Spacing.three,
  },
  section: {
    gap: Spacing.one,
  },
  options: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  optionText: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
