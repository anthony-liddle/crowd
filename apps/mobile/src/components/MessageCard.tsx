import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Message } from '@/types/message';
import { formatTimestamp, formatDistance, formatTimeLeft } from '@/utils/formatters';
import { Location } from '@/types/location';

/**
 * MessageCard Component
 * Displays a single message with all its details
 */

interface MessageCardProps {
  message: Message;
  onBoost?: (message: Message, location: Location) => Promise<void>;
  userLocation?: Location;
}

export const MessageCard: React.FC<MessageCardProps> = ({ message, onBoost, userLocation }) => {
  const backgroundColor = message.isOwner ? "bg-blue-50" : message.isBoosted ? "bg-purple-50" : "bg-white";
  const borderColor = message.isOwner ? "border-blue-200" : message.isBoosted ? "border-purple-200" : "border-transparent";

  const canBoost = !message.isOwner && !message.isBoosted && onBoost;

  return (
    <View className={`${backgroundColor} border ${borderColor} p-3 mb-3 shadow-sm rounded-lg`}>
      {/* Message Text */}
      <Text className="text-base text-gray-900 mb-3 leading-6">
        {message.text}
      </Text>

      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center space-x-4">
          {/* Timestamp */}
          <Text className="text-xs text-gray-500 mr-3">
            {formatTimestamp(message.timestamp)}
          </Text>

          {/* Distance */}
          <Text className="text-xs text-gray-500 mr-3">
            📍 {formatDistance(message.activeDistance)}
          </Text>

          {/* Boost Count */}
          <Text className="text-xs text-gray-500">
            🚀 {message.boostCount || 0}
          </Text>
        </View>

        <View className="flex-row items-center space-x-2">
          {/* Boost Button */}
          {canBoost && (
            <TouchableOpacity
              onPress={() => userLocation && onBoost && onBoost(message, userLocation)}
              className="bg-purple-100 px-3 py-1 rounded-full mr-2"
            >
              <Text className="text-xs font-semibold text-purple-700">Boost</Text>
            </TouchableOpacity>
          )}

          {/* Time Left */}
          <View className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
            <Text className="text-xs font-semibold text-gray-600">
              {formatTimeLeft(message.timeLeft)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

