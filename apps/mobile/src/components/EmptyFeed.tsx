import React from 'react';
import { Text, View } from 'react-native';
import { Concentric } from './Concentric';
import { PrimaryButton } from './Buttons';

interface EmptyFeedProps {
  onPostPress: () => void;
}

export const EmptyFeed: React.FC<EmptyFeedProps> = ({ onPostPress }) => (
  <View
    className="flex-1 items-center justify-center px-screen-x"
    style={{ paddingVertical: 48 }}
  >
    <Concentric size={110} centerLit={false} showOuterDots={false} />
    <Text
      className="font-serif text-title text-ink dark:text-ink-d"
      style={{ marginTop: 24, textAlign: 'center' }}
    >
      Nothing nearby right now
    </Text>
    <Text
      className="font-sans text-body text-dust dark:text-dust-d"
      style={{ marginTop: 8, textAlign: 'center', maxWidth: 240 }}
    >
      Be the first one heard. Posts show up here as soon as someone within reach sends one.
    </Text>
    <View style={{ marginTop: 24, width: '100%', maxWidth: 240 }}>
      <PrimaryButton label="Post the first thing" onPress={onPostPress} />
    </View>
  </View>
);
