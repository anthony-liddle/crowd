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

interface QuietButtonProps extends ButtonProps {
  // 'card' lifts the border from rule to dust-2 so the button reads
  // clearly when sitting on a paper-2 or paper-tint card background,
  // where rule's contrast collapses. Same precedent the design doc
  // names for Concentric overriding rule with dust-2 in negative
  // space. Default behavior on paper-base surfaces is unchanged.
  tone?: 'default' | 'card';
}

// Quiet: outlined, transparent. Secondary actions like "Join a crowd".
export function QuietButton({ label, tone = 'default', ...props }: QuietButtonProps) {
  const borderClass =
    tone === 'card'
      ? 'border-dust-2 dark:border-dust-2-d'
      : 'border-rule dark:border-rule-d';
  return (
    <Pressable
      className={`border ${borderClass} rounded-md py-3.5 items-center active:opacity-60`}
      {...props}
    >
      <Text className="text-ink dark:text-ink-d font-sans text-body">
        {label}
      </Text>
    </Pressable>
  );
}

// Destructive: outlined like QuietButton, but warn-toned border and
// label. Reserved for actions that delete or otherwise can't be
// undone. Uses accent rather than fill so it stays Ember-quiet next to
// the rest of the surface.
export function DestructiveButton({ label, ...props }: ButtonProps) {
  return (
    <Pressable
      className="border border-warn dark:border-warn-d rounded-md py-3.5 items-center active:opacity-60"
      {...props}
    >
      <Text className="text-warn dark:text-warn-d font-sans-medium text-body">
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
