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
  // True while this post's relay mutation is in flight; dims and disables the
  // chip. Owned by FeedScreen, which tracks pending relays per message id.
  relayPending?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  message,
  now,
  onShowRelaySheet,
  relayPending = false,
}) => {
  const { fractionRemaining, minutesRemaining } = getRingState(message, now);
  const ringLabel = formatRingLabel(minutesRemaining);
  const distanceLabel = formatDistance(message.activeDistance);
  const ageLabel = formatTimestamp(message.timestamp);
  const isOwn = !!message.isOwner;
  const boostCount = message.boostCount ?? 0;

  return (
    <View className="px-screen-x py-post-y border-b border-rule dark:border-rule-d">
      <View className="flex-row" style={{ gap: 12 }}>
        {/* Content column drives card height: text + the bottom metadata row. */}
        <View className="flex-1">
          <Text className="font-serif text-post text-ink dark:text-ink-d mb-2">
            {message.text}
          </Text>
          {/* `marginTop: auto` pins the metadata to the bottom of the content
              column. It's a no-op while content drives height (content > Ring),
              and bottom-aligns the row if the Ring ever out-heights the text. */}
          <View
            className="flex-row items-center"
            style={{ gap: 10, marginTop: 'auto' }}
          >
            <Text className="font-sans text-meta text-dust dark:text-dust-d">
              {distanceLabel}
            </Text>
            <Text className="font-sans text-meta text-dust dark:text-dust-d">
              {ageLabel}
            </Text>
            {isOwn ? (
              // Own post: a plain dust-colored relay count, no chip — there's
              // nothing to relay on your own post. Hidden entirely at zero.
              boostCount > 0 && (
                <Text className="font-sans text-meta text-dust dark:text-dust-d">
                  {boostCount} {boostCount === 1 ? 'relay' : 'relays'}
                </Text>
              )
            ) : (
              <RelayButton
                count={boostCount}
                isBoosted={!!message.isBoosted}
                isOwner={false}
                loading={relayPending}
                onPress={() => onShowRelaySheet(message)}
              />
            )}
          </View>
        </View>
        {/* Right column: the Ring alone, top-pinned to the content. */}
        <View>
          <Ring
            fractionRemaining={fractionRemaining}
            minutesRemaining={minutesRemaining}
            label={ringLabel}
          />
        </View>
      </View>
    </View>
  );
};
