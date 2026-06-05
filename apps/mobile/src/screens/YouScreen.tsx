import React, { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import * as Application from 'expo-application';
import { api } from '@repo/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { DestructiveButton } from '@/components/Buttons';
import {
  getRotationClock,
  getStoredGlobalUserId,
  getAllCrowdUserIds,
  rotateGlobalIdentityNow,
  clearAllCrowdUserIds,
} from '@/utils/identity';
import {
  getLocationPermissionStatus,
  LocationPermissionStatus,
} from '@/hooks/useLocation';
import { OnboardingScreen } from '@/screens/OnboardingScreen';

type IdentityState =
  | { kind: 'none' }
  | { kind: 'future'; clock: Date }
  | { kind: 'past'; clock: Date };

// Plain-language identity-status copy. Honest about the watermark
// being a lower bound rather than a literal countdown — rotation
// happens on the next API call after the clock passes, not at the
// instant it passes.
const identityStatusCopy = (state: IdentityState, now: number = Date.now()) => {
  if (state.kind === 'none') {
    return {
      headline: 'No active identity yet',
      detail:
        'Once you post to the global feed, this device gets a temporary identity that resets after your last post expires.',
    };
  }
  if (state.kind === 'past') {
    return {
      headline: 'Identity resets on your next post',
      detail:
        'Your global posts have all expired. The identity this device uses on the global feed will be replaced the next time you post.',
    };
  }
  const remainingMs = state.clock.getTime() - now;
  return {
    headline: 'Identity resets after your last post expires',
    detail: `That happens in about ${formatCoarseDuration(remainingMs)}, once you next use the app.`,
  };
};

// Coarse on purpose: this is not a countdown to an exact moment, and
// the copy should not read like one.
const formatCoarseDuration = (ms: number): string => {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
};

const formatPermission = (status: LocationPermissionStatus | null): string => {
  if (status === null) return '—';
  if (status === 'granted') return 'Granted';
  if (status === 'denied') return 'Denied';
  return 'Not yet asked';
};

export const YouScreen: React.FC = () => {
  const [identityState, setIdentityState] = useState<IdentityState | null>(null);
  const [permission, setPermission] = useState<LocationPermissionStatus | null>(null);
  const [wiping, setWiping] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  const refresh = useCallback(async () => {
    const clock = await getRotationClock();
    if (!clock) {
      setIdentityState({ kind: 'none' });
    } else if (clock.getTime() > Date.now()) {
      setIdentityState({ kind: 'future', clock });
    } else {
      setIdentityState({ kind: 'past', clock });
    }
    const status = await getLocationPermissionStatus();
    setPermission(status);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const performWipe = useCallback(async () => {
    setWiping(true);
    try {
      const globalId = await getStoredGlobalUserId();
      const crowdMap = await getAllCrowdUserIds();
      const userIds = [
        ...(globalId ? [globalId] : []),
        ...Object.values(crowdMap),
      ];

      if (userIds.length === 0) {
        // Nothing on the server to delete; just refresh and confirm.
        Toast.show({ type: 'success', text1: 'Your data has been cleared' });
        await refresh();
        return;
      }

      await api.users.deleteData({ userIds });

      // Server wipe succeeded. Order matters: clear crowd IDs first so
      // there's no window where the device holds a fresh global UUID
      // alongside stale crowd UUIDs that could still leak into a
      // crowd request. rotateGlobalIdentityNow already calls
      // clearAllRecords internally, so we do not call it again.
      await clearAllCrowdUserIds();
      await rotateGlobalIdentityNow();

      Toast.show({ type: 'success', text1: 'Your data has been cleared' });
      await refresh();
    } catch (error) {
      // Deliberately do NOT reset local state on failure. A partial
      // wipe would orphan the device from data that still exists on
      // the server. The user keeps their UUIDs and can retry.
      console.error('Clear my data failed:', error);
      Toast.show({
        type: 'error',
        text1: "Couldn't clear your data",
        text2: 'Please check your connection and try again.',
      });
    } finally {
      setWiping(false);
    }
  }, [refresh]);

  const confirmWipe = useCallback(() => {
    Alert.alert(
      'Clear your data?',
      'This deletes your posts from the server and resets the identity this device uses. The app keeps working.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: performWipe },
      ],
    );
  }, [performWipe]);

  const identityCopy = identityState ? identityStatusCopy(identityState) : null;

  return (
    <View className="flex-1 bg-paper dark:bg-paper-d">
      <ScreenHeader title="You" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Section title="Identity">
          {identityCopy && (
            <>
              <Text className="font-sans text-body text-ink dark:text-ink-d">
                {identityCopy.headline}
              </Text>
              <Text
                className="font-sans text-meta text-dust dark:text-dust-d"
                style={{ marginTop: 6 }}
              >
                {identityCopy.detail}
              </Text>
            </>
          )}
        </Section>

        <Section title="Location">
          <Row label="Permission" value={formatPermission(permission)} />
        </Section>

        <Section title="App">
          <Row
            label="Version"
            value={Application.nativeApplicationVersion ?? '—'}
          />
          <Row
            label="Build"
            value={Application.nativeBuildVersion ?? '—'}
          />
          <LinkRow
            label="How Crowd works"
            onPress={() => setAboutVisible(true)}
          />
        </Section>

        <View className="px-screen-x" style={{ marginTop: 24 }}>
          <Text
            className="font-sans text-meta text-dust dark:text-dust-d"
            style={{ marginBottom: 12 }}
          >
            Deletes your posts from the server and resets this device's identity.
          </Text>
          <DestructiveButton
            label={wiping ? 'Clearing…' : 'Clear my data'}
            onPress={confirmWipe}
            disabled={wiping}
          />
        </View>
      </ScrollView>

      <Modal
        visible={aboutVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAboutVisible(false)}
      >
        <OnboardingScreen
          mode="reference"
          onContinue={() => setAboutVisible(false)}
        />
      </Modal>
    </View>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View className="px-screen-x" style={{ marginTop: 24 }}>
    <Text
      className="font-serif-italic text-ink dark:text-ink-d"
      style={{ fontSize: 18, marginBottom: 12 }}
    >
      {title}
    </Text>
    {children}
  </View>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View
    className="flex-row justify-between"
    style={{ paddingVertical: 8 }}
  >
    <Text className="font-sans text-body text-dust dark:text-dust-d">
      {label}
    </Text>
    <Text className="font-sans text-body text-ink dark:text-ink-d">
      {value}
    </Text>
  </View>
);

const LinkRow: React.FC<{ label: string; onPress: () => void }> = ({
  label,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    className="flex-row justify-between items-center active:opacity-60"
    style={{ paddingVertical: 8 }}
  >
    <Text className="font-sans text-body text-ink dark:text-ink-d">
      {label}
    </Text>
    <Text className="font-sans text-body text-dust-2 dark:text-dust-2-d">
      ›
    </Text>
  </Pressable>
);
