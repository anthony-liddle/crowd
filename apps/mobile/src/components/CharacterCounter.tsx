import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

interface CharacterCounterProps {
  current: number;
  limit: number;
  style?: StyleProp<TextStyle>;
}

// Tone shifts as the user nears the limit, communicating that the cap is real
// without nagging. dust → ember at (limit - 10) → warn at limit.
export const CharacterCounter: React.FC<CharacterCounterProps> = ({ current, limit, style }) => {
  const tone =
    current >= limit
      ? 'text-warn dark:text-warn-d'
      : current >= limit - 10
        ? 'text-ember dark:text-ember-d'
        : 'text-dust dark:text-dust-d';

  return (
    <Text
      className={`font-sans text-meta ${tone}`}
      style={[{ textAlign: 'right' }, style]}
    >
      {current} / {limit}
    </Text>
  );
};
