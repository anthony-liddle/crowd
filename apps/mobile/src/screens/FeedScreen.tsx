import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Message, Location, Crowd, FeedSource } from '@/types';
import { getMessages, boostMessage, getMyCrowds } from '@/services/api';
import { cleanupExpiredRecords } from '@/utils/storage';
import { MessageCard } from '@/components/MessageCard';
import { PageHeader } from '@/components/PageHeader';
import { EmptyList } from '@/components/EmptyList';
import { SortFeed } from '@/components/SortFeed';
import { FeedSourceSelector } from '@/components/FeedSourceSelector';
import { useLocation } from '@/hooks/useLocation';
import Toast from 'react-native-toast-message';

/**
 * FeedScreen Component
 * Displays a list of messages with pull-to-refresh functionality
 */
export const FeedScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [_loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'nearest' | 'soonest'>('nearest');
  const { location, errorMsg: locationError, loading: locationLoading, refreshLocation } = useLocation();

  // Feed source state
  const [crowds, setCrowds] = useState<Crowd[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<FeedSource>({ id: null, name: 'Global' });

  useEffect(() => {
    cleanupExpiredRecords().catch(console.error);
  }, []);

  // Load crowds for feed selector
  const loadCrowds = useCallback(async () => {
    try {
      const data = await getMyCrowds();
      setCrowds(data);
    } catch (error) {
      console.error('Error loading crowds:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCrowds();
    }, [loadCrowds])
  );

  /**
   * Load messages from the API
   */
  const loadMessages = useCallback(async () => {
    // Wait for location to be ready
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

  /**
   * Effect to load messages when location changes or errors or sort changes
   */
  useEffect(() => {
    if (!locationLoading) {
      loadMessages();
    }
  }, [location, locationError, locationLoading, sortBy, selectedFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshLocation();
    await loadCrowds();
    loadMessages();
  }, [loadMessages, refreshLocation, loadCrowds]);

  useFocusEffect(
    useCallback(() => {
      if (!locationLoading) {
        loadMessages();
      }
    }, [loadMessages, locationLoading])
  );

  const handleBoost = async (item: Message, userLoc: Location) => {
    try {
      await boostMessage(item.id, item.expiresAt, {
        ...userLoc,
        crowdId: selectedFeed.id || undefined,
      });
      Toast.show({
        type: 'success',
        text1: 'Boosted!',
        text2: 'Message reach extended 🚀',
      });
      loadMessages(); // Refresh to see updates
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Boost failed',
        text2: 'Could not boost message',
      });
    }
  };

  // Build feed sources list
  const feedSources: FeedSource[] = [
    { id: null, name: 'Global' },
    ...crowds.map(c => ({ id: c.id, name: c.name })),
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <PageHeader title="Messages" />

      <FeedSourceSelector
        sources={feedSources}
        selectedSource={selectedFeed}
        onSourceChange={setSelectedFeed}
      />

      <SortFeed sortBy={sortBy} setSortBy={setSortBy} />

      <FlatList
        className="flex-1 pt-2 px-2"
        data={messages}
        renderItem={({ item }) => (
          <MessageCard
            message={item}
            onBoost={handleBoost}
            userLocation={location || undefined}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
        ListEmptyComponent={<EmptyList />}
      />
    </View>
  );
};

