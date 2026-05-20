import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FeedScreen } from '@/screens/FeedScreen';
import { CreateMessageScreen } from '@/screens/CreateMessageScreen';
import { CrowdsScreen } from '@/screens/CrowdsScreen';
import { YouScreen } from '@/screens/YouScreen';
import { TabBar } from '@/components/TabBar';

const Tab = createBottomTabNavigator();

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Post" component={CreateMessageScreen} />
      <Tab.Screen name="Crowds" component={CrowdsScreen} />
      <Tab.Screen name="You" component={YouScreen} />
    </Tab.Navigator>
  );
};
