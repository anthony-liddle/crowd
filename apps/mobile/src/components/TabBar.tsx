import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  light: { ember: '#B85A2C', dust2: '#A09B91' },
  dark: { ember: '#D08454', dust2: '#5A554B' },
};

const ICON_STROKE = 1.4;

interface IconProps {
  name: string;
  color: string;
}

// 20×20 rendered display size, 24×24 viewBox so the prompt's coordinates
// (cx=12 cy=12 r=9) don't clip at the right edge.
const TabIcon: React.FC<IconProps> = ({ name, color }) => {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
  };
  if (name === 'Feed') {
    return (
      <Svg {...common}>
        <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={ICON_STROKE} />
        <Circle
          cx={12}
          cy={12}
          r={9}
          stroke={color}
          strokeWidth={ICON_STROKE}
          opacity={0.5}
        />
      </Svg>
    );
  }
  if (name === 'Post') {
    return (
      <Svg {...common}>
        <Path
          d="M12 5 L12 19 M5 12 L19 12"
          stroke={color}
          strokeWidth={ICON_STROKE}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (name === 'Crowds') {
    return (
      <Svg {...common}>
        <Circle cx={8} cy={10} r={2} stroke={color} strokeWidth={ICON_STROKE} />
        <Circle cx={16} cy={10} r={2} stroke={color} strokeWidth={ICON_STROKE} />
        <Circle cx={12} cy={15} r={2} stroke={color} strokeWidth={ICON_STROKE} />
      </Svg>
    );
  }
  return null;
};

export const TabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const c = COLORS[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View
      className="flex-row bg-paper dark:bg-paper-d border-t border-rule dark:border-rule-d"
      style={{ paddingBottom: Math.max(insets.bottom, 14) }}
    >
      {state.routes.map((route, index) => {
        const active = state.index === index;
        const iconColor = active ? c.ember : c.dust2;
        const labelClass = active
          ? 'font-sans-medium text-meta text-ink dark:text-ink-d'
          : 'font-sans text-meta text-dust-2 dark:text-dust-2-d';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!active && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={active ? { selected: true } : {}}
            className="flex-1 items-center justify-center active:opacity-60"
            style={{ height: 70, gap: 4 }}
          >
            <TabIcon name={route.name} color={iconColor} />
            <Text className={labelClass}>{route.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};
