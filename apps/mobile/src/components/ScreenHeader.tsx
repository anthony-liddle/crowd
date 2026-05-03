import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenHeaderProps {
  title: string;
  meta?: string;
}

// Standard screen header: safe-area-aware top padding, screen-x horizontal,
// serif title with optional sans meta on the right baseline-aligned.
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, meta }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="px-screen-x pb-3 flex-row justify-between"
      style={{ paddingTop: insets.top + 16, alignItems: 'baseline' }}
    >
      <Text className="font-serif text-title text-ink dark:text-ink-d">
        {title}
      </Text>
      {meta && (
        <Text className="font-sans text-meta text-dust dark:text-dust-d">
          {meta}
        </Text>
      )}
    </View>
  );
};
