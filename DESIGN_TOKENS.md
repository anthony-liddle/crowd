# Crowd — Design Tokens (Ember)

Drop-in tokens for NativeWind v4 + Expo. Light mode by default, dark mode via the system color scheme.

## 1. Color tokens

Define these as CSS custom properties in your global stylesheet so NativeWind v4 picks them up. The light/dark switch is handled by `prefers-color-scheme` automatically; an in-app override can be layered on top by toggling a `dark` class on the root view via `useColorScheme()`.

### `global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Surfaces */
    --color-paper: 245 240 228;        /* #F5F0E4 — primary background */
    --color-paper-2: 239 233 218;      /* #EFE9DA — raised surfaces, sheets */

    /* Text */
    --color-ink: 26 24 20;             /* #1A1814 — primary text */
    --color-ink-2: 58 54 49;           /* #3A3631 — secondary text */
    --color-dust: 107 104 98;          /* #6B6862 — meta, hints */
    --color-dust-2: 160 155 145;       /* #A09B91 — disabled, very subtle */

    /* Lines */
    --color-rule: 224 218 201;         /* #E0DAC9 — dividers, borders */

    /* Accent */
    --color-ember: 184 90 44;          /* #B85A2C — the one signal color */
    --color-ember-soft: 184 90 44 / 0.12;  /* tinted fills behind ember strokes */
    --color-on-ember: 255 247 238;     /* #FFF7EE — text on ember bg in LIGHT mode */

    /* Urgency (used only in the ring color) */
    --color-warn: 178 58 72;           /* #B23A48 — under 5 minutes */
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --color-paper: 20 19 15;         /* #14130F */
      --color-paper-2: 27 26 21;       /* #1B1A15 */

      --color-ink: 237 231 217;        /* #EDE7D9 */
      --color-ink-2: 201 194 178;      /* #C9C2B2 */
      --color-dust: 138 133 121;       /* #8A8579 */
      --color-dust-2: 90 85 75;        /* #5A554B */

      --color-rule: 42 39 36;          /* #2A2724 */

      --color-ember: 208 132 84;       /* #D08454 — slightly lighter for dark surfaces */
      --color-ember-soft: 208 132 84 / 0.14;
      --color-on-ember: 26 24 20;      /* #1A1814 — dark text on lighter ember in DARK mode */

      --color-warn: 216 112 120;       /* #D87078 */
    }
  }

  /* Manual override class — apply to root via useColorScheme() if you want
     a user-facing dark/light toggle that ignores system preference */
  .force-dark {
    --color-paper: 20 19 15;
    --color-paper-2: 27 26 21;
    --color-ink: 237 231 217;
    --color-ink-2: 201 194 178;
    --color-dust: 138 133 121;
    --color-dust-2: 90 85 75;
    --color-rule: 42 39 36;
    --color-ember: 208 132 84;
    --color-ember-soft: 208 132 84 / 0.14;
    --color-on-ember: 26 24 20;
    --color-warn: 216 112 120;
  }
}
```

**Critical rule for buttons:** every primary button uses `bg-ember` for its background and `text-on-ember` for its label. Never hard-code white or any other color for button text. The `--color-on-ember` token is light in light mode and dark in dark mode, which is what gives ember-on-paper enough contrast in both directions. This is the single rule that keeps button text legible across themes.

### `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        'paper-2': 'rgb(var(--color-paper-2) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--color-ink-2) / <alpha-value>)',
        dust: 'rgb(var(--color-dust) / <alpha-value>)',
        'dust-2': 'rgb(var(--color-dust-2) / <alpha-value>)',
        rule: 'rgb(var(--color-rule) / <alpha-value>)',
        ember: 'rgb(var(--color-ember) / <alpha-value>)',
        'ember-soft': 'rgb(var(--color-ember-soft))',
        'on-ember': 'rgb(var(--color-on-ember) / <alpha-value>)',
        warn: 'rgb(var(--color-warn) / <alpha-value>)',
      },
      fontFamily: {
        serif: ['LibreBaskerville_400Regular'],
        'serif-italic': ['LibreBaskerville_400Regular_Italic'],
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
      },
      fontSize: {
        'meta': ['11px', { lineHeight: '14px' }],
        'caption': ['12px', { lineHeight: '16px' }],
        'body': ['13px', { lineHeight: '20px' }],
        'post': ['16px', { lineHeight: '23px' }],
        'compose': ['17px', { lineHeight: '25px' }],
        'title': ['24px', { lineHeight: '26px' }],
        'mark': ['42px', { lineHeight: '46px' }],
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

## 2. Fonts

```bash
npx expo install @expo-google-fonts/libre-baskerville @expo-google-fonts/inter expo-font
```

```tsx
// App.tsx
import { useFonts, LibreBaskerville_400Regular, LibreBaskerville_400Regular_Italic } from '@expo-google-fonts/libre-baskerville';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';

const [loaded] = useFonts({
  LibreBaskerville_400Regular,
  LibreBaskerville_400Regular_Italic,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
});

if (!loaded) return null;
```

## 3. Type usage rules

The serif appears **only** when someone is speaking. Specifically:
- Message bodies in the feed: `font-serif text-post text-ink`
- The textarea in the composer: `font-serif text-compose text-ink`
- Screen titles: `font-serif text-title text-ink`
- Splash wordmark: `font-serif text-mark text-ink`
- Italic serif for taglines, emphasis, and the relay "hold" hint: `font-serif-italic`

Everything else is sans:
- Eyebrow / headline secondary line: `font-sans text-meta text-dust`
- Meta rows in posts: `font-sans text-meta text-dust`
- Buttons: `font-sans-medium text-body`
- Tab labels: `font-sans text-meta`
- Numbers / timestamps inside the ring: `font-sans-medium` at 9px
- Char count, slider readouts: `font-sans text-meta`

Two weights of Inter: 400 for prose, 500 for buttons and emphasis. 600 only for the very rare cases where a label needs to read as a heading. Never bold serif.

## 4. Spacing rules

Standard horizontal screen padding: `px-screen-x` (22px).

Post rows: `px-screen-x py-post-y` (22px horizontal, 16px vertical). Posts are separated by a 1px `bg-rule` divider drawn between them, not by margin.

Section spacing: 12-14px between distinct UI regions on the Post screen. Use `mt-3`, `mb-3`, etc.

The screen layout is a single flex column, with the bottom nav as a 70px child of the column flow (not absolutely positioned). The middle content region uses `flex-1 min-h-0` so its scrollable child can shrink. This is what keeps the nav from overlaying content.

## 5. The ring component

The ring encodes two independent things: shape conveys *how much of the post's life remains as a fraction*, and color conveys *how urgent the absolute time remaining is*. The mm:ss inside is the precise number for anyone who wants it.

Color thresholds, regardless of total lifespan:
- Over 30 minutes left: `--color-ink` (cool)
- 30 to 5 minutes left: `--color-ember` (warm)
- Under 5 minutes: `--color-warn` (red)

```tsx
// components/Ring.tsx
import Svg, { Circle } from 'react-native-svg';
import { View, Text } from 'react-native';

interface RingProps {
  fractionRemaining: number;
  minutesRemaining: number;
  label: string;
}

export function Ring({ fractionRemaining, minutesRemaining, label }: RingProps) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - fractionRemaining);

  const strokeColor =
    minutesRemaining > 30 ? 'rgb(var(--color-ink))' :
    minutesRemaining > 5  ? 'rgb(var(--color-ember))' :
                            'rgb(var(--color-warn))';

  return (
    <View className="w-9 h-9 relative">
      <Svg viewBox="0 0 36 36" width={36} height={36}>
        <Circle cx={18} cy={18} r={r} fill="none"
          stroke="rgb(var(--color-rule))" strokeWidth={2} />
        <Circle cx={18} cy={18} r={r} fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 18 18)" />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-ink font-sans-medium" style={{ fontSize: 9 }}>
          {label}
        </Text>
      </View>
    </View>
  );
}
```

Compute `fractionRemaining` from the post's `createdAt` and `expiresAt`. Compute `minutesRemaining` as `(expiresAt - now) / 60000`. Format `label` as `"56m"` for over 60 seconds, `"45s"` under 60 seconds.

## 6. The post card

```tsx
// components/PostCard.tsx
<Pressable className="px-screen-x py-post-y border-b border-rule">
  <View className="flex-row gap-3">
    <View className="flex-1">
      <Text className="font-serif text-post text-ink mb-2">
        {post.body}
      </Text>
      <View className="flex-row items-center gap-3.5">
        <Text className="font-sans text-meta text-dust">{distanceLabel}</Text>
        <RelayControl post={post} />
        <Text className="font-sans text-meta text-dust">{ageLabel}</Text>
      </View>
    </View>
    <Ring
      fractionRemaining={fractionRemaining}
      minutesRemaining={minutesRemaining}
      label={timeLabel}
    />
  </View>
</Pressable>
```

## 7. The relay control

Compact icon plus count, no border, no chip. Color encodes whether the post has been relayed at all (active = ember, inactive = dust). The "hold" hint is rendered as a tiny italic dust-2 word after the count, only on posts the user hasn't relayed yet, and only until they've completed their first relay anywhere in the app.

```tsx
// components/RelayControl.tsx
import { Pressable, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRelayPress } from '../hooks/useRelayPress';
import { useRelaySettings } from '../hooks/useRelaySettings';

interface RelayControlProps {
  post: Post;
  onRelay: () => void;
  onShowSheet: () => void;
}

export function RelayControl({ post, onRelay, onShowSheet }: RelayControlProps) {
  const { hasConfirmedOnce, hasRelayedAtLeastOnce } = useRelaySettings();
  const { handlePress, handleLongPress, delayLongPress } = useRelayPress(
    onRelay,
    onShowSheet,
    hasConfirmedOnce,
  );

  const hasRelays = post.relays > 0;
  const showHint = !hasRelayedAtLeastOnce && !hasRelays;
  const color = hasRelays
    ? 'rgb(var(--color-ember))'
    : 'rgb(var(--color-dust))';

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={delayLongPress}
      hitSlop={8}
      className="flex-row items-center"
      style={{ gap: 5 }}
    >
      <Svg width={11} height={11} viewBox="0 0 11 11">
        <Path
          d="M2.5 5.5 L8.5 5.5 M6 3 L9 5.5 L6 8"
          stroke={color}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <Text
        className={`font-sans text-meta ${hasRelays ? 'font-sans-medium' : ''}`}
        style={{ color }}
      >
        {post.relays}
      </Text>
      {showHint && (
        <Text
          className="font-serif-italic text-dust-2"
          style={{ fontSize: 9, marginLeft: 2 }}
        >
          hold
        </Text>
      )}
    </Pressable>
  );
}
```

The `hitSlop={8}` is important. The visible target is small but the actual touch area extends 8px in every direction so it stays easy to hit accurately.

## 8. The relay long-press hook

```tsx
// hooks/useRelayPress.ts
export function useRelayPress(
  onRelay: () => void,
  onShowSheet: () => void,
  hasConfirmedOnce: boolean,
) {
  const handlePress = () => {
    if (!hasConfirmedOnce) {
      onShowSheet();
    }
    // If already confirmed, tap does nothing — long-press is the gesture.
  };

  const handleLongPress = () => {
    if (hasConfirmedOnce) {
      onRelay();
    }
    // If not yet confirmed, long-press is ignored — they go through the sheet first.
  };

  return {
    handlePress,
    handleLongPress,
    delayLongPress: 300,
  };
}
```

```tsx
// hooks/useRelaySettings.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export function useRelaySettings() {
  const [hasConfirmedOnce, setHasConfirmedOnce] = useState(false);
  const [hasRelayedAtLeastOnce, setHasRelayedAtLeastOnce] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('relay:confirmed').then(v => setHasConfirmedOnce(v === '1'));
    AsyncStorage.getItem('relay:done-once').then(v => setHasRelayedAtLeastOnce(v === '1'));
  }, []);

  const confirmDontAskAgain = async () => {
    await AsyncStorage.setItem('relay:confirmed', '1');
    setHasConfirmedOnce(true);
  };

  const markRelayed = async () => {
    await AsyncStorage.setItem('relay:done-once', '1');
    setHasRelayedAtLeastOnce(true);
  };

  return { hasConfirmedOnce, hasRelayedAtLeastOnce, confirmDontAskAgain, markRelayed };
}
```

These preferences live in AsyncStorage, not SecureStore, because they're UX state, not sensitive data. They survive identity rotation by design (a user shouldn't have to re-learn the gesture every time their UUID rotates).

