import React from 'react';
import Slider, { SliderProps } from '@react-native-community/slider';
import { useColorScheme } from 'nativewind';

const COLORS = {
  light: { ember: '#B85A2C', rule: '#E0DAC9' },
  dark: { ember: '#D08454', rule: '#2A2724' },
};

// `ref` is omitted because @react-native-community/slider's ref typing
// (SliderReferenceType) is incompatible with React 19's Ref<Slider>.
export function ThemedSlider(props: Omit<SliderProps, 'ref'>) {
  const { colorScheme } = useColorScheme();
  const c = COLORS[colorScheme === 'dark' ? 'dark' : 'light'];
  return (
    <Slider
      minimumTrackTintColor={c.ember}
      maximumTrackTintColor={c.rule}
      thumbTintColor={c.ember}
      {...props}
    />
  );
}
