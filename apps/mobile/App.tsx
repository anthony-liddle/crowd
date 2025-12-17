import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { View, Text } from 'react-native';
import { TabNavigator } from './src/navigation/TabNavigator';
import { toastConfig } from './src/components/ToastConfig';
import './global.css';

/**
 * App Component
 * Root component with splash screen and navigation setup
 */
export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEffect(() => {
    // Show splash screen for 2 seconds
    const timer = setTimeout(() => {
      setIsSplashVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isSplashVisible) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <StatusBar style="auto" />
        {/* Note: In a real app, you'd use expo-splash-screen and proper image loading */}
        <View className="justify-center items-center">
          <Text className="text-[80px] mb-4">📣</Text>
          <Text className="text-4xl font-bold text-gray-900 mb-2">Crowd</Text>
          <Text className="text-lg text-gray-600">There’s safety in numbers</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <TabNavigator />
        <StatusBar style="auto" />
        <Toast config={toastConfig} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
