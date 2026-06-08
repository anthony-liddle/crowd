import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useColorScheme } from 'nativewind';

interface RelayButtonProps {
  count: number;
  isBoosted: boolean;
  isOwner: boolean;
  onPress: () => void;
  // In-flight relay: dim and disable while the mutation runs. Optional and
  // default-false so existing callers stay unchanged; the live signal lives in
  // FeedScreen and isn't wired yet (see _DesignTest for the dimmed state).
  loading?: boolean;
}

// SVG strokes and the chip border can't reach Tailwind tokens, so the values
// are mirrored here from tailwind.config.js. `ink` is the primary text/border
// color for the discoverable "Relay" verb; `ember` is the accent that signals
// a completed, permanent relay.
const COLORS = {
  light: { ink: '#1A1814', ember: '#B85A2C' },
  dark: { ink: '#EDE7D9', ember: '#D08454' },
};

// An outlined pill that lives in the metadata row. The visible "Relay" verb is
// the whole point of the redesign — discoverability — so the control carries a
// label, not just a glyph. Outlined with no fill, matching Ember's button
// vocabulary: the signal comes from border + glyph color, never a saturated
// fill.
export function RelayButton({
  count,
  isBoosted,
  isOwner,
  onPress,
  loading = false,
}: RelayButtonProps) {
  const { colorScheme } = useColorScheme();
  const c = COLORS[colorScheme === 'dark' ? 'dark' : 'light'];

  // Own posts surface their relay count as plain metadata text in PostCard, not
  // as a chip — there's nothing to relay on your own post.
  if (isOwner) return null;

  const tint = isBoosted ? c.ember : c.ink;

  // 11px glyphs sit level with the 12px label. The relay arrow is the app's
  // settled symbol for "relay"; the check marks a completed, one-way relay.
  const icon = isBoosted ? (
    <Svg width={11} height={11} viewBox="0 0 14 14">
      <Path
        d="M3 7.5 L6 10.5 L11 4"
        stroke={tint}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  ) : (
    <Svg width={11} height={11} viewBox="0 0 11 11">
      <Path
        d="M2.5 5.5 L8.5 5.5 M6 3 L9 5.5 L6 8"
        stroke={tint}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );

  // "Relay" alone at zero; "Relay · N" once others have relayed it; and
  // "Relayed · N" once you have (N is always > 0 in the boosted state). The
  // count is never truncated — Crowd's relay counts are real propagation, not
  // engagement metrics, so the chip grows with its content.
  const label = isBoosted
    ? `Relayed · ${count}`
    : count > 0
      ? `Relay · ${count}`
      : 'Relay';

  const chip = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: tint,
      }}
    >
      {icon}
      <Text
        className="font-sans"
        allowFontScaling={false}
        style={{ fontSize: 12, lineHeight: 14, color: tint }}
      >
        {label}
      </Text>
    </View>
  );

  // Boosted is a permanent record: relaying is one-way, so the chip becomes
  // display-only — tapping must not re-open the sheet and re-fire the mutation.
  if (isBoosted) {
    return (
      <View accessibilityRole="image" accessibilityLabel="You relayed this">
        {chip}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: loading }}
      accessibilityLabel="Relay this post"
      // Visible chip is ~24px tall; vertical hitSlop of 12 lifts the touch
      // target to ~48px, clearing the 44×44 platform/WCAG minimum.
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      style={({ pressed }) => ({
        // In-flight dim is distinct from the transient press feedback.
        opacity: loading ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      {chip}
    </Pressable>
  );
}
