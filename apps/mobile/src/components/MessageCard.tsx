import React from 'react';
import { View, Text } from 'react-native';
import { Message } from '@/types/message';
import { formatTimestamp, formatDistance, formatTimeLeft } from '@/utils/formatters';

/**
 * MessageCard Component
 * Displays a single message with all its details
 */
interface MessageCardProps {
  message: Message;
}

export const MessageCard: React.FC<MessageCardProps> = ({ message }) => {
  return (
    <View className="bg-white p-4 mb-3 shadow-xs ">
      {/* Message Text */}
      <Text className="text-base text-gray-900 mb-3 leading-6">
        {message.text}
      </Text>

      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center space-x-4">
          {/* Timestamp */}
          <View className="flex-row items-center">
            <Text className="text-xs text-gray-500">
              {formatTimestamp(message.timestamp)}
            </Text>
          </View>

          {/* Distance */}
          <View className="flex-row items-center">
            <Text className="text-xs text-gray-500">
              📍 {formatDistance(message.activeDistance)}
            </Text>
          </View>
        </View>

        {/* Time Left */}
        <View className="bg-blue-50 px-2 py-1 rounded">
          <Text className="text-xs font-semibold text-blue-600">
            {formatTimeLeft(message.timeLeft)} left
          </Text>
        </View>
      </View>
    </View>
  );
};

