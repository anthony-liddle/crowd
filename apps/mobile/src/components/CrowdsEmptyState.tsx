import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface CrowdsEmptyStateProps {
  onCreatePress: () => void;
  onJoinPress: () => void;
}

/**
 * CrowdsEmptyState Component
 * Empty state UI for when the user has no crowds
 */
export const CrowdsEmptyState: React.FC<CrowdsEmptyStateProps> = ({
  onCreatePress,
  onJoinPress
}) => {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-6xl mb-4">👥</Text>
      <Text className="text-xl font-bold text-gray-800 mb-2 text-center">
        No Crowds Yet
      </Text>
      <Text className="text-gray-500 text-center mb-6">
        Create a crowd to start sharing messages with a group, or join an existing one!
      </Text>
      <View className="w-full gap-3">
        <TouchableOpacity
          onPress={onCreatePress}
          className="bg-blue-600 rounded-lg p-4 items-center"
        >
          <Text className="text-white font-semibold text-base">Create a Crowd</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onJoinPress}
          className="bg-white border border-blue-600 rounded-lg p-4 items-center"
        >
          <Text className="text-blue-600 font-semibold text-base">Join a Crowd</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
