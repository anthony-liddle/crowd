import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity } from 'react-native';
import { joinCrowd } from '@/services/api';
import Toast from 'react-native-toast-message';

interface JoinCrowdModalProps {
  visible: boolean;
  onClose: () => void;
  onJoined: () => void;
}

/**
 * JoinCrowdModal Component
 * Modal for joining a crowd via invite code
 */
export const JoinCrowdModal: React.FC<JoinCrowdModalProps> = ({
  visible,
  onClose,
  onJoined
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter an invite code',
      });
      return;
    }

    // Extract crowd ID from invite code (format: crowd://join/{crowdId} or just {crowdId})
    let crowdId = joinCode.trim();
    if (crowdId.includes('crowd://join/')) {
      crowdId = crowdId.replace('crowd://join/', '');
    }

    setJoining(true);
    try {
      await joinCrowd(crowdId);
      Toast.show({
        type: 'success',
        text1: 'Joined!',
        text2: 'You have joined the crowd',
      });
      setJoinCode('');
      onJoined();
      onClose();
    } catch (error: any) {
      const message = error.message?.includes('closed')
        ? 'This crowd is closed to new members'
        : error.message?.includes('Already')
          ? 'You are already a member'
          : 'Failed to join crowd';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: message,
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6">
          <Text className="text-xl font-bold text-gray-800 mb-4">Join a Crowd</Text>

          <Text className="text-sm font-semibold text-gray-700 mb-2">Invite Code</Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-base text-gray-900 mb-4"
            placeholder="Paste invite code or link"
            placeholderTextColor="#9CA3AF"
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text className="text-xs text-gray-500 text-center mb-4">
            Or use QR code / NFC to join instantly
          </Text>

          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              className="flex-1 bg-gray-100 border border-gray-300 rounded-lg py-3 items-center"
              onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'QR Scanner will be available soon' })}
            >
              <Text className="text-gray-700">📷 Scan QR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-gray-100 border border-gray-300 rounded-lg py-3 items-center"
              onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'NFC tap will be available soon' })}
            >
              <Text className="text-gray-700">📱 Tap NFC</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-gray-200 rounded-lg py-4 items-center"
            >
              <Text className="text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleJoin}
              disabled={joining}
              className={`flex-1 bg-blue-600 rounded-lg py-4 items-center ${joining ? 'opacity-50' : ''}`}
            >
              <Text className="text-white font-semibold">
                {joining ? 'Joining...' : 'Join'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
