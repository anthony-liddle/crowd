import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { useColorScheme } from 'nativewind';

interface ConcentricProps {
  size: number;
  centerLit: boolean;
  showOuterDots: boolean;
}

// Decorative strokes in negative space need more contrast than the rule
// token gives. Light mode uses dust-2 (#A09B91); dark mode uses dust-2-d
// (#5A554B). Both are component-local, not a global token override.
const COLORS = {
  light: {
    rule: '#A09B91',
    ember: '#B85A2C',
    emberSoft: 'rgba(184, 90, 44, 0.12)',
    dust: '#6B6862',
    ink: '#1A1814',
  },
  dark: {
    rule: '#5A554B',
    ember: '#D08454',
    emberSoft: 'rgba(208, 132, 84, 0.14)',
    dust: '#8A8579',
    ink: '#EDE7D9',
  },
};

export function Concentric({ size, centerLit, showOuterDots }: ConcentricProps) {
  const { colorScheme } = useColorScheme();
  const c = COLORS[colorScheme === 'dark' ? 'dark' : 'light'];
  const cx = size / 2;

  return (
    <Svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <Circle
        cx={cx}
        cy={cx}
        r={size * 0.44}
        fill="none"
        stroke={c.rule}
        strokeWidth={1}
        strokeDasharray="2 3"
      />
      <Circle
        cx={cx}
        cy={cx}
        r={size * 0.27}
        fill="none"
        stroke={c.rule}
        strokeWidth={0.8}
      />
      <Circle
        cx={cx}
        cy={cx}
        r={size * 0.13}
        fill={centerLit ? c.emberSoft : 'none'}
        stroke={centerLit ? c.ember : c.rule}
        strokeWidth={centerLit ? 0.8 : 0.5}
      />
      <Circle
        cx={cx}
        cy={cx}
        r={2.5}
        fill={centerLit ? c.ember : c.dust}
      />
      {showOuterDots && (
        <>
          <Circle cx={cx - size * 0.34} cy={cx - size * 0.13} r={2} fill={c.ink} opacity={0.4} />
          <Circle cx={cx + size * 0.34} cy={cx - size * 0.13} r={2} fill={c.ink} opacity={0.4} />
          <Circle cx={cx + size * 0.34} cy={cx + size * 0.13} r={2} fill={c.ink} opacity={0.4} />
          <Circle cx={cx - size * 0.34} cy={cx + size * 0.13} r={2} fill={c.ink} opacity={0.4} />
        </>
      )}
    </Svg>
  );
}
