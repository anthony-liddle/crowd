import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ring } from './Ring';
import { RelayControl } from './RelayControl';
import { Message } from '@/types';
import {
  formatDistance,
  formatTimestamp,
  formatRingLabel,
  getRingState,
} from '@/utils/formatters';

interface PostCardProps {
  message: Message;
  now: number;
  onRelay: (message: Message) => void;
  onShowRelaySheet: (message: Message) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  message,
  now,
  onRelay,
  onShowRelaySheet,
}) => {
  const { fractionRemaining, minutesRemaining } = getRingState(message, now);
  const ringLabel = formatRingLabel(minutesRemaining);
  const distanceLabel = formatDistance(message.activeDistance);
  const ageLabel = formatTimestamp(message.timestamp);
  const canRelay = !message.isOwner && !message.isBoosted;

  return (
    <Pressable className="px-screen-x py-post-y border-b border-rule dark:border-rule-d">
      <View className="flex-row" style={{ gap: 12 }}>
        <View className="flex-1">
          <Text className="font-serif text-post text-ink dark:text-ink-d mb-2">
            {message.text}
          </Text>
          <View className="flex-row items-center" style={{ gap: 14 }}>
            <Text className="font-sans text-meta text-dust dark:text-dust-d">
              {distanceLabel}
            </Text>
            <RelayControl
              count={message.boostCount ?? 0}
              onRelay={() => {
                if (canRelay) onRelay(message);
              }}
              onShowSheet={() => {
                if (canRelay) onShowRelaySheet(message);
              }}
            />
            <Text className="font-sans text-meta text-dust dark:text-dust-d">
              {ageLabel}
            </Text>
          </View>
        </View>
        <Ring
          fractionRemaining={fractionRemaining}
          minutesRemaining={minutesRemaining}
          label={ringLabel}
        />
      </View>
    </Pressable>
  );
};
