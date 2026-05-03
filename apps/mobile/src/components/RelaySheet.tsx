import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useRelaySettings } from '@/hooks/useRelaySettings';
import { PrimaryButton, QuietButton } from './Buttons';

interface RelaySheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RelaySheet({ visible, onClose, onConfirm }: RelaySheetProps) {
  const { confirmDontAskAgain } = useRelaySettings();
  const [dontAskAgain, setDontAskAgain] = useState(true);

  const handleRelay = async () => {
    if (dontAskAgain) await confirmDontAskAgain();
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
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
            className="font-serif text-ink dark:text-ink-d mb-2"
            style={{ fontSize: 18 }}
          >
            Relay this post?
          </Text>
          <Text
            className="font-sans text-ink-2 dark:text-ink-2-d mb-4"
            style={{ fontSize: 13, lineHeight: 20 }}
          >
            It&rsquo;ll be visible to people near you for the rest of its lifespan.
            The original radius doesn&rsquo;t change; you&rsquo;re just adding a new
            point it can reach from.
          </Text>
          <Pressable
            onPress={() => setDontAskAgain(!dontAskAgain)}
            className="flex-row items-center mb-4"
            style={{ gap: 10 }}
          >
            <View
              className={
                dontAskAgain
                  ? 'bg-ember dark:bg-ember-d border-ember dark:border-ember-d'
                  : 'border-rule dark:border-rule-d'
              }
              style={{
                width: 16,
                height: 16,
                borderWidth: 1.5,
                borderRadius: 3,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {dontAskAgain && (
                <Text
                  className="text-on-ember dark:text-on-ember-d"
                  style={{ fontSize: 10, fontWeight: '600', lineHeight: 12 }}
                >
                  ✓
                </Text>
              )}
            </View>
            <Text
              className="font-sans text-dust dark:text-dust-d"
              style={{ fontSize: 12 }}
            >
              Don&rsquo;t ask again. Use long-press to relay.
            </Text>
          </Pressable>
          <View className="flex-row" style={{ gap: 10 }}>
            <View className="flex-1">
              <QuietButton label="Cancel" onPress={onClose} />
            </View>
            <View className="flex-1">
              <PrimaryButton label="Relay" onPress={handleRelay} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
