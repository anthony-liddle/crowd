import React, { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import Toast from 'react-native-toast-message';
import { joinCrowd } from '@/services/api';
import { PrimaryButton, QuietButton } from './Buttons';

interface JoinCrowdModalProps {
  visible: boolean;
  onClose: () => void;
  onJoined: () => void;
}

const COLORS = {
  light: { ember: '#B85A2C', dust2: '#A09B91' },
  dark: { ember: '#D08454', dust2: '#5A554B' },
};

export const JoinCrowdModal: React.FC<JoinCrowdModalProps> = ({
  visible,
  onClose,
  onJoined,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? COLORS.dark : COLORS.light;

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

    let crowdId = joinCode.trim();
    if (crowdId.includes('crowd://join/')) {
      crowdId = crowdId.replace('crowd://join/', '');
    }

    setJoining(true);
    try {
      await joinCrowd(crowdId);
      Toast.show({
        type: 'success',
        text1: 'Joined',
        text2: 'You have joined the crowd.',
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
            Join a crowd
          </Text>

          <Text className="font-sans text-meta text-dust dark:text-dust-d mb-2">
            Invite code
          </Text>
          <TextInput
            className="bg-paper-2 dark:bg-paper-2-d border border-rule dark:border-rule-d rounded-md font-sans text-ink dark:text-ink-d"
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 12,
              fontSize: 15,
            }}
            placeholder="Paste invite code or link"
            placeholderTextColor={c.dust2}
            selectionColor={c.ember}
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text
            className="font-sans text-meta text-dust dark:text-dust-d"
            style={{ marginBottom: 12, textAlign: 'center' }}
          >
            Or use a QR code or NFC tap to join instantly.
          </Text>

          <View className="flex-row" style={{ gap: 10, marginBottom: 16 }}>
            <View className="flex-1">
              <QuietButton
                label="Scan QR"
                onPress={() =>
                  Toast.show({
                    type: 'info',
                    text1: 'Coming soon',
                    text2: 'QR scanning is on the roadmap.',
                  })
                }
              />
            </View>
            <View className="flex-1">
              <QuietButton
                label="Tap NFC"
                onPress={() =>
                  Toast.show({
                    type: 'info',
                    text1: 'Coming soon',
                    text2: 'NFC join is on the roadmap.',
                  })
                }
              />
            </View>
          </View>

          <View className="flex-row" style={{ gap: 10 }}>
            <View className="flex-1">
              <QuietButton label="Cancel" onPress={onClose} />
            </View>
            <View className="flex-1" style={{ opacity: joining ? 0.5 : 1 }}>
              <PrimaryButton
                label={joining ? 'Joining…' : 'Join'}
                onPress={handleJoin}
                disabled={joining}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
