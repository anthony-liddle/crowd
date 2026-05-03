# Crowd — Visual Design Migration to Ember

You are working in the Crowd monorepo, a pnpm workspace. The mobile app lives at `apps/mobile/`. We are migrating the mobile app's visual design from its current state (default iOS-style with royal blue accent, system fonts, emoji icons) to a new design system called **Ember**: warm paper ground in light mode, near-black warm dark mode, Libre Baskerville for message bodies and titles, Inter for everything else, a single ember orange accent for primary actions, and a decaying ring timer on each post.

This work is split into **six phases**. Stop at the end of each phase and report what you did, what the user should verify, and what you'd recommend changing or fixing before continuing. Wait for the user's explicit "continue" before starting the next phase. Do not move ahead without confirmation.

If at any point you discover something that contradicts what's in this prompt (a file path that doesn't exist, an existing pattern in the codebase that conflicts with what's described, a dependency at a different version than expected), stop and ask before proceeding. Do not guess or invent.

---

## Phase 0 — Discovery and NativeWind v2 to v4 upgrade

Before any visual work, get the foundation right.

### 0a. Discovery

Read these files end-to-end to understand the current state. Do not change anything yet.

- `apps/mobile/package.json` — what's installed
- `apps/mobile/tailwind.config.js` (or `.ts`) — current Tailwind/NativeWind config
- `apps/mobile/babel.config.js` — current babel plugins
- `apps/mobile/metro.config.js` — current metro config
- `apps/mobile/App.tsx` (or wherever the root component is) — current font loading, status bar, theming
- `apps/mobile/src/components/` directory listing — what components already exist
- `apps/mobile/src/hooks/` directory listing — what hooks already exist
- `apps/mobile/src/screens/` directory listing — what screens exist (Feed, Post, Crowds at minimum)
- The current Feed screen, Post screen, and Crowds screen source files in full

After reading, report:
- The current NativeWind version (should be 2.x)
- The current Tailwind version
- Whether `react-native-svg` is already installed (we'll need it; install if not)
- The shape of existing screens — are they flat components, do they use a layout wrapper, what's the current component composition pattern
- Any existing color tokens, theme tokens, or design system pieces already in place that we should respect or replace
- Anything you notice that's likely to be tricky in the migration

Ask the user to confirm the discovery findings before proceeding to 0b.

### 0b. NativeWind v2 → v4 upgrade

NativeWind v4 is a significant rewrite. The class-merging strategy, dark mode handling, and runtime are all different. This must be done before any new design tokens are added.

Follow the official NativeWind v4 migration guide at https://www.nativewind.dev/v4/getting-started/expo-router (or the appropriate Expo guide if not using Expo Router). Key steps you will need to handle:

1. Update `nativewind` to v4 (latest stable)
2. Update `tailwindcss` to v3.4.x (NativeWind v4 expects Tailwind v3, not v4)
3. Add `nativewind/preset` to `tailwind.config.js`
4. Add the NativeWind babel plugin to `babel.config.js`
5. Add the NativeWind metro config wrapper to `metro.config.js`
6. Create or update `global.css` with `@tailwind base; @tailwind components; @tailwind utilities;` and import it from the app entry point
7. Update `tsconfig.json` if needed for the `nativewind-env.d.ts` reference
8. Verify all existing `className` props still work after the upgrade — some v2 patterns will need updating

After completing the upgrade, run the app on iOS simulator and verify nothing visually regressed before the design changes start. Report what you changed and any issues encountered.

**Stop. Wait for user confirmation before Phase 1.**

---

## Phase 1 — Design tokens

Replace the existing color and type tokens with the Ember design system tokens.

### 1a. Install fonts

```bash
cd apps/mobile && npx expo install @expo-google-fonts/libre-baskerville @expo-google-fonts/inter expo-font
```

### 1b. Update `tailwind.config.js`

Replace the existing theme with the Ember palette. Note: NativeWind v4 has incomplete support for Tailwind v4's CSS variable syntax, so we use **explicit hex colors with `dark:` variants** rather than CSS custom properties. The pattern is verbose but reliable.

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode palette
        paper: '#F5F0E4',
        'paper-2': '#EFE9DA',
        ink: '#1A1814',
        'ink-2': '#3A3631',
        dust: '#6B6862',
        'dust-2': '#A09B91',
        rule: '#E0DAC9',
        ember: '#B85A2C',
        'on-ember': '#FFF7EE',
        warn: '#B23A48',

        // Dark mode palette — used with dark: prefix
        'paper-d': '#14130F',
        'paper-2-d': '#1B1A15',
        'ink-d': '#EDE7D9',
        'ink-2-d': '#C9C2B2',
        'dust-d': '#8A8579',
        'dust-2-d': '#5A554B',
        'rule-d': '#2A2724',
        'ember-d': '#D08454',
        'on-ember-d': '#1A1814',
        'warn-d': '#D87078',
      },
      fontFamily: {
        serif: ['LibreBaskerville_400Regular'],
        'serif-italic': ['LibreBaskerville_400Regular_Italic'],
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
      },
      fontSize: {
        meta: ['11px', { lineHeight: '14px' }],
        caption: ['12px', { lineHeight: '16px' }],
        body: ['13px', { lineHeight: '20px' }],
        post: ['16px', { lineHeight: '23px' }],
        compose: ['17px', { lineHeight: '25px' }],
        title: ['24px', { lineHeight: '26px' }],
        mark: ['42px', { lineHeight: '46px' }],
      },
      spacing: {
        'screen-x': '22px',
        'post-y': '16px',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        full: '9999px',
      },
    },
  },
};
```

### 1c. Load fonts in App.tsx

Add font loading to the app root using `useFonts` from `@expo-google-fonts/libre-baskerville` and `@expo-google-fonts/inter`. Block rendering until fonts are loaded, returning `null` while loading. Use the existing splash if there's a placeholder; otherwise render nothing until ready.

```tsx
import {
  useFonts,
  LibreBaskerville_400Regular,
  LibreBaskerville_400Regular_Italic,
} from '@expo-google-fonts/libre-baskerville';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