After a successful relay, call `markRelayed()` so the "hold" hint disappears app-wide. After the user confirms "Don't ask again," call `confirmDontAskAgain()`.

## 9. Buttons

Three button styles, total. Don't add more.

**Primary (ember)** — for the one most important action on a screen. Uses the `--on-ember` token for its label.

```tsx
<Pressable className="bg-ember rounded-md py-3.5 items-center">
  <Text className="text-on-ember font-sans-medium text-body">{label}</Text>
</Pressable>
```

**Quiet (outlined)** — for secondary actions like "Join with a code."

```tsx
<Pressable className="border border-rule rounded-md py-3.5 items-center">
  <Text className="text-ink font-sans text-body">{label}</Text>
</Pressable>
```

**Inline (text only)** — for in-context actions inside a row. Don't use this for relay; the relay control is its own component.

```tsx
<Pressable className="py-1">
  <Text className="text-ember font-sans-medium text-meta">{label}</Text>
</Pressable>
```

**Forbidden:** any button with hard-coded `text-white`, `text-black`, or any literal color. Always go through tokens.

## 10. The reach + lifespan preview

A static SVG that responds to slider state. Circle radius maps to reach (clamp between 8px at minimum reach and 36px at maximum), fill opacity maps to lifespan (0.04 at 5 minutes to 0.18 at 12 hours). Both on log scale because perceptual difference between 1 and 2 km is much larger than between 99 and 100 km, and the same for time.

