import React from 'react';
import { View, Text } from 'react-native';
import { BaseToastProps } from 'react-native-toast-message';
import { useColorScheme } from 'nativewind';

type Variant = 'success' | 'error' | 'info';

const ACCENT: Record<Variant, { light: string; dark: string }> = {
  success: { light: '#B85A2C', dark: '#D08454' }, // ember
  error: { light: '#B23A48', dark: '#D87078' }, // warn
  info: { light: '#6B6862', dark: '#8A8579' }, // dust
};

interface ThemedToastProps {
  text1?: string;
  text2?: string;
  variant: Variant;
}

const ThemedToast: React.FC<ThemedToastProps> = ({ text1, text2, variant }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accent = isDark ? ACCENT[variant].dark : ACCENT[variant].light;

  return (
    <View
      className="bg-paper-2 dark:bg-paper-2-d border border-rule dark:border-rule-d rounded-md"
      style={{
        width: '92%',
        borderLeftWidth: 3,
        borderLeftColor: accent,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      {text1 && (
        <Text
          className="font-sans-medium text-ink dark:text-ink-d"
          style={{ fontSize: 14 }}
        >
          {text1}
        </Text>
      )}
      {text2 && (
        <Text
          className="font-sans text-dust dark:text-dust-d"
          style={{ fontSize: 13, marginTop: 2 }}
        >
          {text2}
        </Text>
      )}
    </View>
  );
};

export const toastConfig = {
  success: (props: BaseToastProps) => (
    <ThemedToast text1={props.text1} text2={props.text2} variant="success" />
  ),
  error: (props: BaseToastProps) => (
    <ThemedToast text1={props.text1} text2={props.text2} variant="error" />
  ),
  info: (props: BaseToastProps) => (
    <ThemedToast text1={props.text1} text2={props.text2} variant="info" />
  ),
};
