import React from "react";
import { Text, View } from "react-native";

/**
 * EmptyList Component
 * Displays a message when there are no messages
 */

export const EmptyList: React.FC = () => {
  return (
    <View className="flex-1 justify-center items-center bg-gray-50 px-4 mt-5">
      <Text className="text-xl font-semibold text-gray-900 mb-2">
        No messages yet
      </Text>
      <Text className="text-gray-600 text-center">
        Pull down to refresh or create your first message!
      </Text>
    </View>
  );
}