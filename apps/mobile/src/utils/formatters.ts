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

/**
 * Compute the ring's two visual signals from a message and a reference time.
 * `fractionRemaining` (0..1) drives the arc length; `minutesRemaining` (absolute)
 * drives the color threshold.
 */
export interface RingState {
  fractionRemaining: number;
  minutesRemaining: number;
}

export const getRingState = (
  message: { duration: number; expiresAt: string },
  now: number = Date.now(),
): RingState => {
  const totalMs = message.duration * 60_000;
  const remainingMs = Math.max(0, new Date(message.expiresAt).getTime() - now);
  const minutesRemaining = remainingMs / 60_000;
  const fractionRemaining =
    totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  return { fractionRemaining, minutesRemaining };
};

/**
 * Format the short label that sits inside the Ring. Glanceable triage only —
 * we drop precision once a post has 1h+ left.
 *   <60s  → "Ns"
 *   1-59m → "Nm"
 *   1h+   → "Nh"  (floor, no minutes)
 */
export const formatRingLabel = (minutesRemaining: number): string => {
  if (minutesRemaining <= 0) return '0s';
  if (minutesRemaining < 1) return `${Math.max(1, Math.round(minutesRemaining * 60))}s`;
  if (minutesRemaining < 60) return `${Math.round(minutesRemaining)}m`;
  return `${Math.floor(minutesRemaining / 60)}h`;
};

/**
 * Format reach for the compose screen readouts.
 *   < 10 km → one decimal ("0.5 km", "2.5 km")
 *   ≥ 10 km → integer ("12 km", "100 km")
 */
export const formatReach = (km: number): string =>
  km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;

/**
 * Format lifespan for the compose screen readouts. Verbose, hour-and-minute
 * form — distinct from `formatTimeLeft` (compact, used elsewhere) and
 * `formatRingLabel` (glanceable, floors to whole hours).
 *   < 60 min            → "47 min"
 *   exact hours         → "1 hour", "4 hours", "12 hours"
 *   hours plus minutes  → "1 hour 5 min", "2 hours 15 min", "4 hours 30 min"
 */
export const formatLifespan = (min: number): string => {
  if (min < 60) return `${Math.round(min)} min`;
  const hours = Math.floor(min / 60);
  const remainder = Math.round(min % 60);
  const hoursWord = hours === 1 ? 'hour' : 'hours';
  if (remainder === 0) return `${hours} ${hoursWord}`;
  return `${hours} ${hoursWord} ${remainder} min`;
};
