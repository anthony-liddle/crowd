/**
 * Message type definition
 * Represents a message in the feed with all required properties
 */
export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  activeDistance: number; // in meters
  timeLeft: number; // in minutes
  duration: number; // total duration in minutes
}

/**
 * Create message payload
 * Used when submitting a new message
 */
export interface CreateMessagePayload {
  text: string;
  duration: number; // in minutes (5 minutes to 12 hours)
  distance: number; // in meters (1000 to 5000)
}

