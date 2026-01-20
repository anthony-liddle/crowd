import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

/**
 * Root Tab Navigator param list
 * Defines the screens available in the bottom tab navigator
 */
export type RootTabParamList = {
  Feed: undefined;
  Post: undefined;
  Crowds: undefined;
};

/**
 * Navigation prop type for screens within the tab navigator
 */
export type TabNavigationProp = BottomTabNavigationProp<RootTabParamList>;
