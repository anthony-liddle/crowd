import React from 'react';
import { View, Text } from 'react-native';

/**
 * CharacterCounter Component
 * Displays the current character count and limit
 */

interface CharacterCounterProps {
  current: number;
  limit: number;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({ current, limit }) => {
  const isNearLimit = current > limit * 0.8;
  const isOverLimit = current > limit;

  return (
    <View className="flex-row justify-end items-center">
      <Text
        className={`text-xs ${isOverLimit
            ? 'text-red-500 font-semibold'
            : isNearLimit
              ? 'text-orange-500'
              : 'text-gray-500'
          }`}
      >
        {current}/{limit}
      </Text>
    </View>
  );
};

