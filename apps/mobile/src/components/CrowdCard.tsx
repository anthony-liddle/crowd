import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import Toast from 'react-native-toast-message';
import { Crowd } from '@/types';
import { formatTimeRemaining, getCrowdUrgency, CrowdUrgency } from '@/utils/formatters';
import { QuietButton } from './Buttons';
import { LockIcon, OpenLinesIcon } from './icons';
import { PrivateInviteSheet } from './PrivateInviteSheet';

interface CrowdCardProps {
  crowd: Crowd;
  onLeave: (crowd: Crowd) => void;
  onRefresh: () => void;
}

export const CrowdCard: React.FC<CrowdCardProps> = ({ crowd, onLeave }) => {
  const urgency = getCrowdUrgency(crowd.expiresAt);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const emberHex = isDark ? '#D08454' : '#B85A2C';
  const dust2Hex = isDark ? '#5A554B' : '#A09B91';
  const expiringBg = isDark ? 'rgba(208, 132, 84, 0.18)' : 'rgba(184, 90, 44, 0.12)';

  const [privateInviteVisible, setPrivateInviteVisible] = useState(false);

  // Open crowds use the iOS share sheet — the link is meant to travel
  // anywhere. Private crowds open a QR-only modal because their privacy
  // model requires physical proximity; a shareable link would defeat it.
  const handleInvite = async () => {
    if (!crowd.isOpen) {
      setPrivateInviteVisible(true);
      return;
    }
    const inviteLink = `crowd://join/${crowd.id}`;
    try {
      // iMessage on iOS renders `url` as a separate message component,
      // producing two messages. Embedding the link in `message` gives a
      // single tappable message.
      await Share.share({
        message: `Join my crowd "${crowd.name}": ${inviteLink}`,
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to share invite' });
    }
  };

  // Owned crowds carry a subtle background tint to set them apart from joined
  // crowds at a glance. Expiring-soon crowds get an ember border that overrides
  // the standard rule border.
  const cardBg = crowd.isOwner
    ? 'bg-paper-tint dark:bg-paper-tint-d'
    : 'bg-paper-2 dark:bg-paper-2-d';
  const cardBorder = urgency !== 'normal'
    ? 'border border-ember dark:border-ember-d'
    : 'border border-rule dark:border-rule-d';

  return (
    <View
      className={`${cardBg} ${cardBorder} rounded-md mx-screen-x mb-3`}
      style={{ padding: 14 }}
    >
      <View
        className="flex-row items-center"
        style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}
      >
        <Text
          className="font-sans-medium text-ink dark:text-ink-d"
          style={{ fontSize: 16 }}
        >
          {crowd.name}
        </Text>
        {crowd.isOpen ? <OpenBadge emberHex={emberHex} /> : <PrivateBadge dust2Hex={dust2Hex} />}
        {urgency !== 'normal' && <ExpiringSoonBadge bg={expiringBg} />}
      </View>

      <View
        className="flex-row items-center"
        style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap' }}
      >
        <Text className="font-sans text-meta text-dust dark:text-dust-d">
          {crowd.memberCount} {crowd.memberCount === 1 ? 'member' : 'members'}
        </Text>
        <Text className="font-sans text-meta text-dust dark:text-dust-d">·</Text>
        <Text className={timeClassName(urgency)} style={{ fontSize: 11, lineHeight: 14 }}>
          {formatTimeRemaining(crowd.expiresAt)}
        </Text>
        {crowd.isOwner && (
          <>
            <Text className="font-sans text-meta text-dust-2 dark:text-dust-2-d">·</Text>
            <Text
              className="font-serif-italic text-dust-2 dark:text-dust-2-d"
              style={{ fontSize: 11, lineHeight: 14 }}
            >
              Started by you
            </Text>
          </>
        )}
      </View>

      <View className="flex-row" style={{ gap: 8 }}>
        {crowd.canInvite && (
          <View className="flex-1">
            <QuietButton label="Invite" onPress={handleInvite} />
          </View>
        )}
        <View className="flex-1">
          <QuietButton label="Leave" onPress={() => onLeave(crowd)} />
        </View>
      </View>
      {!crowd.isOpen && (
        <PrivateInviteSheet
          visible={privateInviteVisible}
          crowdId={crowd.id}
          crowdName={crowd.name}
          onClose={() => setPrivateInviteVisible(false)}
        />
      )}
    </View>
  );
};

const timeClassName = (urgency: CrowdUrgency): string => {
  if (urgency === 'acute') return 'font-sans-medium text-ember-warn dark:text-ember-warn-d';
  if (urgency === 'soon') return 'font-sans-medium text-ember dark:text-ember-d';
  return 'font-sans text-dust dark:text-dust-d';
};

const OpenBadge: React.FC<{ emberHex: string }> = ({ emberHex }) => (
  <View
    className="flex-row items-center border border-ember dark:border-ember-d rounded-sm"
    style={{ paddingHorizontal: 6, paddingVertical: 1, gap: 4 }}
  >
    <OpenLinesIcon size={10} color={emberHex} />
    <Text
      className="font-sans-medium text-ember dark:text-ember-d"
      style={{ fontSize: 10 }}
    >
      Open
    </Text>
  </View>
);

const PrivateBadge: React.FC<{ dust2Hex: string }> = ({ dust2Hex }) => (
  <View
    className="flex-row items-center border border-dust-2 dark:border-dust-2-d rounded-sm"
    style={{ paddingHorizontal: 6, paddingVertical: 1, gap: 4 }}
  >
    <LockIcon size={10} color={dust2Hex} />
    <Text
      className="font-sans-medium text-dust-2 dark:text-dust-2-d"
      style={{ fontSize: 10 }}
    >
      Private
    </Text>
  </View>
);

const ExpiringSoonBadge: React.FC<{ bg: string }> = ({ bg }) => (
  <View
    style={{
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 6,
      backgroundColor: bg,
    }}
  >
    <Text
      className="font-sans-medium text-ember dark:text-ember-d"
      style={{ fontSize: 10 }}
    >
      Expiring soon
    </Text>
  </View>
);
