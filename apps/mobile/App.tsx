import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RootTabParamList } from '@/types';
import { useColorScheme } from 'nativewind';
import {
  useFonts,
  LibreBaskerville_400Regular,
  LibreBaskerville_400Regular_Italic,
} from '@expo-google-fonts/libre-baskerville';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import Toast from 'react-native-toast-message';
import { TabNavigator } from './src/navigation/TabNavigator';
import { toastConfig } from './src/components/ToastConfig';
import { Splash } from './src/components/Splash';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { useHasOnboarded } from './src/hooks/useHasOnboarded';
import './global.css';

// Deep links route every recognized invite URL into the Crowds tab with the
// raw URL as `pendingInvite`. Parsing lives in CrowdsScreen via
// parseCrowdInvite so QR scans, pasted codes, and deep links share one parser.
const linking: LinkingOptions<RootTabParamList> = {
  prefixes: ['crowd://'],
  config: {
    screens: {
      Crowds: {
        path: '*',
        parse: { pendingInvite: (v: string) => v },
      },
    },
  },
  getStateFromPath: (path) => {
    // path is what comes after the scheme, e.g. "join/<id>" or
    // "join-token/<token>?cid=<id>". Forward the full crowd:// URL to
    // CrowdsScreen so the existing parser handles every shape uniformly.
    const pendingInvite = `crowd://${path}`;
    return {
      routes: [
        { name: 'Crowds', params: { pendingInvite } },
      ],
    };
  },
};

export default function App() {
  const [loaded] = useFonts({
    LibreBaskerville_400Regular,
    LibreBaskerville_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const { hasOnboarded, markOnboarded } = useHasOnboarded();
  const { colorScheme } = useColorScheme();

  // Splash covers both the font load and the brief AsyncStorage read of the
  // onboarding flag (hasOnboarded === null), so we never flash onboarding at an
  // already-onboarded user before the flag resolves.
  if (!loaded || hasOnboarded === null) {
    return (
      <View className={`flex-1 ${colorScheme === 'dark' ? 'dark' : ''}`}>
        <Splash />
      </View>
    );
  }

  if (!hasOnboarded) {
    return (
      <View className={`flex-1 ${colorScheme === 'dark' ? 'dark' : ''}`}>
        <SafeAreaProvider>
          <OnboardingScreen mode="first-launch" onContinue={markOnboarded} />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${colorScheme === 'dark' ? 'dark' : ''}`}>
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          <TabNavigator />
          <StatusBar style="auto" />
          <Toast config={toastConfig} />
        </NavigationContainer>
      </SafeAreaProvider>
    </View>
  );
}