const [loaded] = useFonts({
  LibreBaskerville_400Regular,
  LibreBaskerville_400Regular_Italic,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
});

if (!loaded) return null;
```

### 1d. Wire up dark mode

NativeWind v4's `useColorScheme` hook respects system preference automatically. Add a root wrapper that applies the `dark` class when the system is in dark mode:

```tsx
import { useColorScheme } from 'nativewind';

const { colorScheme } = useColorScheme();
// Wrap the app's root View with className based on colorScheme
```

Set the status bar to `style="auto"` so it follows the theme.

### 1e. Verify

Run the app. The screens will still look like their old selves because we haven't changed any classes yet, but:
- The fonts should be loaded (you can verify by adding a temporary `<Text className="font-serif">` somewhere)
- Tailwind classes using new colors (`bg-paper`, `text-ink`) should resolve to the right hex values when used
- The dark mode toggle should respond to system preference changes (test by switching iOS simulator's appearance)

Report what you did and what the user should verify.

**Stop. Wait for user confirmation before Phase 2.**

---

## Phase 2 — Reusable components

Build the design system components in `apps/mobile/src/components/`. These are the building blocks the screens will compose. Build them in this order; each depends on tokens from Phase 1, not on screens or hooks.

### 2a. `components/Ring.tsx`

The decaying ring timer. Two independent visual signals: shape (fraction remaining) and color (urgency). The mm:ss label sits inside.

Color thresholds, regardless of total lifespan:
- More than 30 minutes left: ink stroke (cool)
- 30 to 5 minutes left: ember stroke (warm)
- Under 5 minutes: warn stroke (red)

```tsx
import Svg, { Circle } from 'react-native-svg';
import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';

interface RingProps {
  fractionRemaining: number;     // 0..1
  minutesRemaining: number;      // absolute minutes (used for color thresholds)
  label: string;                 // e.g. "56m" or "45s"
}

const COLORS = {
  light: { rule: '#E0DAC9', ink: '#1A1814', ember: '#B85A2C', warn: '#B23A48' },
  dark:  { rule: '#2A2724', ink: '#EDE7D9', ember: '#D08454', warn: '#D87078' },
};

