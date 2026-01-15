import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Crowd } from '@/types';
import { getMyCrowds, leaveCrowd } from '@/services/api';
import { PageHeader } from '@/components/PageHeader';
import { CrowdCard } from '@/components/CrowdCard';
import { CreateCrowdModal } from '@/components/CreateCrowdModal';
import { JoinCrowdModal } from '@/components/JoinCrowdModal';
import { CrowdsEmptyState } from '@/components/CrowdsEmptyState';
import Toast from 'react-native-toast-message';

/**
 * CrowdsScreen Component
 * Displays user's crowds with options to create, join, and leave crowds
 */
export const CrowdsScreen: React.FC = () => {
  const [crowds, setCrowds] = useState<Crowd[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  /**
   * Load crowds from API
   */
  const loadCrowds = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const data = await getMyCrowds();
      setCrowds(data);
    } catch (error) {
      console.error('Error loading crowds:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load crowds',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    loadCrowds();
  }, [loadCrowds]);

  useFocusEffect(
    useCallback(() => {
      loadCrowds();
    }, [loadCrowds])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCrowds();
  }, [loadCrowds]);

  /**
   * Handle leaving a crowd
   */
  const handleLeave = async (crowd: Crowd) => {
    Alert.alert(
      'Leave Crowd',
      `Are you sure you want to leave "${crowd.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCrowd(crowd.id);
              Toast.show({
                type: 'success',
                text1: 'Left Crowd',
                text2: `You have left "${crowd.name}"`,
              });
              loadCrowds();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to leave crowd',
              });
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <PageHeader title="Crowds" />

      {/* Header action buttons */}
      {crowds.length > 0 && (
        <View className="flex-row px-4 py-3 gap-3">
          <TouchableOpacity
            onPress={() => setCreateModalVisible(true)}
            className="flex-1 bg-blue-600 rounded-lg py-3 items-center"
          >
            <Text className="text-white font-semibold">Create</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setJoinModalVisible(true)}
            className="flex-1 bg-white border border-blue-600 rounded-lg py-3 items-center"
          >
            <Text className="text-blue-600 font-semibold">Join</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        className="flex-1"
        data={crowds}
        renderItem={({ item }) => (
          <CrowdCard
            crowd={item}
            onLeave={handleLeave}
            onRefresh={loadCrowds}
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
        ListEmptyComponent={
          !loading ? (
            <CrowdsEmptyState
              onCreatePress={() => setCreateModalVisible(true)}
              onJoinPress={() => setJoinModalVisible(true)}
            />
          ) : null
        }
      />

      <CreateCrowdModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={loadCrowds}
      />

      <JoinCrowdModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        onJoined={loadCrowds}
      />
    </View>
  );
};