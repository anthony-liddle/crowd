import React from 'react';
import { Text, View } from 'react-native';
import { Concentric } from './Concentric';

// Rendered while `useFonts` is still loading and during any first-load data
// fetches. Hands off from the native splash (configured in app.json) without
// a visual flash because both share the warm paper background.
export const Splash: React.FC = () => (
  <View className="flex-1 bg-paper dark:bg-paper-d items-center justify-center px-6">
    <Concentric size={180} centerLit showOuterDots />
    <Text
      className="font-serif text-mark text-ink dark:text-ink-d"
      style={{ marginTop: 24 }}
    >
      Crowd
    </Text>
    <Text
      className="font-serif-italic text-dust dark:text-dust-d"
      style={{ marginTop: 6, fontSize: 14, textAlign: 'center' }}
    >
      There&rsquo;s safety in numbers.
    </Text>
    <View className="absolute bottom-8">
      <Text
        className="font-sans text-dust-2 dark:text-dust-2-d"
        style={{ fontSize: 10, letterSpacing: 0.4 }}
      >
        Ephemeral &middot; Local &middot; Anonymous
      </Text>
    </View>
  </View>
);
