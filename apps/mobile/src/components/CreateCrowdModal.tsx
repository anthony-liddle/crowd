import React, { useState } from 'react';
import { View, Text, Modal, TextInput, Switch, TouchableOpacity } from 'react-native';
import { createCrowd } from '@/services/api';
import Toast from 'react-native-toast-message';

interface CreateCrowdModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * CreateCrowdModal Component
 * Modal for creating a new crowd
 */
export const CreateCrowdModal: React.FC<CreateCrowdModalProps> = ({
  visible,
  onClose,
  onCreated
}) => {
  const [name, setName] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a crowd name',
      });
      return;
    }

    setCreating(true);
    try {
      await createCrowd({ name: name.trim(), isOpen });
      Toast.show({
        type: 'success',
        text1: 'Crowd Created!',
        text2: 'Your crowd is now active for 24 hours',
      });
      setName('');
      setIsOpen(true);
      onCreated();
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create crowd',
      });
    } finally {
      setCreating(false);
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
          <Text className="text-xl font-bold text-gray-800 mb-4">Create a Crowd</Text>

          <Text className="text-sm font-semibold text-gray-700 mb-2">Crowd Name</Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-base text-gray-900 mb-4"
            placeholder="Enter crowd name"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-sm font-semibold text-gray-700">Open Crowd</Text>
              <Text className="text-xs text-gray-500">
                {isOpen ? 'Anyone with the link can join' : 'Only you can add members'}
              </Text>
            </View>
            <Switch
              value={isOpen}
              onValueChange={setIsOpen}
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={isOpen ? '#3B82F6' : '#9CA3AF'}
            />
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-gray-200 rounded-lg py-4 items-center"
            >
              <Text className="text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={creating}
              className={`flex-1 bg-blue-600 rounded-lg py-4 items-center ${creating ? 'opacity-50' : ''}`}
            >
              <Text className="text-white font-semibold">
                {creating ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
