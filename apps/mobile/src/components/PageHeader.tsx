import React from 'react';
import { View, Text } from 'react-native';

/**
 * PageHeader Component
 * Displays a page header with title, subtitle, and menu
 */

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  menu?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, menu }) => {
  return (
    <View className="p-4 pt-12 border-b border-gray-200 flex-row justify-between items-center">
      <View>
        <Text className="text-2xl font-bold text-gray-900">{title}</Text>
        {subtitle && <Text className="text-sm text-gray-600 mt-1">{subtitle}</Text>}
      </View>
      {menu}
    </View>
  );
};