import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Device-level, non-secret boolean → AsyncStorage, matching storage.ts's
// versioned-key convention (e.g. my_messages_v1). Not SecureStore; this isn't
// identity. Set once when the user finishes first-launch onboarding.
const KEY = 'onboarding_complete_v1';

// Module-level store so every consumer stays in sync after markOnboarded,
// mirroring the (now-removed) useRelaySettings shape — but simpler: one
// boolean, no state machine. `null` means "not yet read from storage", which
// lets App.tsx show Splash during the load instead of racing a default-false
// and flashing onboarding at an already-onboarded user.
let hasOnboarded: boolean | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let initialized = false;
const init = () => {
  if (initialized) return;
  initialized = true;
  AsyncStorage.getItem(KEY)
    .then((value) => {
      hasOnboarded = value === 'true';
      emit();
    })
    .catch(() => {
      // A read failure resolves to "not onboarded" — re-showing the calm
      // intro is harmless (a previously-granted user lands in the granted
      // state with one tap), whereas trapping a fresh user past the required
      // location ask is not.
      hasOnboarded = false;
      emit();
    });
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const getSnapshot = () => hasOnboarded;

export function useHasOnboarded() {
  useEffect(init, []);
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const markOnboarded = async () => {
    await AsyncStorage.setItem(KEY, 'true');
    hasOnboarded = true;
    emit();
  };

  return { hasOnboarded: value, markOnboarded };
}
