import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, SectionList, RefreshControl, Alert, Text } from 'react-native';
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
import { getCrowdUrgency } from '@/utils/formatters';

interface Section {
  title: string;
  data: Crowd[];
}

const partitionCrowds = (crowds: Crowd[]): Section[] => {
  const expiring: Crowd[] = [];
  const active: Crowd[] = [];
  for (const c of crowds) {
    if (getCrowdUrgency(c.expiresAt) !== 'normal') expiring.push(c);
    else active.push(c);
  }
  // Most-imminent expirations first within "Expiring soon"; most-recent
  // creation first within "Active" (proxy for activity until we have a
  // last-message-at signal).
  expiring.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  active.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const sections: Section[] = [];
  if (expiring.length > 0) sections.push({ title: 'Expiring soon', data: expiring });
  if (active.length > 0) sections.push({ title: 'Active', data: active });
  return sections;
};

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
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load crowds' });
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

  const handleLeave = (crowd: Crowd) => {
    Alert.alert(
      `Leave ${crowd.name}?`,
      "You won't see new posts here unless you rejoin.",
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
            } catch {
              Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to leave crowd' });
            }
          },
        },
      ]
    );
  };

  const sections = useMemo(() => partitionCrowds(crowds), [crowds]);
  const hasCrowds = crowds.length > 0;

  return (
    <View className="flex-1 bg-paper dark:bg-paper-d">
      <ScreenHeader title="Crowds" />

      <View
        className="flex-row px-screen-x"
        style={{ gap: 10, marginBottom: 16 }}
      >
        <View className="flex-1">
          <PrimaryButton label="Start a crowd" onPress={() => setCreateModalVisible(true)} />
        </View>
        <View className="flex-1">
          <QuietButton label="Join a crowd" onPress={() => setJoinModalVisible(true)} />
        </View>
      </View>

      {hasCrowds ? (
        <SectionList
          className="flex-1"
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CrowdCard crowd={item} onLeave={handleLeave} onRefresh={loadCrowds} />
          )}
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} />
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={refreshTint}
              colors={[refreshTint]}
            />
          }
        />
      ) : !loading ? (
        <CrowdsEmptyState />
      ) : null}

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

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <View className="px-screen-x" style={{ marginTop: 18, marginBottom: 8 }}>
    <Text
      className="font-serif-italic text-ink dark:text-ink-d"
      style={{ fontSize: 18 }}
    >
      {title}
    </Text>
  </View>
);
