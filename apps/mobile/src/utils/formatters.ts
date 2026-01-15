/**
 * Utility functions for formatting dates, times, and distances
 */

/**
 * Format time left in a human-readable format
 * @param minutes - Time left in minutes
 * @returns Formatted string (e.g., "2h 30m", "45m", "5m")
 */
export const formatTimeLeft = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Format timestamp to a relative time string
 * @param date - Date object
 * @returns Formatted string (e.g., "2 hours ago", "Just now")
 */
export const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Format as date if older than a week
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Format distance with proper unit
 * @param meters - Distance in meters
 * @returns Formatted string (e.g., "2.5 km")
 */
export const formatDistance = (meters: number): string => {
  if (meters < 100) return 'nearby';
  return `${(meters / 1000).toFixed(1)} km`;
};

/**
 * Format duration for display in form
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "2h 30m", "45m")
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Format time remaining until expiration
 * @param expiresAt - Expiration Date object
 * @returns Formatted string (e.g., "2h 30m left", "Expired")
 */
export const formatTimeRemaining = (expiresAt: Date): string => {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${minutes}m left`;
};
