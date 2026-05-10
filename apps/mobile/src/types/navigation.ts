import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

/**
 * Root Tab Navigator param list
 * Defines the screens available in the bottom tab navigator
 */
export type RootTabParamList = {
  Feed: undefined;
  Post: undefined;
  // pendingInvite is the raw URL string from a `crowd://` deep link, parsed
  // inside CrowdsScreen via parseCrowdInvite so QR/paste/deep-link share one
  // parser. Cleared after consumption.
  Crowds: { pendingInvite?: string } | undefined;
};

/**
 * Navigation prop type for screens within the tab navigator
 */
export type TabNavigationProp = BottomTabNavigationProp<RootTabParamList>;
