import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useColorScheme } from 'nativewind';

interface RingProps {
  fractionRemaining: number;
  minutesRemaining: number;
  label: string;
}

const COLORS = {
  light: { rule: '#E0DAC9', ink: '#1A1814', ember: '#B85A2C', warn: '#B23A48' },
  dark: { rule: '#2A2724', ink: '#EDE7D9', ember: '#D08454', warn: '#D87078' },
};

export function Ring({ fractionRemaining, minutesRemaining, label }: RingProps) {
  const { colorScheme } = useColorScheme();
  const c = COLORS[colorScheme === 'dark' ? 'dark' : 'light'];

  const r = 14;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fractionRemaining));
  const offset = circumference * (1 - clamped);

  const strokeColor =
    minutesRemaining > 30 ? c.ink :
    minutesRemaining > 5 ? c.ember :
    c.warn;

  return (
    <View style={{ width: 36, height: 36 }}>
      <Svg viewBox="0 0 36 36" width={36} height={36}>
        <Circle cx={18} cy={18} r={r} fill="none" stroke={c.rule} strokeWidth={2} />
        <Circle
          cx={18}
          cy={18}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 18 18)"
        />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: 'Inter_500Medium',
            fontSize: 9,
            lineHeight: 11,
            includeFontPadding: false,
            textAlign: 'center',
            color: c.ink,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}
