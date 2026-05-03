import React from 'react';
import {
  ActionSheetIOS,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useColorScheme } from 'nativewind';
import { FeedSource } from '@/types';

interface FeedSourceSelectorProps {
  sources: FeedSource[];
  selectedSource: FeedSource;
  onSourceChange: (source: FeedSource) => void;
  title?: string;
}

const COLORS = {
  light: { ink: '#1A1814', ember: '#B85A2C', paper2: '#EFE9DA' },
  dark: { ink: '#EDE7D9', ember: '#D08454', paper2: '#1B1A15' },
};

export const FeedSourceSelector: React.FC<FeedSourceSelectorProps> = ({
  sources,
  selectedSource,
  onSourceChange,
  title = 'Select feed',
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? COLORS.dark : COLORS.light;

  if (sources.length <= 1) return null;

  const handleIOSPress = () => {
    const options = sources.map((s) => s.name);
    options.push('Cancel');

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        title,
        userInterfaceStyle: isDark ? 'dark' : 'light',
      },
      (buttonIndex) => {
        if (buttonIndex !== undefined && buttonIndex < sources.length) {
          onSourceChange(sources[buttonIndex]);
        }
      },
    );
  };

  if (Platform.OS === 'ios') {
    return (
      <View className="px-screen-x" style={{ marginBottom: 12 }}>
        <Pressable
          onPress={handleIOSPress}
          className="bg-paper-2 dark:bg-paper-2-d border border-rule dark:border-rule-d rounded-md flex-row justify-between items-center active:opacity-60"
          style={{ paddingHorizontal: 12, paddingVertical: 10 }}
        >
          <Text
            className="font-sans-medium text-ink dark:text-ink-d"
            style={{ fontSize: 13 }}
          >
            {selectedSource.name}
          </Text>
          <Text
            className="font-sans text-ember dark:text-ember-d"
            style={{ fontSize: 11 }}
          >
            ▼
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="px-screen-x" style={{ marginBottom: 12 }}>
      <View className="bg-paper-2 dark:bg-paper-2-d border border-rule dark:border-rule-d rounded-md overflow-hidden">
        <Picker
          selectedValue={selectedSource.id}
          onValueChange={(itemValue) => {
            const selected = sources.find((s) => s.id === itemValue);
            if (selected) onSourceChange(selected);
          }}
          style={[styles.androidPicker, { color: c.ink, backgroundColor: c.paper2 }]}
          dropdownIconColor={c.ember}
        >
          {sources.map((source) => (
            <Picker.Item
              key={source.id || 'global'}
              label={source.name}
              value={source.id}
              color={c.ink}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  androidPicker: {
    height: 50,
    width: '100%',
  },
});
