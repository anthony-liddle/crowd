import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ring } from '@/components/Ring';
import { Concentric } from '@/components/Concentric';
import { ReachPreview } from '@/components/ReachPreview';
import { PrimaryButton, QuietButton, InlineButton } from '@/components/Buttons';
import { RelayControl } from '@/components/RelayControl';
import { RelaySheet } from '@/components/RelaySheet';
import { ThemedSlider } from '@/components/ThemedSlider';
import { useRelaySettings } from '@/hooks/useRelaySettings';

export const DesignTestScreen: React.FC = () => {
  const [reachKm, setReachKm] = useState(2.5);
  const [lifespanMin, setLifespanMin] = useState(60);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [relayCount, setRelayCount] = useState(0);
  const { reset: resetRelaySettings } = useRelaySettings();

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
            <PrimaryButton label="Post the first thing" onPress={() => {}} />
            <QuietButton label="Join with a code" onPress={() => {}} />
            <InlineButton label="Inline action" onPress={() => {}} />
          </View>
        </Section>

        <Section label="Relay control">
          <View className="flex-row items-center" style={{ gap: 24 }}>
            <RelayControl
              count={relayCount}
              onRelay={() => setRelayCount((n) => n + 1)}
              onShowSheet={() => setSheetVisible(true)}
            />
            <InlineButton
              label="reset relays"
              onPress={async () => {
                await resetRelaySettings();
                setRelayCount(0);
              }}
            />
          </View>
          <Caption>
            Tap before first confirm opens the sheet. Long-press after confirm relays.
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
