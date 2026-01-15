import React from 'react';
import { View, Text, TouchableOpacity, Share } from 'react-native';
import { Crowd } from '@/types';
import { formatTimeRemaining } from '@/utils/formatters';
import Toast from 'react-native-toast-message';

interface CrowdCardProps {
  crowd: Crowd;
  onLeave: (crowd: Crowd) => void;
  onRefresh: () => void;
}

/**
 * CrowdCard Component
 * Displays an individual crowd with its status and actions
 */
export const CrowdCard: React.FC<CrowdCardProps> = ({ crowd, onLeave }) => {
  const handleShareInvite = async () => {
    const inviteLink = `crowd://join/${crowd.id}`;
    try {
      await Share.share({
        message: `Join my crowd "${crowd.name}"! Use this code: ${inviteLink}`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to share invite',
      });
    }
  };

  return (
    <View className="bg-white rounded-lg p-4 mx-2 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-semibold text-gray-800">{crowd.name}</Text>
            {crowd.isOwner && (
              <View className="bg-blue-100 px-2 py-0.5 rounded">
                <Text className="text-blue-600 text-xs font-medium">Owner</Text>
              </View>
            )}
            <View className={`px-2 py-0.5 rounded ${crowd.isOpen ? 'bg-green-100' : 'bg-orange-100'}`}>
              <Text className={`text-xs font-medium ${crowd.isOpen ? 'text-green-600' : 'text-orange-600'}`}>
                {crowd.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-row items-center gap-4 mb-3">
        <View className="flex-row items-center gap-1">
          <Text className="text-gray-500">👤</Text>
          <Text className="text-gray-600 text-sm">{crowd.memberCount} members</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-gray-500">⏰</Text>
          <Text className="text-gray-600 text-sm">{formatTimeRemaining(crowd.expiresAt)}</Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        {crowd.canInvite && (
          <TouchableOpacity
            onPress={handleShareInvite}
            className="flex-1 bg-blue-50 border border-blue-200 rounded-lg py-2 items-center"
          >
            <Text className="text-blue-600 font-medium text-sm">Invite</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onLeave(crowd)}
          className="flex-1 bg-red-50 border border-red-200 rounded-lg py-2 items-center"
        >
          <Text className="text-red-600 font-medium text-sm">Leave</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