export function Ring({ fractionRemaining, minutesRemaining, label }: RingProps) {
  const { colorScheme } = useColorScheme();
  const c = COLORS[colorScheme === 'dark' ? 'dark' : 'light'];

  const r = 14;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.max(0, Math.min(1, fractionRemaining)));

  const strokeColor =
    minutesRemaining > 30 ? c.ink :
    minutesRemaining > 5  ? c.ember :
                            c.warn;

  return (
    <View className="w-9 h-9 relative">
      <Svg viewBox="0 0 36 36" width={36} height={36}>
        <Circle cx={18} cy={18} r={r} fill="none" stroke={c.rule} strokeWidth={2} />
        <Circle cx={18} cy={18} r={r} fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 18 18)" />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-ink dark:text-ink-d font-sans-medium" style={{ fontSize: 9 }}>
          {label}
        </Text>
      </View>
    </View>
  );
}
```

The `COLORS` object pattern (resolving theme color at runtime via `useColorScheme`) is the pattern to use anywhere SVG meets theming. SVG stroke/fill props can't take Tailwind classes; they need actual hex values.

The `Math.max(0, Math.min(1, ...))` on `fractionRemaining` clamps it defensively so a stale `fractionRemaining > 1` from a clock skew can't break the ring.

### 2b. `components/Concentric.tsx`

Reused empty-state diagram for the splash, empty feed, and Crowds empty state.

```tsx
import Svg, { Circle } from 'react-native-svg';
import { useColorScheme } from 'nativewind';

interface ConcentricProps {
  size: number;
  centerLit: boolean;       // splash + crowds = true, empty feed = false
  showOuterDots: boolean;   // splash + crowds = true, empty feed = false
}

const COLORS = {
  light: { rule: '#E0DAC9', ember: '#B85A2C', emberSoft: 'rgba(184, 90, 44, 0.12)', dust: '#6B6862', ink: '#1A1814' },
  dark:  { rule: '#2A2724', ember: '#D08454', emberSoft: 'rgba(208, 132, 84, 0.14)', dust: '#8A8579', ink: '#EDE7D9' },
};

export function Concentric({ size, centerLit, showOuterDots }: ConcentricProps) {
  const { colorScheme } = useColorScheme();
  const c = COLORS[colorScheme === 'dark' ? 'dark' : 'light'];
  const cx = size / 2;

  return (
    <Svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <Circle cx={cx} cy={cx} r={size * 0.44} fill="none"
        stroke={c.rule} strokeWidth="0.5" strokeDasharray="2 3" />
      <Circle cx={cx} cy={cx} r={size * 0.27} fill="none"
        stroke={c.rule} strokeWidth="0.5" />
      <Circle cx={cx} cy={cx} r={size * 0.13}
        fill={centerLit ? c.emberSoft : 'none'}
        stroke={centerLit ? c.ember : c.rule}
        strokeWidth={centerLit ? '0.8' : '0.5'} />
      <Circle cx={cx} cy={cx} r={2.5}
        fill={centerLit ? c.ember : c.dust} />
      {showOuterDots && (
        <>
          <Circle cx={cx - size * 0.34} cy={cx - size * 0.13} r="2" fill={c.ink} opacity="0.4" />
          <Circle cx={cx + size * 0.34} cy={cx - size * 0.13} r="2" fill={c.ink} opacity="0.4" />
          <Circle cx={cx + size * 0.34} cy={cx + size * 0.13} r="2" fill={c.ink} opacity="0.4" />
          <Circle cx={cx - size * 0.34} cy={cx + size * 0.13} r="2" fill={c.ink} opacity="0.4" />
        </>
      )}
    </Svg>
  );
}
```

### 2c. `components/ReachPreview.tsx`

The Post screen's literal preview of reach and lifespan. Circle radius maps to reach (log-scale). Circle opacity maps to lifespan (log-scale).

```tsx
import Svg, { Line, Circle } from 'react-native-svg';
import { useColorScheme } from 'nativewind';

interface ReachPreviewProps {
  reachKm: number;       // 0.1 to 100 expected
  lifespanMin: number;   // 5 to 720 expected
}

const COLORS = {
  light: { rule: '#E0DAC9', ember: '#B85A2C', ink: '#1A1814' },
  dark:  { rule: '#2A2724', ember: '#D08454', ink: '#EDE7D9' },
};

function mapLog(value: number, [inMin, inMax]: [number, number], [outMin, outMax]: [number, number]) {
  const safeValue = Math.max(inMin, Math.min(inMax, value));
  const t = (Math.log(safeValue) - Math.log(inMin)) / (Math.log(inMax) - Math.log(inMin));
  return outMin + t * (outMax - outMin);
}

