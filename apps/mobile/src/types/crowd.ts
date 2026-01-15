/**
 * Crowd type definition
 * Represents a time-limited group that users can join
 */
export interface Crowd {
  id: string;
  name: string;
  isOpen: boolean;
  isOwner: boolean;
  memberCount: number;
  createdAt: Date;
  expiresAt: Date;
  canInvite: boolean;
}

/**
 * Create crowd payload
 * Used when creating a new crowd
 */
export interface CreateCrowdPayload {
  name: string;
  isOpen: boolean;
}
/**
 * Feed source for the message feed
 * Can be global (null id) or a specific crowd
 */
export interface FeedSource {
  id: string | null;
  name: string;
}
