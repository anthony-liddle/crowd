import { View, Text, TouchableOpacity } from 'react-native';

/**
 * SortFeed Component
 * Displays a sort feed with nearest and soonest options
 */

interface SortFeedProps {
  sortBy: 'nearest' | 'soonest';
  setSortBy: (sortBy: 'nearest' | 'soonest') => void;
}

export const SortFeed: React.FC<SortFeedProps> = ({ sortBy, setSortBy }) => {
  return (
    <View className="flex-row px-4 py-2 space-x-2 bg-gray-100 border-b border-gray-200">
      <TouchableOpacity
        onPress={() => setSortBy('nearest')}
        className={`px-4 py-1 rounded-full border ${sortBy === 'nearest' ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
      >
        <Text className={`text-sm font-medium ${sortBy === 'nearest' ? 'text-white' : 'text-gray-600'}`}>Nearest</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setSortBy('soonest')}
        className={`px-4 py-1 rounded-full border ${sortBy === 'soonest' ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
      >
        <Text className={`text-sm font-medium ${sortBy === 'soonest' ? 'text-white' : 'text-gray-600'}`}>Expiring Soon</Text>
      </TouchableOpacity>
    </View>
  );
};
