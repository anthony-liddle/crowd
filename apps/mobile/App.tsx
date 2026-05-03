import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import './global.css';

export default function App() {
  const [loaded] = useFonts({
    LibreBaskerville_400Regular,
    LibreBaskerville_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const { colorScheme } = useColorScheme();

  if (!loaded) {
    return (
      <View className={`flex-1 ${colorScheme === 'dark' ? 'dark' : ''}`}>
        <Splash />
      </View>
    );
  }

  return (
    <View className={`flex-1 ${colorScheme === 'dark' ? 'dark' : ''}`}>
      <SafeAreaProvider>
        <NavigationContainer>
          <TabNavigator />
          <StatusBar style="auto" />
          <Toast config={toastConfig} />
        </NavigationContainer>
      </SafeAreaProvider>
    </View>
  );
}
