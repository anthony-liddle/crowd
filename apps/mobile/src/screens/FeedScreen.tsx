import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Message } from '@/types/message';
import { getMessages } from '@/services/api';
import { MessageCard } from '@/components/MessageCard';
import { PageHeader } from '@/components/PageHeader';
import { EmptyList } from '@/components/EmptyList';
import { useLocation } from '@/hooks/useLocation';

/**
 * FeedScreen Component
 * Displays a list of messages with pull-to-refresh functionality
 */
export const FeedScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { location, errorMsg: locationError, loading: locationLoading, refreshLocation } = useLocation();

  /**
   * Load messages from the API
   */
  const loadMessages = useCallback(async () => {
    // Wait for location to be ready
    if (!location && !locationError && locationLoading) return;

    try {
      if (!refreshing) setLoading(true); // Don't show full screen loader on pull-to-refresh

      const data = await getMessages(location ? {
        latitude: location.latitude,
        longitude: location.longitude,
      } : undefined);

      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, locationError, locationLoading, refreshing]); // Dependencies

  /**
   * Effect to load messages when location changes or errors
   */
  useEffect(() => {
    if (!locationLoading) {
      loadMessages();
    }
  }, [location, locationError, locationLoading]); // React to location changes

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshLocation(); // Refresh location first
    // loadMessages will happen automatically via the useEffect when location updates
    // but we need to stop refreshing if location doesn't change enough to trigger effect??
    // Actually, refreshLocation updates state which triggers effect.
    // But if location is same, state might not update? 
    // Safest to just call loadMessages explicitly after a short delay or await something.
    // Let's just call loadMessages which uses current location.

    // Better pattern: refresh location, then fetch messages.
    // If refreshLocation is async and updates state, we might have a race condition or double fetch.
    // Simplified: Just re-fetch messages with current location for now. 
    loadMessages();
  }, [loadMessages, refreshLocation]);

  /**
   * Load messages when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      // If we have location, refresh messages. If not, maybe try to get location again?
      // useLocation runs on mount.
      if (!locationLoading) {
        loadMessages();
      }
    }, [loadMessages, locationLoading])
  );

  // if (loading || locationLoading) {
  //   return (
  //     <View className="flex-1 justify-center items-center bg-gray-50">
  //       <ActivityIndicator size="large" color="#3B82F6" />
  //       <Text className="mt-4 text-gray-600">
  //         {locationLoading ? 'Finding location...' : 'Loading messages...'}
  //       </Text>
  //     </View>
  //   );
  // }

  return (
    <View className="flex-1 bg-gray-50">
      <PageHeader title="Messages" />
      <FlatList
        className="flex-1 pt-2"
        data={messages}
        renderItem={({ item }) => <MessageCard message={item} />}
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
