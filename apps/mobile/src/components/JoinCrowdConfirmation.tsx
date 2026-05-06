import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { PrimaryButton, QuietButton } from './Buttons';
import { LockIcon, OpenLinesIcon } from './icons';
import { formatTimeRemaining } from '@/utils/formatters';

export interface ConfirmationCrowd {
  name: string;
  isOpen: boolean;
  memberCount: number;
  expiresAt: Date;
}

interface JoinCrowdConfirmationProps {
  crowd: ConfirmationCrowd | null;
  joining: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Pre-join confirmation. Shown after a successful proximity-token *lookup*
// (read-only, doesn't consume the token), so the user can see the crowd's
// identity and decide whether to actually join. On Confirm the parent calls
// the consume endpoint; on Cancel nothing is written and the token remains
// usable until it expires.
export const JoinCrowdConfirmation: React.FC<JoinCrowdConfirmationProps> = ({
  crowd,
  joining,
  onConfirm,
  onCancel,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const emberHex = isDark ? '#D08454' : '#B85A2C';
  const dust2Hex = isDark ? '#5A554B' : '#A09B91';

  return (
    <Modal visible={!!crowd} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        className="flex-1 justify-center px-screen-x"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        onPress={onCancel}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-paper dark:bg-paper-d rounded-md"
          style={{ padding: 22 }}
        >
          <Text
            className="font-serif text-title text-ink dark:text-ink-d"
            style={{ marginBottom: 16 }}
          >
            Join {crowd?.name ?? 'crowd'}?
          </Text>

          {crowd && (
            <View
              className="flex-row items-center"
              style={{ gap: 10, marginBottom: 22, flexWrap: 'wrap' }}
            >
              <View
                className="flex-row items-center"
                style={{ gap: 4 }}
              >
                {crowd.isOpen
                  ? <OpenLinesIcon size={12} color={emberHex} />
                  : <LockIcon size={12} color={dust2Hex} />}
                <Text
                  className={
                    crowd.isOpen
                      ? 'font-sans-medium text-ember dark:text-ember-d'
                      : 'font-sans-medium text-dust-2 dark:text-dust-2-d'
                  }
                  style={{ fontSize: 12 }}
                >
                  {crowd.isOpen ? 'Open' : 'Private'}
                </Text>
              </View>
              <Text className="font-sans text-meta text-dust dark:text-dust-d">·</Text>
              <Text className="font-sans text-meta text-dust dark:text-dust-d">
                {crowd.memberCount} {crowd.memberCount === 1 ? 'member' : 'members'}
              </Text>
              <Text className="font-sans text-meta text-dust dark:text-dust-d">·</Text>
              <Text className="font-sans text-meta text-dust dark:text-dust-d">
                {formatTimeRemaining(crowd.expiresAt)}
              </Text>
            </View>
          )}

          <View className="flex-row" style={{ gap: 10 }}>
            <View className="flex-1">
              <QuietButton label="Cancel" onPress={onCancel} disabled={joining} />
            </View>
            <View className="flex-1" style={{ opacity: joining ? 0.5 : 1 }}>
              <PrimaryButton
                label={joining ? 'Joining…' : 'Join'}
                onPress={onConfirm}
                disabled={joining}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
