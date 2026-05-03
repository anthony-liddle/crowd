import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Crowd } from '@/types';
import { getMyCrowds, leaveCrowd } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CrowdCard } from '@/components/CrowdCard';
import { CreateCrowdModal } from '@/components/CreateCrowdModal';
import { JoinCrowdModal } from '@/components/JoinCrowdModal';
import { CrowdsEmptyState } from '@/components/CrowdsEmptyState';
import { PrimaryButton, QuietButton } from '@/components/Buttons';
import { useThemedRefreshTint } from '@/hooks/useThemedRefreshTint';

export const CrowdsScreen: React.FC = () => {
  const refreshTint = useThemedRefreshTint();

  const [crowds, setCrowds] = useState<Crowd[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);

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
                text1: 'Left crowd',
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
    <View className="flex-1 bg-paper dark:bg-paper-d">
      <ScreenHeader title="Crowds" />

      {crowds.length > 0 && (
        <View
          className="flex-row px-screen-x"
          style={{ gap: 10, marginBottom: 12 }}
        >
          <View className="flex-1">
            <PrimaryButton
              label="Start a crowd"
              onPress={() => setCreateModalVisible(true)}
            />
          </View>
          <View className="flex-1">
            <QuietButton
              label="Join with a code"
              onPress={() => setJoinModalVisible(true)}
            />
          </View>
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
