import React from 'react';
import { Text, View } from 'react-native';
import { Ring } from './Ring';
import { RelayButton } from './RelayButton';
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
  onShowRelaySheet: (message: Message) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  message,
  now,
  onShowRelaySheet,
}) => {
  const { fractionRemaining, minutesRemaining } = getRingState(message, now);
  const ringLabel = formatRingLabel(minutesRemaining);
  const distanceLabel = formatDistance(message.activeDistance);
  const ageLabel = formatTimestamp(message.timestamp);

  return (
    <View className="px-screen-x py-post-y border-b border-rule dark:border-rule-d">
      <View className="flex-row" style={{ gap: 12 }}>
        <View className="flex-1">
          <Text className="font-serif text-post text-ink dark:text-ink-d mb-2">
            {message.text}
          </Text>
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <Text className="font-sans text-meta text-dust dark:text-dust-d">
              {distanceLabel}
            </Text>
            <Text className="font-sans text-meta text-dust dark:text-dust-d">
              {ageLabel}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Ring
            fractionRemaining={fractionRemaining}
            minutesRemaining={minutesRemaining}
            label={ringLabel}
          />
          <RelayButton
            count={message.boostCount ?? 0}
            isBoosted={!!message.isBoosted}
            isOwner={!!message.isOwner}
            onPress={() => onShowRelaySheet(message)}
          />
        </View>
      </View>
    </View>
  );
};