```tsx
// components/ReachPreview.tsx
import Svg, { Line, Circle } from 'react-native-svg';

interface ReachPreviewProps {
  reachKm: number;
  lifespanMin: number;
}

export function ReachPreview({ reachKm, lifespanMin }: ReachPreviewProps) {
  const radius = mapRange(reachKm, [0.1, 100], [8, 36], 'log');
  const opacity = mapRange(lifespanMin, [5, 720], [0.04, 0.18], 'log');

  return (
    <Svg viewBox="0 0 280 80" width="100%" height={80}>
      <Line x1="0" y1="40" x2="280" y2="40" stroke="rgb(var(--color-rule))"
        strokeWidth="0.5" strokeDasharray="2 4" />
      <Line x1="140" y1="0" x2="140" y2="80" stroke="rgb(var(--color-rule))"
        strokeWidth="0.5" strokeDasharray="2 4" />
      <Circle cx={140} cy={40} r={radius}
        fill="rgb(var(--color-ember))" fillOpacity={opacity}
        stroke="rgb(var(--color-ember))" strokeWidth="1" strokeOpacity="0.5" />
      <Circle cx={140} cy={40} r={3} fill="rgb(var(--color-ink))" />
    </Svg>
  );
}

function mapRange(value: number, [inMin, inMax]: [number, number], [outMin, outMax]: [number, number], scale: 'linear' | 'log') {
  if (scale === 'log') {
    const t = (Math.log(value) - Math.log(inMin)) / (Math.log(inMax) - Math.log(inMin));
    return outMin + t * (outMax - outMin);
  }
  const t = (value - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}
```

