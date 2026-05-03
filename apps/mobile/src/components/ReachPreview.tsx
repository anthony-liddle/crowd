import React from 'react';
import Svg, { Line, Circle } from 'react-native-svg';
import { useColorScheme } from 'nativewind';

interface ReachPreviewProps {
  reachKm: number;
  lifespanMin: number;
}

const COLORS = {
  light: { rule: '#E0DAC9', ember: '#B85A2C', ink: '#1A1814' },
  dark: { rule: '#2A2724', ember: '#D08454', ink: '#EDE7D9' },
};

function mapLog(
  value: number,
  [inMin, inMax]: [number, number],
  [outMin, outMax]: [number, number],
): number {
  const safe = Math.max(inMin, Math.min(inMax, value));
  const t = (Math.log(safe) - Math.log(inMin)) / (Math.log(inMax) - Math.log(inMin));
  return outMin + t * (outMax - outMin);
}

export function ReachPreview({ reachKm, lifespanMin }: ReachPreviewProps) {
  const { colorScheme } = useColorScheme();
  const c = COLORS[colorScheme === 'dark' ? 'dark' : 'light'];

  const radius = mapLog(reachKm, [0.1, 5], [8, 36]);
  const opacity = mapLog(lifespanMin, [5, 720], [0.04, 0.18]);

  return (
    <Svg
      viewBox="0 0 280 80"
      width="100%"
      height={80}
      preserveAspectRatio="xMidYMid meet"
    >
      <Line
        x1={0}
        y1={40}
        x2={280}
        y2={40}
        stroke={c.rule}
        strokeWidth={0.5}
        strokeDasharray="2 4"
      />
      <Line
        x1={140}
        y1={0}
        x2={140}
        y2={80}
        stroke={c.rule}
        strokeWidth={0.5}
        strokeDasharray="2 4"
      />
      <Circle
        cx={140}
        cy={40}
        r={radius}
        fill={c.ember}
        fillOpacity={opacity}
        stroke={c.ember}
        strokeWidth={1}
        strokeOpacity={0.5}
      />
      <Circle cx={140} cy={40} r={3} fill={c.ink} />
    </Svg>
  );
}
