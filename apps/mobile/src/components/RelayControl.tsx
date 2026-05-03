import React from 'react';
import { Pressable, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useColorScheme } from 'nativewind';
import { useRelaySettings } from '@/hooks/useRelaySettings';

interface RelayControlProps {
  count: number;
  onRelay: () => void;
  onShowSheet: () => void;
}

const COLORS = {
  light: { ember: '#B85A2C', dust: '#6B6862', dust2: '#A09B91' },
  dark: { ember: '#D08454', dust: '#8A8579', dust2: '#5A554B' },
};

export function RelayControl({ count, onRelay, onShowSheet }: RelayControlProps) {
  const { colorScheme } = useColorScheme();
  const c = COLORS[colorScheme === 'dark' ? 'dark' : 'light'];
  const { hasConfirmedOnce, hasRelayedAtLeastOnce, loaded } = useRelaySettings();

  const hasRelays = count > 0;
  // Only teach the long-press gesture once the user has confirmed once —
  // before that, a tap opens the sheet and "hold" would be misleading.
  const showHint = hasConfirmedOnce && !hasRelayedAtLeastOnce && !hasRelays;
  const color = hasRelays ? c.ember : c.dust;

  const handlePress = () => {
    if (!loaded) return;
    if (!hasConfirmedOnce) onShowSheet();
  };

  const handleLongPress = () => {
    if (!loaded) return;
    if (hasConfirmedOnce) onRelay();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      hitSlop={8}
      className="flex-row items-center"
      style={{ gap: 5 }}
    >
      <Svg width={11} height={11} viewBox="0 0 11 11">
        <Path
          d="M2.5 5.5 L8.5 5.5 M6 3 L9 5.5 L6 8"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <Text
        className={hasRelays ? 'font-sans-medium' : 'font-sans'}
        style={{ color, fontSize: 11 }}
      >
        {count}
      </Text>
      {showHint && (
        <Text
          className="font-serif-italic"
          style={{ color: c.dust2, fontSize: 9, marginLeft: 2 }}
        >
          hold
        </Text>
      )}
    </Pressable>
  );
}
