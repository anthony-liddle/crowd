import React from 'react';
import { Text, View } from 'react-native';
import { Concentric } from './Concentric';
import { PrimaryButton, QuietButton } from './Buttons';

interface CrowdsEmptyStateProps {
  onCreatePress: () => void;
  onJoinPress: () => void;
}

export const CrowdsEmptyState: React.FC<CrowdsEmptyStateProps> = ({
  onCreatePress,
  onJoinPress,
}) => (
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
      A crowd is a small trusted group. Open crowds join by code; private
      crowds need physical proximity.
    </Text>
    <View style={{ marginTop: 24, width: '100%', maxWidth: 280, gap: 10 }}>
      <PrimaryButton label="Start a crowd" onPress={onCreatePress} />
      <QuietButton label="Join with a code" onPress={onJoinPress} />
    </View>
  </View>
);
