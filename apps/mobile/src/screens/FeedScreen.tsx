import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { Message, Crowd, FeedSource, TabNavigationProp } from '@/types';
import { getMessages, boostMessage, getMyCrowds } from '@/services/api';
import { cleanupExpiredRecords } from '@/utils/storage';
import { PostCard } from '@/components/PostCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SortFeed } from '@/components/SortFeed';
import { EmptyFeed } from '@/components/EmptyFeed';
import { Concentric } from '@/components/Concentric';
import { PrimaryButton } from '@/components/Buttons';
import { RelaySheet } from '@/components/RelaySheet';
import { FeedSourceSelector } from '@/components/FeedSourceSelector';
import { useLocation, LocationFetchError } from '@/hooks/useLocation';
import { useThemedRefreshTint } from '@/hooks/useThemedRefreshTint';

type SortBy = 'nearest' | 'soonest';

export const FeedScreen: React.FC = () => {
  const navigation = useNavigation<TabNavigationProp>();
  const refreshTint = useThemedRefreshTint();

  type FeedState =
    | { kind: 'locating' }
    | { kind: 'loading' }
    | { kind: 'ready' }
    | { kind: 'error'; error: LocationFetchError }
    | { kind: 'load-error' };
  const [messages, setMessages] = useState<Message[]>([]);
  const [feedState, setFeedState] = useState<FeedState>({ kind: 'locating' });
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('nearest');
  const [now, setNow] = useState(() => Date.now());

  const { getFreshLocation } = useLocation();

  const [crowds, setCrowds] = useState<Crowd[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<FeedSource>({ id: null, name: 'Everyone' });

  const [sheetMessage, setSheetMessage] = useState<Message | null>(null);

  // Message IDs with a relay mutation in flight. The RelaySheet closes the
  // moment the user confirms (before performRelay runs), so a second relay can
  // be started while the first is still landing — hence a Set keyed by id, not
  // a single flag. Drives each chip's dimmed/disabled in-flight state.
  const [relayPending, setRelayPending] = useState<Set<string>>(() => new Set());

  // Filter out posts that hit zero — server already excludes them on the next
  // refetch, but state lingers between fetches. Without this, a post sits at
  // "0s" until the next refresh.
  const visibleMessages = useMemo(
    () => messages.filter((m) => new Date(m.expiresAt).getTime() > now),
    [messages, now],
  );

  // Adaptive tick rate: 1s when any visible post is under a minute, 10s under
  // 5 minutes, 30s otherwise. The bucket — not `now` — drives reconfiguration,
  // so we only tear down setInterval when the rate actually needs to change.
  const tickInterval = useMemo(() => {
    if (visibleMessages.length === 0) return 30_000;
    const minMsRemaining = Math.min(
      ...visibleMessages.map((m) => new Date(m.expiresAt).getTime() - now),
    );
    if (minMsRemaining < 60_000) return 1_000;
    if (minMsRemaining < 300_000) return 10_000;
    return 30_000;
  }, [visibleMessages, now]);

  // Tick `now` so rings + age labels stay current. Cadence comes from the
  // bucket above.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), tickInterval);
    return () => clearInterval(id);
  }, [tickInterval]);

  useEffect(() => {
    cleanupExpiredRecords().catch(console.error);
  }, []);

  const loadCrowds = useCallback(async () => {
    try {
      const data = await getMyCrowds();
      setCrowds(data);
    } catch (error) {
      console.error('Error loading crowds:', error);
    }
  }, []);

  // Single source of truth for cold-open + refresh: fetch fresh location, then
  // issue the feed query. No fallback to a cached/stale snapshot — the whole
  // point of the bug fix is that location is always fresh at action time.
  const loadMessages = useCallback(async () => {
    setFeedState((s) => (s.kind === 'ready' ? s : { kind: 'locating' }));
    const result = await getFreshLocation();
    if (!result.ok) {
      setFeedState({ kind: 'error', error: result.error });
      setRefreshing(false);
      return;
    }
    setFeedState((s) => (s.kind === 'ready' ? s : { kind: 'loading' }));
    try {
      const data = await getMessages({
        latitude: result.location.latitude,
        longitude: result.location.longitude,
        sortBy,
        crowdId: selectedFeed.id || undefined,
      });
      setMessages(data);
      setFeedState({ kind: 'ready' });
    } catch (error) {
      console.error('Error loading messages:', error);
      // Surface the failure instead of presenting it as an empty feed — a
      // silent empty state reads as "the app is dead" to a new tester.
      setFeedState({ kind: 'load-error' });
    } finally {
      setRefreshing(false);
    }
  }, [getFreshLocation, sortBy, selectedFeed]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useFocusEffect(
    useCallback(() => {
      loadCrowds();
      loadMessages();
    }, [loadCrowds, loadMessages])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCrowds();
    await loadMessages();
  }, [loadMessages, loadCrowds]);

  const performRelay = useCallback(async (message: Message) => {
    // Mark in-flight up front so the chip dims through the whole action —
    // location fetch included, not just the network boost.
    setRelayPending((prev) => new Set(prev).add(message.id));
    try {
      const result = await getFreshLocation();
      if (!result.ok) {
        Toast.show({
          type: 'error',
          text1: "Couldn't get your location",
          text2: 'Make sure GPS is on, then try again.',
        });
        return;
      }
      try {
        await boostMessage(message.id, message.expiresAt, {
          latitude: result.location.latitude,
          longitude: result.location.longitude,
          crowdId: selectedFeed.id || undefined,
        });
        // Confirm the deliberate, one-way action with a single medium impact —
        // fired only once the boost has actually landed on the server.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        Toast.show({ type: 'success', text1: 'Relayed', text2: 'Now visible to people near you.' });
        loadMessages();
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Relay failed', text2: 'Could not relay this post.' });
      }
    } finally {
      // Clear on every exit — success, boost error, or the location-failure
      // early return — so a chip never stays dim forever.
      setRelayPending((prev) => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
    }
  }, [getFreshLocation, selectedFeed, loadMessages]);

  const handleShowRelaySheet = useCallback((message: Message) => {
    setSheetMessage(message);
  }, []);

  const handleSheetConfirm = useCallback(() => {
    const target = sheetMessage;
    setSheetMessage(null);
    if (target) performRelay(target);
  }, [sheetMessage, performRelay]);

  const feedSources: FeedSource[] = [
    { id: null, name: 'Everyone' },
    ...crowds.map(c => ({ id: c.id, name: c.name })),
  ];

  const meta = `${visibleMessages.length} ${visibleMessages.length === 1 ? 'post' : 'posts'} near you`;

  // While fresh location is in flight on cold open, render a skeleton instead
  // of the empty state — "Nothing nearby" before data lands reads as wrong.
  const isInitialLoading =
    (feedState.kind === 'locating' || feedState.kind === 'loading') &&
    visibleMessages.length === 0 &&
    !refreshing;
  const isInitialError =
    (feedState.kind === 'error' || feedState.kind === 'load-error') &&
    visibleMessages.length === 0;

  const renderEmpty = () => {
    if (isInitialLoading) {
      return (
        <View
          className="flex-1 items-center justify-center px-screen-x"
          style={{ paddingVertical: 48 }}
        >
          <Concentric size={110} centerLit={false} showOuterDots={false} />
          <Text
            className="font-serif text-title text-ink dark:text-ink-d"
            style={{ marginTop: 24, textAlign: 'center' }}
          >
            Finding posts near you…
          </Text>
        </View>
      );
    }
    if (
      isInitialError &&
      (feedState.kind === 'error' || feedState.kind === 'load-error')
    ) {
      // Feed-load failure and location failure share the same visual
      // treatment so the two error paths feel coherent; only the copy differs.
      const { headline, body } =
        feedState.kind === 'load-error'
          ? {
              headline: 'Couldn’t load the feed',
              body: 'Check your connection, then try again.',
            }
          : feedState.error === 'permission_denied'
            ? {
                headline: 'Can’t find you',
                body: 'Crowd needs location access to show nearby posts.',
              }
            : {
                headline: 'Can’t find you',
                body: "We couldn't get your location. Make sure GPS is on, then try again.",
              };
      return (
        <View
          className="flex-1 items-center justify-center px-screen-x"
          style={{ paddingVertical: 48 }}
        >
          <Concentric size={110} centerLit={false} showOuterDots={false} />
          <Text
            className="font-serif text-title text-ink dark:text-ink-d"
            style={{ marginTop: 24, textAlign: 'center' }}
          >
            {headline}
          </Text>
          <Text
            className="font-sans text-body text-dust dark:text-dust-d"
            style={{ marginTop: 8, textAlign: 'center', maxWidth: 260 }}
          >
            {body}
          </Text>
          <View style={{ marginTop: 24, width: '100%', maxWidth: 240 }}>
            <PrimaryButton label="Try again" onPress={loadMessages} />
          </View>
        </View>
      );
    }
    return <EmptyFeed onPostPress={() => navigation.navigate('Post')} />;
  };

  return (
    <View className="flex-1 bg-paper dark:bg-paper-d">
      <ScreenHeader title="Nearby" meta={meta} />

      <SortFeed sortBy={sortBy} setSortBy={setSortBy} />

      <FeedSourceSelector
        sources={feedSources}
        selectedSource={selectedFeed}
        onSourceChange={setSelectedFeed}
      />

      <FlatList
        className="flex-1"
        data={visibleMessages}
        renderItem={({ item }) => (
          <PostCard
            message={item}
            now={now}
            onShowRelaySheet={handleShowRelaySheet}
            relayPending={relayPending.has(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={refreshTint}
            colors={[refreshTint]}
          />
        }
        ListEmptyComponent={renderEmpty()}
      />

      <RelaySheet
        visible={sheetMessage !== null}
        onClose={() => setSheetMessage(null)}
        onConfirm={handleSheetConfirm}
      />
    </View>
  );
};
