import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FeedScreen } from '@/screens/FeedScreen';
import { CreateMessageScreen } from '@/screens/CreateMessageScreen';
import { CrowdsScreen } from '@/screens/CrowdsScreen';

/**
 * Tab Navigator
 * Bottom tab navigation with Feed and Create screens
 */
const Tab = createBottomTabNavigator();

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          paddingBottom: 10,
        },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="list" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Post"
        component={CreateMessageScreen}
        options={{
          tabBarLabel: 'Post',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="add" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Crowds"
        component={CrowdsScreen}
        options={{
          tabBarLabel: 'Crowds',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="users" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Simple Tab Icon Component
 * Using emoji icons for simplicity
 */
interface TabIconProps {
  name: string;
  color: string;
  size: number;
}

const TabIcon: React.FC<TabIconProps> = ({ name, size }) => {
  const iconMap: Record<string, string> = {
    list: '📣',
    add: '➕',
    users: '👥',
  };

  return (
    <Text style={{ fontSize: size }}>
      {iconMap[name] || '•'}
    </Text>
  );
};

