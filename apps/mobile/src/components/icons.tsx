import React from 'react';
import Svg, { Path, Rect, Circle, G, Line } from 'react-native-svg';

interface IconProps {
  size?: number;
  color: string;
}

// Padlock for the "Private" badge.
export const LockIcon: React.FC<IconProps> = ({ size = 12, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="11" width="16" height="10" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// Three short horizontal lines suggesting "anyone can join" for the Open badge.
export const OpenLinesIcon: React.FC<IconProps> = ({ size = 12, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="5" y1="8" x2="19" y2="8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="5" y1="16" x2="14" y2="16" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// Stylised QR code glyph.
export const QrIcon: React.FC<IconProps> = ({ size = 18, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.8} />
    <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.8} />
    <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.8} />
    <Rect x="6" y="6" width="1.5" height="1.5" fill={color} />
    <Rect x="17" y="6" width="1.5" height="1.5" fill={color} />
    <Rect x="6" y="17" width="1.5" height="1.5" fill={color} />
    <Rect x="14" y="14" width="2" height="2" fill={color} />
    <Rect x="18" y="14" width="2" height="2" fill={color} />
    <Rect x="14" y="18" width="2" height="2" fill={color} />
    <Rect x="18" y="18" width="2" height="2" fill={color} />
  </Svg>
);

// NFC "tap" curves.
export const NfcIcon: React.FC<IconProps> = ({ size = 18, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 4c2.5 2.2 4 5 4 8s-1.5 5.8-4 8"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M11 6c1.7 1.7 2.6 3.8 2.6 6S12.7 16.3 11 18"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M15 8c1 1.2 1.5 2.6 1.5 4S16 14.8 15 16"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

// Two phones tapping — the centerpiece of the NFC modal.
export const TwoPhonesIcon: React.FC<IconProps> = ({ size = 96, color }) => (
  <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
    <Rect x="10" y="14" width="32" height="58" rx="6" stroke={color} strokeWidth={2} />
    <Rect x="54" y="24" width="32" height="58" rx="6" stroke={color} strokeWidth={2} />
    <Circle cx="26" cy="64" r="2" fill={color} />
    <Circle cx="70" cy="74" r="2" fill={color} />
    <G stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Path d="M44 48c2 0 3.5-1.4 3.5-3.4" fill="none" />
      <Path d="M46 52c3 0 5.5-2.4 5.5-5.4" fill="none" />
      <Path d="M48 56c4 0 7.5-3.4 7.5-7.4" fill="none" />
    </G>
  </Svg>
);

// QR-scanner viewfinder corner brackets, drawn as four pieces around a square.
export const ViewfinderCorners: React.FC<{ size: number; color: string; thickness?: number; arm?: number }> = ({
  size,
  color,
  thickness = 4,
  arm = 28,
}) => (
  <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
    {/* top-left */}
    <Path d={`M0 ${arm} V0 H${arm}`} stroke={color} strokeWidth={thickness} strokeLinecap="round" fill="none" />
    {/* top-right */}
    <Path d={`M${size - arm} 0 H${size} V${arm}`} stroke={color} strokeWidth={thickness} strokeLinecap="round" fill="none" />
    {/* bottom-right */}
    <Path d={`M${size} ${size - arm} V${size} H${size - arm}`} stroke={color} strokeWidth={thickness} strokeLinecap="round" fill="none" />
    {/* bottom-left */}
    <Path d={`M${arm} ${size} H0 V${size - arm}`} stroke={color} strokeWidth={thickness} strokeLinecap="round" fill="none" />
  </Svg>
);
