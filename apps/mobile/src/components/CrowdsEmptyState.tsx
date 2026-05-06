import React from 'react';
import { Text, View } from 'react-native';
import { Concentric } from './Concentric';

export const CrowdsEmptyState: React.FC = () => (
  <View
    className="flex-1 items-center justify-center px-screen-x"
    style={{ paddingVertical: 48 }}
  >
    <Concentric size={130} centerLit showOuterDots />
    <Text
      className="font-serif text-title text-ink dark:text-ink-d"
      style={{ marginTop: 24, textAlign: 'center' }}
    >
      No crowds yet
    </Text>
    <Text
      className="font-sans text-body text-dust dark:text-dust-d"
      style={{ marginTop: 8, textAlign: 'center', maxWidth: 280 }}
    >
      A crowd is a small trusted group. Members can post and read in your shared
      space until it expires.
    </Text>
  </View>
);
