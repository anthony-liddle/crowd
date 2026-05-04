import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import { useRelaySettings } from '@/hooks/useRelaySettings';
import { useThemedRefreshTint } from '@/hooks/useThemedRefreshTint';

type SortBy = 'nearest' | 'soonest';

export const FeedScreen: React.FC = () => {
  const navigation = useNavigation<TabNavigationProp>();
  const refreshTint = useThemedRefreshTint();

  type FeedState =
    | { kind: 'locating' }
    | { kind: 'loading' }
    | { kind: 'ready' }
    | { kind: 'error'; error: LocationFetchError };
  const [messages, setMessages] = useState<Message[]>([]);
  const [feedState, setFeedState] = useState<FeedState>({ kind: 'locating' });
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('nearest');
  const [now, setNow] = useState(() => Date.now());

  const { getFreshLocation } = useLocation();

  const [crowds, setCrowds] = useState<Crowd[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<FeedSource>({ id: null, name: 'Global' });

  const [sheetMessage, setSheetMessage] = useState<Message | null>(null);
  const { markRelayed } = useRelaySettings();

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
      setFeedState({ kind: 'ready' });
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
    const result = await getFreshLocation();
    if (!result.ok) {
      Toast.show({
        type: 'error',
        text1: "Couldn't get your location",
        text2: 'Make sure GPS is on, then try again.',
      });
      return;
    }
    // Mark the gesture taught locally before the network round-trip — the hint
    // is teaching state, not server state. Awaiting boostMessage first opens a
    // window where useRelaySettings re-renders with stale `hasRelayedAtLeastOnce`
    // and the hint flashes back into view.
    await markRelayed();
    try {
      await boostMessage(message.id, message.expiresAt, {
        latitude: result.location.latitude,
        longitude: result.location.longitude,
        crowdId: selectedFeed.id || undefined,
      });
      Toast.show({ type: 'success', text1: 'Relayed', text2: 'Now visible to people near you.' });
      loadMessages();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Relay failed', text2: 'Could not relay this post.' });
    }
  }, [getFreshLocation, selectedFeed, markRelayed, loadMessages]);

  const handleRelay = useCallback((message: Message) => {
    performRelay(message);
  }, [performRelay]);

  const handleShowRelaySheet = useCallback((message: Message) => {
    setSheetMessage(message);
  }, []);

  const handleSheetConfirm = useCallback(() => {
    const target = sheetMessage;
    setSheetMessage(null);
    if (target) performRelay(target);
  }, [sheetMessage, performRelay]);

  const feedSources: FeedSource[] = [
    { id: null, name: 'Global' },
    ...crowds.map(c => ({ id: c.id, name: c.name })),
  ];

  const meta = `${visibleMessages.length} ${visibleMessages.length === 1 ? 'post' : 'posts'} near you`;

  // While fresh location is in flight on cold open, render a skeleton instead
  // of the empty state — "Nothing nearby" before data lands reads as wrong.
  const isInitialLoading =
    (feedState.kind === 'locating' || feedState.kind === 'loading') &&
    visibleMessages.length === 0 &&
    !refreshing;
  const isInitialError = feedState.kind === 'error' && visibleMessages.length === 0;

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
    if (isInitialError && feedState.kind === 'error') {
      const message =
        feedState.error === 'permission_denied'
          ? 'Crowd needs location access to show nearby posts.'
          : "We couldn't get your location. Make sure GPS is on, then try again.";
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
            Can’t find you
          </Text>
          <Text
            className="font-sans text-body text-dust dark:text-dust-d"
            style={{ marginTop: 8, textAlign: 'center', maxWidth: 260 }}
          >
            {message}
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
            onRelay={handleRelay}
            onShowRelaySheet={handleShowRelaySheet}
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
