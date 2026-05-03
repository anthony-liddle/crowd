import React from 'react';
import { Share, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { Crowd } from '@/types';
import { formatTimeRemaining } from '@/utils/formatters';
import { QuietButton } from './Buttons';

interface CrowdCardProps {
  crowd: Crowd;
  onLeave: (crowd: Crowd) => void;
  onRefresh: () => void;
}

export const CrowdCard: React.FC<CrowdCardProps> = ({ crowd, onLeave }) => {
  const handleShareInvite = async () => {
    const inviteLink = `crowd://join/${crowd.id}`;
    try {
      await Share.share({
        message: `Join my crowd "${crowd.name}"! Use this code: ${inviteLink}`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to share invite',
      });
    }
  };

  return (
    <View
      className="bg-paper-2 dark:bg-paper-2-d border border-rule dark:border-rule-d rounded-md mx-screen-x mb-3"
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
        {crowd.isOwner && <Pill label="Owner" tone="ember" />}
        <Pill label={crowd.isOpen ? 'Open' : 'Closed'} tone={crowd.isOpen ? 'ember' : 'dust'} />
      </View>

      <View className="flex-row" style={{ gap: 16, marginBottom: 12 }}>
        <Text className="font-sans text-meta text-dust dark:text-dust-d">
          {crowd.memberCount} members
        </Text>
        <Text className="font-sans text-meta text-dust dark:text-dust-d">
          {formatTimeRemaining(crowd.expiresAt)}
        </Text>
      </View>

      <View className="flex-row" style={{ gap: 8 }}>
        {crowd.canInvite && (
          <View className="flex-1">
            <QuietButton label="Invite" onPress={handleShareInvite} />
          </View>
        )}
        <View className="flex-1">
          <QuietButton label="Leave" onPress={() => onLeave(crowd)} />
        </View>
      </View>
    </View>
  );
};

interface PillProps {
  label: string;
  tone: 'ember' | 'dust';
}

const Pill: React.FC<PillProps> = ({ label, tone }) => (
  <View
    className={
      tone === 'ember'
        ? 'border border-ember dark:border-ember-d rounded-sm'
        : 'border border-rule dark:border-rule-d rounded-sm'
    }
    style={{ paddingHorizontal: 6, paddingVertical: 1 }}
  >
    <Text
      className={
        tone === 'ember'
          ? 'font-sans-medium text-ember dark:text-ember-d'
          : 'font-sans text-dust dark:text-dust-d'
      }
      style={{ fontSize: 10 }}
    >
      {label}
    </Text>
  </View>
);