## 11. The empty-state diagram

Reused in three places: splash, empty feed, Crowds empty. One component, three configurations.

```tsx
// components/Concentric.tsx
interface ConcentricProps {
  size: number;
  centerLit: boolean;
  showOuterDots: boolean;
}

export function Concentric({ size, centerLit, showOuterDots }: ConcentricProps) {
  const c = size / 2;
  return (
    <Svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <Circle cx={c} cy={c} r={size * 0.44} fill="none"
        stroke="rgb(var(--color-rule))" strokeWidth="0.5"
        strokeDasharray="2 3" />
      <Circle cx={c} cy={c} r={size * 0.27} fill="none"
        stroke="rgb(var(--color-rule))" strokeWidth="0.5" />
      <Circle cx={c} cy={c} r={size * 0.13}
        fill={centerLit ? 'rgb(var(--color-ember-soft))' : 'none'}
        stroke={centerLit ? 'rgb(var(--color-ember))' : 'rgb(var(--color-rule))'}
        strokeWidth={centerLit ? '0.8' : '0.5'} />
      <Circle cx={c} cy={c} r={2.5}
        fill={centerLit ? 'rgb(var(--color-ember))' : 'rgb(var(--color-dust))'} />
      {showOuterDots && (
        <>
          <Circle cx={c - size * 0.34} cy={c - size * 0.13} r="2"
            fill="rgb(var(--color-ink))" opacity="0.4" />
          <Circle cx={c + size * 0.34} cy={c - size * 0.13} r="2"
            fill="rgb(var(--color-ink))" opacity="0.4" />
          <Circle cx={c + size * 0.34} cy={c + size * 0.13} r="2"
            fill="rgb(var(--color-ink))" opacity="0.4" />
          <Circle cx={c - size * 0.34} cy={c + size * 0.13} r="2"
            fill="rgb(var(--color-ink))" opacity="0.4" />
        </>
      )}
    </Svg>
  );
}
```

