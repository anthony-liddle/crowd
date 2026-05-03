import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface SortFeedProps {
  sortBy: 'nearest' | 'soonest';
  setSortBy: (sortBy: 'nearest' | 'soonest') => void;
}

export const SortFeed: React.FC<SortFeedProps> = ({ sortBy, setSortBy }) => (
  <View className="flex-row px-screen-x" style={{ gap: 18 }}>
    <SortTab
      label="Nearest"
      active={sortBy === 'nearest'}
      onPress={() => setSortBy('nearest')}
    />
    <SortTab
      label="Expiring soon"
      active={sortBy === 'soonest'}
      onPress={() => setSortBy('soonest')}
    />
  </View>
);

interface SortTabProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

const SortTab: React.FC<SortTabProps> = ({ label, active, onPress }) => (
  <Pressable onPress={onPress} className="py-2 active:opacity-60">
    <Text
      className={
        active
          ? 'font-sans-medium text-meta text-ink dark:text-ink-d'
          : 'font-sans text-meta text-dust dark:text-dust-d'
      }
    >
      {label}
    </Text>
    <View
      className={active ? 'bg-ember dark:bg-ember-d' : 'bg-transparent'}
      style={{ height: 1.5, marginTop: 4, borderRadius: 1 }}
    />
  </Pressable>
);