export function ReachPreview({ reachKm, lifespanMin }: ReachPreviewProps) {
  const { colorScheme } = useColorScheme();
  const c = COLORS[colorScheme === 'dark' ? 'dark' : 'light'];

  const radius = mapLog(reachKm, [0.1, 100], [8, 36]);
  const opacity = mapLog(lifespanMin, [5, 720], [0.04, 0.18]);

  return (
    <Svg viewBox="0 0 280 80" width="100%" height={80} preserveAspectRatio="xMidYMid meet">
      <Line x1="0" y1="40" x2="280" y2="40" stroke={c.rule} strokeWidth="0.5" strokeDasharray="2 4" />
      <Line x1="140" y1="0" x2="140" y2="80" stroke={c.rule} strokeWidth="0.5" strokeDasharray="2 4" />
      <Circle cx={140} cy={40} r={radius}
        fill={c.ember} fillOpacity={opacity}
        stroke={c.ember} strokeWidth="1" strokeOpacity="0.5" />
      <Circle cx={140} cy={40} r={3} fill={c.ink} />
    </Svg>
  );
}
```

### 2d. `components/Buttons.tsx`

Three button variants. No more, no fewer.

```tsx
import { Pressable, Text, PressableProps, View } from 'react-native';

interface ButtonProps extends PressableProps {
  label: string;
}

// Primary: ember background, on-ember text. The most important action on a screen.
export function PrimaryButton({ label, ...props }: ButtonProps) {
  return (
    <Pressable
      className="bg-ember dark:bg-ember-d rounded-md py-3.5 items-center active:opacity-80"
      {...props}
    >
      <Text className="text-on-ember dark:text-on-ember-d font-sans-medium text-body">
        {label}
      </Text>
    </Pressable>
  );
}

// Quiet: outlined, transparent. Secondary actions like "Join with a code".
export function QuietButton({ label, ...props }: ButtonProps) {
  return (
    <Pressable
      className="border border-rule dark:border-rule-d rounded-md py-3.5 items-center active:opacity-60"
      {...props}
    >
      <Text className="text-ink dark:text-ink-d font-sans text-body">
        {label}
      </Text>
    </Pressable>
  );
}

// Inline: text-only, ember-colored. For in-context actions.
export function InlineButton({ label, ...props }: ButtonProps) {
  return (
    <Pressable className="py-1 active:opacity-60" {...props}>
      <Text className="text-ember dark:text-ember-d font-sans-medium text-meta">
        {label}
      </Text>
    </Pressable>
  );
}
```

**Critical:** never hard-code `text-white`, `#fff`, `text-black`, or any literal color in JSX or `style` props. All colors go through the token system. If you need a color that doesn't exist as a token, stop and ask the user — don't add one.

### 2e. `hooks/useRelaySettings.ts`

Persistent UX preferences for the relay flow. Lives in AsyncStorage (not SecureStore) because these are interaction preferences, not sensitive data, and they should survive identity rotation.

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY_CONFIRMED = 'relay:confirmed';
const KEY_DONE_ONCE = 'relay:done-once';

export function useRelaySettings() {
  const [hasConfirmedOnce, setHasConfirmedOnce] = useState(false);
  const [hasRelayedAtLeastOnce, setHasRelayedAtLeastOnce] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEY_CONFIRMED),
      AsyncStorage.getItem(KEY_DONE_ONCE),
    ]).then(([confirmed, done]) => {
      setHasConfirmedOnce(confirmed === '1');
      setHasRelayedAtLeastOnce(done === '1');
      setLoaded(true);
    });
  }, []);

  const confirmDontAskAgain = async () => {
    await AsyncStorage.setItem(KEY_CONFIRMED, '1');
    setHasConfirmedOnce(true);
  };

  const markRelayed = async () => {
    await AsyncStorage.setItem(KEY_DONE_ONCE, '1');
    setHasRelayedAtLeastOnce(true);
  };

  return {
    hasConfirmedOnce,
    hasRelayedAtLeastOnce,
    confirmDontAskAgain,
    markRelayed,
    loaded,
  };
}
```

### 2f. `components/RelayControl.tsx`

Compact icon and count. No border, no chip. Color encodes whether the post has been relayed at all (active = ember, inactive = dust). The "hold" hint is a tiny italic dust-2 word after the count, only visible on posts the user hasn't relayed yet, and only until they've completed their first relay anywhere.

Tap behavior:
- If `hasConfirmedOnce` is false: tap opens the relay confirmation sheet
- If `hasConfirmedOnce` is true: tap does nothing; the user must long-press to relay
- Long-press 300ms triggers relay only when `hasConfirmedOnce` is true

```tsx
import { Pressable, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useColorScheme } from 'nativewind';
import { useRelaySettings } from '../hooks/useRelaySettings';