## 12. The bottom nav

Three flat tabs. Active tab gets ember-stroke icon and ink text. Inactive tabs get dust-2.

```tsx
// navigation/TabBar.tsx
<View className="flex-row h-[70px] bg-paper border-t border-rule pb-3.5">
  {tabs.map(tab => (
    <Pressable key={tab.key} className="flex-1 items-center justify-center gap-1">
      <tab.Icon
        size={20}
        color={tab.active ? 'rgb(var(--color-ember))' : 'rgb(var(--color-dust-2))'}
      />
      <Text className={`font-sans text-meta ${tab.active ? 'text-ink' : 'text-dust-2'}`}>
        {tab.label}
      </Text>
    </Pressable>
  ))}
</View>
```

## 13. Status bar

Use `StatusBar` from `expo-status-bar` with `style="auto"`. The light/dark theme drives the status bar color automatically.

## 14. Things to deliberately not add

- No drop shadows. Hierarchy comes from type and dividers, not elevation.
- No color beyond ember and warn. If a new color seems needed, check whether a different word, weight, or spacing solves it first.
- No icon fills. All icons are stroke-only at 1.4px weight.
- No motion above 200ms. Sheets slide in over 200ms, the ring animates linearly with elapsed time, the long-press has a 300ms threshold. Nothing else moves.
- No haptics on routine actions. Reserve haptics for the moment of relay confirmation (a single soft success tap) and nothing else.
- No emoji in UI.
- No hard-coded colors in JSX. Every color goes through a token.

## 15. The one place to break these rules

The post-detail screen, when you build it. That's the screen where this design system needs to express something it can't with the feed-level vocabulary alone (a relative diagram of where the post can be heard, with you at center, no street grid, no compass, no exact origin). Keep the same palette, type, and spacing rules. Allow yourself one new component there.