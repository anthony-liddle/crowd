import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { createCrowd } from '@/services/api';
import Toast from 'react-native-toast-message';
import { PrimaryButton, QuietButton } from './Buttons';

interface CreateCrowdModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const COLORS = {
  light: { rule: '#E0DAC9', ember: '#B85A2C', paper2: '#EFE9DA', dust2: '#A09B91' },
  dark: { rule: '#2A2724', ember: '#D08454', paper2: '#1B1A15', dust2: '#5A554B' },
};

export const CreateCrowdModal: React.FC<CreateCrowdModalProps> = ({
  visible,
  onClose,
  onCreated,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? COLORS.dark : COLORS.light;

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
        text1: 'Crowd created',
        text2: 'Your crowd is active for 24 hours.',
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-paper dark:bg-paper-d rounded-t-[20px] px-screen-x pt-5 pb-7"
        >
          <View className="self-center w-9 h-1 bg-rule dark:bg-rule-d rounded-full mb-4" />
          <Text
            className="font-serif text-ink dark:text-ink-d mb-3"
            style={{ fontSize: 18 }}
          >
            Start a crowd
          </Text>

          <Text className="font-sans text-meta text-dust dark:text-dust-d mb-2">
            Crowd name
          </Text>
          <TextInput
            className="bg-paper-2 dark:bg-paper-2-d border border-rule dark:border-rule-d rounded-md font-sans text-ink dark:text-ink-d"
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 16,
              fontSize: 15,
            }}
            placeholder="Name your crowd"
            placeholderTextColor={c.dust2}
            selectionColor={c.ember}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <View
            className="flex-row items-center justify-between"
            style={{ marginBottom: 24 }}
          >
            <View className="flex-1 pr-4">
              <Text
                className="font-sans-medium text-ink dark:text-ink-d"
                style={{ fontSize: 13 }}
              >
                Open crowd
              </Text>
              <Text
                className="font-sans text-dust dark:text-dust-d"
                style={{ fontSize: 12, marginTop: 2 }}
              >
                {isOpen ? 'Anyone with the code can join' : 'Only you can add members'}
              </Text>
            </View>
            <Switch
              value={isOpen}
              onValueChange={setIsOpen}
              trackColor={{ false: c.rule, true: c.ember }}
              thumbColor={c.paper2}
              ios_backgroundColor={c.rule}
            />
          </View>

          <View className="flex-row" style={{ gap: 10 }}>
            <View className="flex-1">
              <QuietButton label="Cancel" onPress={onClose} />
            </View>
            <View className="flex-1" style={{ opacity: creating ? 0.5 : 1 }}>
              <PrimaryButton
                label={creating ? 'Creating…' : 'Create'}
                onPress={handleCreate}
                disabled={creating}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