interface RelayControlProps {
  count: number;
  onRelay: () => void;       // called on long-press after first confirm
  onShowSheet: () => void;   // called on tap before first confirm
}

const COLORS = {
  light: { ember: '#B85A2C', dust: '#6B6862', dust2: '#A09B91' },
  dark:  { ember: '#D08454', dust: '#8A8579', dust2: '#5A554B' },
};

export function RelayControl({ count, onRelay, onShowSheet }: RelayControlProps) {
  const { colorScheme } = useColorScheme();
  const c = COLORS[colorScheme === 'dark' ? 'dark' : 'light'];
  const { hasConfirmedOnce, hasRelayedAtLeastOnce } = useRelaySettings();

  const hasRelays = count > 0;
  const showHint = !hasRelayedAtLeastOnce && !hasRelays;
  const color = hasRelays ? c.ember : c.dust;

  const handlePress = () => {
    if (!hasConfirmedOnce) onShowSheet();
  };

  const handleLongPress = () => {
    if (hasConfirmedOnce) onRelay();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={300}
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
```

### 2g. `components/RelaySheet.tsx`

Modal bottom sheet that opens when a user taps the relay control before they've confirmed once. Use `Modal` from `react-native` with `transparent={true}` and `animationType="slide"`. Background is a translucent black overlay. Sheet itself is paper-colored with rounded top corners.

```tsx
import { Modal, View, Text, Pressable } from 'react-native';
import { useState } from 'react';
import { useRelaySettings } from '../hooks/useRelaySettings';
import { PrimaryButton, QuietButton } from './Buttons';

interface RelaySheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;     // called when user taps "Relay"
}

export function RelaySheet({ visible, onClose, onConfirm }: RelaySheetProps) {
  const { confirmDontAskAgain } = useRelaySettings();
  const [dontAskAgain, setDontAskAgain] = useState(true); // default checked

  const handleRelay = async () => {
    if (dontAskAgain) await confirmDontAskAgain();
    onConfirm();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-paper dark:bg-paper-d rounded-t-[20px] px-screen-x pt-5 pb-7"
        >
          <View className="self-center w-9 h-1 bg-rule dark:bg-rule-d rounded-full mb-4" />
          <Text className="font-serif text-ink dark:text-ink-d mb-2" style={{ fontSize: 18 }}>
            Relay this post?
          </Text>
          <Text className="font-sans text-ink-2 dark:text-ink-2-d mb-4" style={{ fontSize: 13, lineHeight: 20 }}>
            It&rsquo;ll be visible to people near you for the rest of its lifespan.
            The original radius doesn&rsquo;t change; you&rsquo;re just adding a new
            point it can reach from.
          </Text>
          <Pressable
            onPress={() => setDontAskAgain(!dontAskAgain)}
            className="flex-row items-center mb-4"
            style={{ gap: 10 }}
          >
            <View
              className={dontAskAgain
                ? 'bg-ember dark:bg-ember-d border-ember dark:border-ember-d'
                : 'border-rule dark:border-rule-d'
              }
              style={{ width: 16, height: 16, borderWidth: 1.5, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}
            >
              {dontAskAgain && (
                <Text className="text-on-ember dark:text-on-ember-d" style={{ fontSize: 10, fontWeight: '600', lineHeight: 12 }}>
                  ✓
                </Text>
              )}
            </View>
            <Text className="font-sans text-dust dark:text-dust-d" style={{ fontSize: 12 }}>
              Don&rsquo;t ask again. Use long-press to relay.
            </Text>
          </Pressable>
          <View className="flex-row" style={{ gap: 10 }}>
            <View className="flex-1">
              <QuietButton label="Cancel" onPress={onClose} />
            </View>
            <View className="flex-1">
              <PrimaryButton label="Relay" onPress={handleRelay} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
```

The `Pressable` wrapping the sheet body uses `e.stopPropagation()` so tapping inside the sheet doesn't dismiss it; only the backdrop dismisses.

### 2h. Verify

Build a quick test screen (e.g. `apps/mobile/src/screens/_DesignTest.tsx`, not routed) that renders:
- A `Ring` at three states (12-hour post mid-life, a 5-minute post mid-life, a 30-second-remaining post)
- A `Concentric` in both `centerLit=true, showOuterDots=true` and `centerLit=false, showOuterDots=false` configurations
- A `ReachPreview` with state controlled by two sliders
- All three buttons (`PrimaryButton`, `QuietButton`, `InlineButton`)
- A `RelayControl` triggering a `RelaySheet`

Verify everything renders correctly in light and dark mode (toggle iOS simulator appearance to test).

Report what you built and what you'd recommend the user verify.

**Stop. Wait for user confirmation before Phase 3.**

---

## Phase 3 — Feed screen migration

Migrate the existing Feed screen to use the new design system.

### 3a. PostCard component

Extract a `PostCard` component to `apps/mobile/src/components/PostCard.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native';
import { Ring } from './Ring';
import { RelayControl } from './RelayControl';
// import RelaySheet from './RelaySheet'; // when wiring relay action
// types and helpers from existing codebase

interface PostCardProps {
  post: Post; // use the existing Post type from the codebase
  // ... whatever handlers the parent screen needs
}

export function PostCard({ post }: PostCardProps) {
  const now = Date.now();
  const totalMs = post.expiresAt.getTime() - post.createdAt.getTime();
  const remainingMs = post.expiresAt.getTime() - now;
  const fractionRemaining = remainingMs / totalMs;
  const minutesRemaining = remainingMs / 60000;

  const timeLabel = formatTimeLabel(remainingMs); // implement: "56m" / "4h" / "45s"
  const distanceLabel = formatDistance(post.distanceMeters); // implement: "nearby" / "0.3 km"
  const ageLabel = formatAge(now - post.createdAt.getTime()); // "4m ago" / "8h ago" / "just now"

  return (
    <Pressable className="px-screen-x py-post-y border-b border-rule dark:border-rule-d">
      <View className="flex-row" style={{ gap: 12 }}>
        <View className="flex-1">
          <Text className="font-serif text-post text-ink dark:text-ink-d mb-2">
            {post.body}
          </Text>
          <View className="flex-row items-center" style={{ gap: 14 }}>
            <Text className="font-sans text-meta text-dust dark:text-dust-d">
              {distanceLabel}
            </Text>
            <RelayControl
              count={post.relayCount}
              onRelay={() => {/* call relay API */}}
              onShowSheet={() => {/* set sheet visible state in parent */}}
            />
            <Text className="font-sans text-meta text-dust dark:text-dust-d">
              {ageLabel}
            </Text>
          </View>
        </View>
        <Ring
          fractionRemaining={fractionRemaining}
          minutesRemaining={minutesRemaining}
          label={timeLabel}
        />
      </View>
    </Pressable>
  );
}
```

If the existing codebase already has `formatDistance`, `formatAge`, or similar helpers, use them. If not, implement them as small pure functions in `apps/mobile/src/utils/format.ts`.

`PostCard` should re-render every minute or so to keep the ring and timestamps current. Use a `setInterval` in a `useEffect` at the screen level (not inside each card) that increments a counter, then pass `now` down so all cards recompute together.

### 3b. Feed screen

Update the feed screen to:
- Use the screen layout pattern: `<View className="flex-1 bg-paper dark:bg-paper-d">` as root, with status bar, header, switch tabs, scrollable feed, and bottom nav as direct children
- Replace the existing card layout with `PostCard` for each post
- Header shows eyebrow text ("Within 0.4 km · N active") and a serif "Nearby" title
- Below the header, the tabs ("Nearest" / "Expiring soon") with the active one underlined in ember
- The scrollable region uses `flex-1 min-h-0` and contains the list
- Below it, the bottom nav (which we'll build in Phase 4)

Keep the existing data fetching and state management; only the visual layer changes.

### 3c. Empty feed

When there are no posts, show the empty state:
- `Concentric` component at size 110, `centerLit={false}`, `showOuterDots={false}`
- Serif headline "Nothing nearby right now"
- Sans subhead "Be the first one heard. Posts show up here as soon as someone within reach sends one."
- `PrimaryButton` labeled "Post the first thing" that navigates to the Post tab

Layout: vertically and horizontally centered in the available space, with the bottom nav remaining at the bottom of the screen.

### 3d. Verify

Run the app. The feed should now:
- Render messages in serif on warm paper in light mode, on warm dark in dark mode
- Show the ring next to each post with correct shape and color based on time remaining
- Show the relay control as a bare arrow + count, with the "hold" hint on posts when relevant
- Show the empty state when there are no posts, with a working "Post the first thing" button

Report what you migrated and what to verify.

**Stop. Wait for user confirmation before Phase 4.**

---

## Phase 4 — Post screen migration

Migrate the existing Post (compose) screen to use the new design system.

### 4a. Post screen layout

Same screen pattern: `bg-paper dark:bg-paper-d`, single flex column. Sections from top to bottom:

1. **Header**: eyebrow "Speak to the people around you", serif title "New post"
2. **Compose**: full-width textarea, serif `text-compose`, char count below ("73 / 120")
3. **ReachPreview**: the `<ReachPreview>` component, with reach and lifespan from the slider state, and a row below it showing "Reach **2.5 km**" and "Lifespan **1 hour**"
4. **Sliders**: two slider rows, "Reach" and "Lifespan", with the current value shown on the right of each row
5. **Send block**: `PrimaryButton` labeled "Post", with caption below: "No account · No record after expiration"
6. **Bottom nav** (from Phase 4)

### 4b. Slider implementation

Use whatever slider library is already in the project. If none, use `@react-native-community/slider`. Style the track in `bg-rule dark:bg-rule-d` for inactive and `bg-ember dark:bg-ember-d` for the filled portion. Thumb is a 14px circle with paper background and 2px ember border.

For the slider value mapping: the underlying model is in km and minutes, but the slider's perceptual feel should be log-scale (so small adjustments at the bottom of the range feel as meaningful as small adjustments at the top). Use these conversions:

```tsx
function sliderToReach(sliderValue: number): number { // sliderValue 0..1
  return Math.exp(Math.log(0.1) + sliderValue * (Math.log(100) - Math.log(0.1)));
}
function reachToSlider(reachKm: number): number {
  return (Math.log(reachKm) - Math.log(0.1)) / (Math.log(100) - Math.log(0.1));
}
function sliderToLifespan(sliderValue: number): number { // returns minutes
  return Math.exp(Math.log(5) + sliderValue * (Math.log(720) - Math.log(5)));
}
function lifespanToSlider(lifespanMin: number): number {
  return (Math.log(lifespanMin) - Math.log(5)) / (Math.log(720) - Math.log(5));
}
```

Round the displayed value sensibly: reach to one decimal under 10 km and to integer above, lifespan to nearest minute under one hour and nearest hour above.

### 4c. Verify

Run the app. The Post screen should:
- Show the compose textarea in serif on the warm ground
- Show the ReachPreview responding live to the sliders (circle grows with reach, fades with lifespan)
- Show the Post button visibly orange with cream text in light mode, lighter orange with dark text in dark mode
- Show the "No account · No record after expiration" caption below the button
- Successfully submit a post and return the user to the feed

Report what you migrated.

**Stop. Wait for user confirmation before Phase 5.**

---

## Phase 5 — Crowds screen and bottom nav

### 5a. Bottom nav component

Build a shared `apps/mobile/src/components/TabBar.tsx`. Three tabs: Feed, Post, Crowds. Active tab gets ember-stroke icon and ink text; inactive tabs get dust-2 stroke and dust-2 text.

Icons (all stroke-only at 1.4px, 20×20 viewBox):
- Feed: concentric circles (`<Circle cx={12} cy={12} r={3} /><Circle cx={12} cy={12} r={9} opacity={0.5} />`)
- Post: a plus (`<Path d="M12 5 L12 19 M5 12 L19 12" />`)
- Crowds: three small dots in triangle formation (`<Circle cx={8} cy={10} r={2} /><Circle cx={16} cy={10} r={2} /><Circle cx={12} cy={15} r={2} />`)

The TabBar is 70px tall with a 1px ink top border (`border-t border-rule dark:border-rule-d`), background `bg-paper dark:bg-paper-d`, and 14px bottom padding so it sits above the iOS home indicator.

If the project uses React Navigation's bottom tabs, override the tab bar via `tabBar={(props) => <TabBar {...props} />}` rather than rebuilding navigation.

### 5b. Crowds empty state

The Crowds screen, when the user has no crowds, shows:
- Header: eyebrow "Trusted, scoped, ephemeral", serif title "Crowds"
- Centered content area:
  - `Concentric` at size 130, `centerLit={true}`, `showOuterDots={true}`
  - Serif headline "No crowds yet"
  - Sans subhead "A crowd is a small trusted group. Open crowds join by code; private crowds need physical proximity."
  - `PrimaryButton` labeled "Start a crowd"
  - `QuietButton` labeled "Join with a code"
- Bottom nav

The Crowds populated state is out of scope for this prompt. Note in your report that it'll need separate design.

### 5c. Verify

Run the app. The bottom nav should appear on all three screens, with the correct active state for each, and tapping a tab should navigate to the right screen. The Crowds empty state should show the diagram, headline, copy, and two buttons all rendering correctly in both modes.

Report what you migrated.

**Stop. Wait for user confirmation before Phase 6.**

---

## Phase 6 — Splash and final polish

### 6a. Splash screen

Replace the existing splash with the Ember splash. Use Expo's splash screen API:

In `app.json` or `app.config.js`, set the splash background to `#F5F0E4` for light and `#14130F` for dark.

The actual splash content (after the native splash hands off to the JS layer, while fonts and any first-load data are still loading) lives in a fallback component:

```tsx
import { View, Text } from 'react-native';
import { Concentric } from './Concentric';

export function SplashScreen() {
  return (
    <View className="flex-1 bg-paper dark:bg-paper-d items-center justify-center px-6">
      <Concentric size={180} centerLit={true} showOuterDots={true} />
      <Text className="font-serif text-mark text-ink dark:text-ink-d mt-6">
        Crowd
      </Text>
      <Text
        className="font-serif-italic text-dust dark:text-dust-d mt-1.5"
        style={{ fontSize: 14, textAlign: 'center' }}
      >
        There&rsquo;s safety in numbers.
      </Text>
      <View className="absolute bottom-8">
        <Text
          className="font-sans text-dust-2 dark:text-dust-2-d"
          style={{ fontSize: 10, letterSpacing: 0.4 }}
        >
          Ephemeral · Local · Anonymous
        </Text>
      </View>
    </View>
  );
}
```

This is what the app renders while `useFonts` is still loading and during any first-load data fetches. Once everything's ready, the app navigates to the Feed.

### 6b. Final pass

Look through every screen and:
- Verify there are no remaining hard-coded colors in JSX or `style` props (search for `#` followed by hex digits in `apps/mobile/src/`)
- Verify there are no remaining `text-white`, `text-black`, `bg-white`, `bg-black` classes
- Verify every color class has a paired `dark:` variant
- Verify the type usage rules: serif only for message bodies, screen titles, and the splash wordmark; sans for everything else
- Verify spacing uses the `screen-x` and `post-y` tokens consistently
- Verify nothing uses the word "expiry" anywhere — only "expiration"
- Verify no emoji icons remain in the chrome (the splash diagram replaces the megaphone)

Run the full app one more time in both light and dark mode. Tap through every screen. Verify the sliders work, the ring updates, the relay flow goes through the sheet on first use and skips it after, and posts can be created and shown.

### 6c. Report

Final report should include:
- Every file changed (full list)
- Any deviations from this prompt and the reasoning
- Anything you saw in the existing codebase that's worth flagging for follow-up (technical debt, patterns that fight the new design, places where the migration was harder than expected)
- A list of the design surfaces NOT covered by this work that will need separate attention later (post-detail screen, populated Crowds state, settings, error states, the proximity-join flow for private crowds, etc.)

**Stop. Done.**

---

## Things to deliberately not add

While doing this work, do not:

- Add drop shadows. Hierarchy comes from type and dividers, not elevation.
- Add colors beyond ember and warn. If it seems like a new color is needed, check whether a different word, weight, or spacing solves it first.
- Fill any icons. All icons are stroke-only at 1.4px weight.
- Add motion above 200ms. Sheets slide in at 200ms (the React Native Modal default), the ring animates linearly with elapsed time, the long-press has a 300ms threshold. Nothing else moves.
- Add haptics on routine actions. The only haptic in this design is a single soft success tap on relay confirmation, and even that is optional. Don't add haptics elsewhere.
- Add emoji to the UI chrome.
- Hard-code colors anywhere. Every color goes through a token.

If you find yourself wanting to do any of these, stop and ask the user instead.

## Tone for code comments and commit messages

Sparing. Plain. The Crowd codebase voice is plainspoken and engineering-direct. Comments explain *why*, not *what*. Commit messages are descriptive but unembellished. Match the existing voice in the codebase if there's a clear precedent.

## On asking for help

This is a long migration with several decisions baked in. If you find that one of those decisions doesn't fit the codebase as it actually exists, stop and surface it rather than working around it. The user has been involved in every design decision here and should be involved in any deviation from the plan.
