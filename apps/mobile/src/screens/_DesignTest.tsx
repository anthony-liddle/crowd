/**
 * Ember design system component gallery.
 *
 * Unrouted by design — not part of the production navigation tree. Renders
 * key Ember primitives (Concentric, Ring, ReachPreview, buttons, RelayButton,
 * RelaySheet) at representative states for reference during development.
 *
 * To exercise: temporarily add to TabNavigator, or import directly in a screen
 * during development.
 *
 * See docs/design-system.md for the system this gallery represents.
 */
import React, { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { Ring } from '@/components/Ring';
import { Concentric } from '@/components/Concentric';
import { ReachPreview } from '@/components/ReachPreview';
import { PrimaryButton, QuietButton, InlineButton } from '@/components/Buttons';
import { RelayButton } from '@/components/RelayButton';
import { RelaySheet } from '@/components/RelaySheet';
import { ThemedSlider } from '@/components/ThemedSlider';
import { OnboardingScreen } from '@/screens/OnboardingScreen';

export const DesignTestScreen: React.FC = () => {
  const [reachKm, setReachKm] = useState(2.5);
  const [lifespanMin, setLifespanMin] = useState(60);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [relayCount, setRelayCount] = useState(0);
  const [onboardingMode, setOnboardingMode] = useState<
    'first-launch' | 'reference' | null
  >(null);

  return (
    <ScrollView
      className="flex-1 bg-paper dark:bg-paper-d"
      contentContainerStyle={{ paddingVertical: 32 }}
    >
      <View className="px-screen-x" style={{ gap: 28 }}>
        <Section label="Rings">
          <View className="flex-row items-center" style={{ gap: 24 }}>
            {/* 12h post mid-life: 360 min remaining out of 720, fraction 0.5 */}
            <Ring fractionRemaining={0.5} minutesRemaining={360} label="6h" />
            {/* 5min post mid-life: 2.5 min remaining, fraction 0.5 */}
            <Ring fractionRemaining={0.5} minutesRemaining={2.5} label="3m" />
            {/* 30s remaining */}
            <Ring fractionRemaining={0.05} minutesRemaining={0.5} label="30s" />
          </View>
          <Caption>
            ink (cool) &middot; ember (30&ndash;5m) &middot; warn (&lt;5m)
          </Caption>
        </Section>

        <Section label="Concentric — splash / crowds">
          <Concentric size={140} centerLit showOuterDots />
        </Section>

        <Section label="Concentric — empty feed">
          <Concentric size={110} centerLit={false} showOuterDots={false} />
        </Section>

        <Section label="Reach preview">
          <ReachPreview reachKm={reachKm} lifespanMin={lifespanMin} />
          <View style={{ marginTop: 12 }}>
            <Caption>Reach: {reachKm.toFixed(1)} km</Caption>
            <ThemedSlider
              minimumValue={0.1}
              maximumValue={100}
              value={reachKm}
              onValueChange={setReachKm}
            />
            <Caption>Lifespan: {Math.round(lifespanMin)} min</Caption>
            <ThemedSlider
              minimumValue={5}
              maximumValue={720}
              value={lifespanMin}
              onValueChange={setLifespanMin}
            />
          </View>
        </Section>

        <Section label="Buttons">
          <View style={{ gap: 10 }}>
            <PrimaryButton label="Post the first thing" onPress={() => { }} />
            <QuietButton label="Join a crowd" onPress={() => { }} />
            <InlineButton label="Inline action" onPress={() => { }} />
          </View>
        </Section>

        <Section label="Relay button">
          <View className="flex-row items-start" style={{ gap: 32 }}>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <RelayButton
                count={relayCount}
                isBoosted={false}
                isOwner={false}
                onPress={() => setSheetVisible(true)}
              />
              <Caption>boostable</Caption>
            </View>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <RelayButton count={4} isBoosted isOwner={false} onPress={() => {}} />
              <Caption>boosted by me</Caption>
            </View>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <RelayButton count={2} isBoosted={false} isOwner onPress={() => {}} />
              <Caption>own post (count only)</Caption>
            </View>
          </View>
          <Caption>
            Tap the boostable tile to open the confirm sheet; confirming bumps the
            count.
          </Caption>
        </Section>

        <Section label="Onboarding">
          <View style={{ gap: 10 }}>
            <InlineButton
              label="first-launch mode"
              onPress={() => setOnboardingMode('first-launch')}
            />
            <InlineButton
              label="reference mode"
              onPress={() => setOnboardingMode('reference')}
            />
          </View>
          <Caption>
            First-launch shows the live location states; reference hides location
            and shows Done.
          </Caption>
        </Section>
      </View>

      <RelaySheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onConfirm={() => {
          setSheetVisible(false);
          setRelayCount((n) => n + 1);
        }}
      />

      <Modal
        visible={onboardingMode !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setOnboardingMode(null)}
      >
        {onboardingMode && (
          <OnboardingScreen
            mode={onboardingMode}
            onContinue={() => setOnboardingMode(null)}
          />
        )}
      </Modal>
    </ScrollView>
  );
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text
        className="font-sans text-meta text-dust dark:text-dust-d"
        style={{ marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <Text className="font-sans text-meta text-dust dark:text-dust-d" style={{ marginTop: 6 }}>
      {children}
    </Text>
  );
}
