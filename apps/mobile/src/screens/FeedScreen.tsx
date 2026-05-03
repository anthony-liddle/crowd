import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Message, Crowd, FeedSource, TabNavigationProp } from '@/types';
import { getMessages, boostMessage, getMyCrowds } from '@/services/api';
import { cleanupExpiredRecords } from '@/utils/storage';
import { PostCard } from '@/components/PostCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SortFeed } from '@/components/SortFeed';
import { EmptyFeed } from '@/components/EmptyFeed';
import { RelaySheet } from '@/components/RelaySheet';
import { FeedSourceSelector } from '@/components/FeedSourceSelector';
import { useLocation } from '@/hooks/useLocation';
import { useRelaySettings } from '@/hooks/useRelaySettings';
import { useThemedRefreshTint } from '@/hooks/useThemedRefreshTint';

type SortBy = 'nearest' | 'soonest';

export const FeedScreen: React.FC = () => {
  const navigation = useNavigation<TabNavigationProp>();
  const refreshTint = useThemedRefreshTint();

  const [messages, setMessages] = useState<Message[]>([]);
  const [_loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('nearest');
  const [now, setNow] = useState(() => Date.now());

  const {
    location,
    errorMsg: locationError,
    loading: locationLoading,
    refreshLocation,
  } = useLocation();

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

  const loadMessages = useCallback(async () => {
    if (!location && !locationError && locationLoading) return;
    try {
      if (!refreshing) setLoading(true);
      const data = await getMessages(location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        sortBy,
        crowdId: selectedFeed.id || undefined,
      } : undefined);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, locationError, locationLoading, refreshing, sortBy, selectedFeed]);

  useEffect(() => {
    if (!locationLoading) loadMessages();
  }, [loadMessages, locationLoading, location, locationError, sortBy, selectedFeed]);

  useFocusEffect(
    useCallback(() => {
      loadCrowds();
      if (!locationLoading) loadMessages();
    }, [loadCrowds, loadMessages, locationLoading])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshLocation();
    await loadCrowds();
    await loadMessages();
  }, [loadMessages, refreshLocation, loadCrowds]);

  const performRelay = useCallback(async (message: Message) => {
    if (!location) {
      Toast.show({ type: 'info', text1: 'Locating you', text2: 'Try again in a moment.' });
      return;
    }
    // Mark the gesture taught locally before the network round-trip — the hint
    // is teaching state, not server state. Awaiting boostMessage first opens a
    // window where useRelaySettings re-renders with stale `hasRelayedAtLeastOnce`
    // and the hint flashes back into view.
    await markRelayed();
    try {
      await boostMessage(message.id, message.expiresAt, {
        latitude: location.latitude,
        longitude: location.longitude,
        crowdId: selectedFeed.id || undefined,
      });
      Toast.show({ type: 'success', text1: 'Relayed', text2: 'Now visible to people near you.' });
      loadMessages();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Relay failed', text2: 'Could not relay this post.' });
    }
  }, [location, selectedFeed, markRelayed, loadMessages]);

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
        ListEmptyComponent={
          <EmptyFeed onPostPress={() => navigation.navigate('Post')} />
        }
      />

      <RelaySheet
        visible={sheetMessage !== null}
        onClose={() => setSheetMessage(null)}
        onConfirm={handleSheetConfirm}
      />
    </View>
  );
};
