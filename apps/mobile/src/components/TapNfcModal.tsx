import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { QuietButton } from './Buttons';
import { TwoPhonesIcon } from './icons';

interface TapNfcModalProps {
  visible: boolean;
  onClose: () => void;
}

// Honest "coming soon" surface. NFC reading on iOS requires a custom dev
// client / EAS build because react-native-nfc-manager is a non-Expo native
// module — this is out of scope for the design pass. We surface the reason
// explicitly rather than the previous toast that just said "Coming soon".
export const TapNfcModal: React.FC<TapNfcModalProps> = ({ visible, onClose }) => {
  const { colorScheme } = useColorScheme();
  const dust2Hex = colorScheme === 'dark' ? '#5A554B' : '#A09B91';

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
            className="font-serif text-title text-ink dark:text-ink-d"
            style={{ marginBottom: 12 }}
          >
            Tap NFC to join
          </Text>
          <Text
            className="font-sans text-body text-dust dark:text-dust-d"
            style={{ marginBottom: 24 }}
          >
            NFC isn't available yet. For now, use Scan QR or paste an invite code.
          </Text>

          <View className="items-center" style={{ marginBottom: 28 }}>
            <TwoPhonesIcon size={96} color={dust2Hex} />
          </View>

          <QuietButton label="Got it" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};
