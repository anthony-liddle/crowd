import React from 'react';
import { Pressable, PressableProps, Text } from 'react-native';

interface ButtonProps extends Omit<PressableProps, 'children'> {
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

// Quiet: outlined, transparent. Secondary actions like "Join a crowd".
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
