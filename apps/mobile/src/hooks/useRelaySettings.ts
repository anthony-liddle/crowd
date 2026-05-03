import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_CONFIRMED = 'relay:confirmed';
const KEY_DONE_ONCE = 'relay:done-once';

interface RelayState {
  hasConfirmedOnce: boolean;
  hasRelayedAtLeastOnce: boolean;
  loaded: boolean;
}

// Module-level store so all callers stay in sync. Without this, every
// RelayControl instance owns independent state and a successful relay
// updates only the relayed card; siblings keep showing the "hold" hint.
let state: RelayState = {
  hasConfirmedOnce: false,
  hasRelayedAtLeastOnce: false,
  loaded: false,
};
const listeners = new Set<() => void>();

const setState = (patch: Partial<RelayState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let initialized = false;
const init = () => {
  if (initialized) return;
  initialized = true;
  Promise.all([
    AsyncStorage.getItem(KEY_CONFIRMED),
    AsyncStorage.getItem(KEY_DONE_ONCE),
  ]).then(([confirmed, done]) => {
    setState({
      hasConfirmedOnce: confirmed === '1',
      hasRelayedAtLeastOnce: done === '1',
      loaded: true,
    });
  });
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const getSnapshot = () => state;

export function useRelaySettings() {
  useEffect(init, []);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const confirmDontAskAgain = async () => {
    await AsyncStorage.setItem(KEY_CONFIRMED, '1');
    setState({ hasConfirmedOnce: true });
  };

  const markRelayed = async () => {
    await AsyncStorage.setItem(KEY_DONE_ONCE, '1');
    setState({ hasRelayedAtLeastOnce: true });
  };

  const reset = async () => {
    await Promise.all([
      AsyncStorage.removeItem(KEY_CONFIRMED),
      AsyncStorage.removeItem(KEY_DONE_ONCE),
    ]);
    setState({ hasConfirmedOnce: false, hasRelayedAtLeastOnce: false });
  };

  return { ...snapshot, confirmDontAskAgain, markRelayed, reset };
}
