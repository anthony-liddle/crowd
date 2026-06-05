import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useColorScheme } from 'nativewind';

interface RelayButtonProps {
  count: number;
  isBoosted: boolean;
  isOwner: boolean;
  onPress: () => void;
}

// SVG strokes and the tile border can't reach Tailwind tokens, so the values
// are mirrored here from tailwind.config.js. dust-2 is the system's badge
// border; ember is the accent that signals a completed, permanent relay.
const COLORS = {
  light: { dust: '#6B6862', dust2: '#A09B91', ember: '#B85A2C' },
  dark: { dust: '#8A8579', dust2: '#5A554B', ember: '#D08454' },
};

// A rounded-square tile, not a circle — deliberately distinct from the Ring it
// sits beneath so it reads as a button, not a second countdown ring. Outlined
// with no fill, matching Ember's button vocabulary (DestructiveButton/Quiet):
// the signal comes from border + glyph color, never a saturated fill.
const TILE = 30;

export function RelayButton({ count, isBoosted, isOwner, onPress }: RelayButtonProps) {
  const { colorScheme } = useColorScheme();
  const c = COLORS[colorScheme === 'dark' ? 'dark' : 'light'];

  const tileBase = {
    width: TILE,
    height: TILE,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  // The relay arrow, reused from the old RelayControl so the glyph stays the
  // app's settled symbol for "relay".
  const arrow = (
    <Svg width={14} height={14} viewBox="0 0 11 11">
      <Path
        d="M2.5 5.5 L8.5 5.5 M6 3 L9 5.5 L6 8"
        stroke={c.dust}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );

  const check = (
    <Svg width={15} height={15} viewBox="0 0 14 14">
      <Path
        d="M3 7.5 L6 10.5 L11 4"
        stroke={c.ember}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      {!isOwner &&
        (isBoosted ? (
          // Boosted by me: a permanent record. Boosting is one-way, so this is
          // a static View — nothing happens on tap.
          <View
            accessibilityRole="image"
            accessibilityLabel="You relayed this"
            style={{ ...tileBase, borderColor: c.ember }}
          >
            {check}
          </View>
        ) : (
          <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Relay this post"
            // Visible tile is 30px; hitSlop lifts the touch target to 46×46,
            // clearing the 44×44 platform/WCAG minimum.
            hitSlop={8}
            style={{ ...tileBase, borderColor: c.dust2 }}
          >
            {arrow}
          </Pressable>
        ))}
      <Text
        className="font-sans text-meta text-dust dark:text-dust-d"
        allowFontScaling={false}
      >
        {count}
      </Text>
    </View>
  );
}
