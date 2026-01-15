import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActionSheetIOS
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FeedSource } from '@/types';

interface FeedSourceSelectorProps {
  sources: FeedSource[];
  selectedSource: FeedSource;
  onSourceChange: (source: FeedSource) => void;
  label?: string;
  globalLabel?: string;
  title?: string;
  containerClassName?: string;
}

/**
 * FeedSourceSelector Component
 * Native-feeling dropdown to select between Global and Crowd feeds
 * Uses ActionSheet on iOS for a compact/premium look
 */
export const FeedSourceSelector: React.FC<FeedSourceSelectorProps> = ({
  sources,
  selectedSource,
  onSourceChange,
  label,
  globalLabel = 'Global Feed',
  title = 'Select Feed',
  containerClassName = 'p-2 bg-white border-b border-gray-100',
}) => {
  if (sources.length <= 1) return null;

  const handleIOSPress = () => {
    const options = sources.map(s => s.id === null ? `🌍 ${globalLabel}` : `👥 ${s.name}`);
    options.push('Cancel');

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        title,
      },
      (buttonIndex) => {
        if (buttonIndex < sources.length) {
          onSourceChange(sources[buttonIndex]);
        }
      }
    );
  };

  const currentLabel = selectedSource.id === null ? `🌍 ${globalLabel}` : `👥 ${selectedSource.name}`;

  if (Platform.OS === 'ios') {
    return (
      <View className={containerClassName}>
        {label && (
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            {label}
          </Text>
        )}
        <TouchableOpacity
          onPress={handleIOSPress}
          activeOpacity={0.7}
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row justify-between items-center"
        >
          <Text className="text-gray-900 font-medium text-base">
            {currentLabel}
          </Text>
          <Text className="text-blue-500 text-xs">▼</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className={containerClassName}>
      {label && (
        <Text className="text-sm font-semibold text-gray-700 mb-2">
          {label}
        </Text>
      )}
      <View className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
        <Picker
          selectedValue={selectedSource.id}
          onValueChange={(itemValue) => {
            const selected = sources.find(s => s.id === itemValue);
            if (selected) onSourceChange(selected);
          }}
          style={styles.androidPicker}
          dropdownIconColor="#3B82F6"
        >
          {sources.map((source) => (
            <Picker.Item
              key={source.id || 'global'}
              label={source.id === null ? `🌍 ${globalLabel}` : `👥 ${source.name}`}
              value={source.id}
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
  }
});
