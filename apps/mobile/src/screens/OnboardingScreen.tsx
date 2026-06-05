import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, QuietButton } from '@/components/Buttons';
import {
  getLocationPermissionStatus,
  LocationPermissionStatus,
} from '@/hooks/useLocation';

interface OnboardingScreenProps {
  mode: 'first-launch' | 'reference';
  onContinue: () => void;
}

// Verbatim copy. The four framing paragraphs render in both modes; the
// location section is first-launch only.
const BODY_PARAGRAPHS = [
  'No accounts. No logins. No trace.',
  'Nothing connects what you said yesterday to what you say today.',
  "Messages last as long as you choose. Then they're gone, and your identity rotates with them.",
  'Crowds close after a day, erasing everything said inside.',
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  mode,
  onContinue,
}) => {
  const insets = useSafeAreaInsets();
  const isFirstLaunch = mode === 'first-launch';
  const [status, setStatus] = useState<LocationPermissionStatus | null>(null);

  const refreshStatus = useCallback(async () => {
    setStatus(await getLocationPermissionStatus());
  }, []);

  // Only the location section depends on permission state, and reference mode
  // hides it — so the checks run in first-launch mode only.
  useEffect(() => {
    if (!isFirstLaunch) return;
    refreshStatus();
  }, [isFirstLaunch, refreshStatus]);

  // Re-check on return-to-foreground. The "Open Settings" path sends the user
  // out of the app; coming back is an AppState 'active' transition, not a
  // navigation focus event — this screen renders outside the NavigationContainer
  // on first launch, so useFocusEffect isn't available here.
  useEffect(() => {
    if (!isFirstLaunch) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshStatus();
    });
    return () => sub.remove();
  }, [isFirstLaunch, refreshStatus]);

  const requestPermission = useCallback(async () => {
    const { status: next } = await Location.requestForegroundPermissionsAsync();
    setStatus(
      next === 'granted' ? 'granted' : next === 'denied' ? 'denied' : 'undetermined',
    );
  }, []);

  const granted = status === 'granted';
  const denied = status === 'denied';

  const locationCopy = denied
    ? 'Crowd needs location to work. You can enable it in Settings.'
    : 'Crowd needs to know where you are to show you nearby messages. Your location is used, never stored.';

  return (
    <View className="flex-1 bg-paper dark:bg-paper-d">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 22,
        }}
      >
        {/* Framing — renders in both modes */}
        <View>
          <Text className="font-serif text-mark text-ink dark:text-ink-d">
            Crowd
          </Text>
          <Text
            className="font-serif text-title text-ink dark:text-ink-d"
            style={{ marginTop: 16 }}
          >
            Built to forget
          </Text>
          <View style={{ marginTop: 20, gap: 14 }}>
            {BODY_PARAGRAPHS.map((paragraph) => (
              <Text
                key={paragraph}
                className="font-sans text-body text-ink-2 dark:text-ink-2-d"
              >
                {paragraph}
              </Text>
            ))}
          </View>
        </View>

        {/* Action area */}
        <View style={{ marginTop: 40 }}>
          {isFirstLaunch ? (
            <>
              <View
                className="border-t border-rule dark:border-rule-d"
                style={{ marginBottom: 20 }}
              />
              <Text
                className="font-sans text-body text-ink-2 dark:text-ink-2-d"
                style={{ marginBottom: 16 }}
              >
                {locationCopy}
              </Text>

              {/* Location control: request → granted indicator / settings */}
              {granted ? (
                <View
                  className="border border-dust-2 dark:border-dust-2-d rounded-md py-3.5 items-center"
                  style={{ marginBottom: 10 }}
                >
                  <Text className="font-sans text-body text-dust dark:text-dust-d">
                    ✓ Location granted
                  </Text>
                </View>
              ) : (
                <View style={{ marginBottom: 10 }}>
                  <PrimaryButton
                    label={denied ? 'Open Settings' : 'Allow location'}
                    onPress={denied ? () => Linking.openSettings() : requestPermission}
                  />
                </View>
              )}

              {/* Continue: ember-primary when granted, outlined dust-2 disabled otherwise */}
              {granted ? (
                <PrimaryButton label="Continue" onPress={onContinue} />
              ) : (
                <View className="border border-dust-2 dark:border-dust-2-d rounded-md py-3.5 items-center">
                  <Text className="font-sans-medium text-body text-dust-2 dark:text-dust-2-d">
                    Continue
                  </Text>
                </View>
              )}
            </>
          ) : (
            <QuietButton label="Done" onPress={onContinue} />
          )}
        </View>
      </ScrollView>
    </View>
  );
};
