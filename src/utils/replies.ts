import { type Filter, type UnsignedEvent } from 'nostr-tools';
import { getCommunityATagFromEnv } from './communityUtils';
/**
 * Creates a filter for thread events (replies to a request)
 * @param requestId - The ID of the request
 * @param limit - Maximum number of events to return
 * @returns Filter for thread events
 */
export const createThreadFilter = (
  requestId: string,
  limit: number = 100
): Filter => {
  return {
    kinds: [1111], // Text notes (replies)
    '#e': [requestId],
    limit,
  };
};

// ============================================================================
// REQUEST CREATION FUNCTIONS
// ============================================================================

/**
 * Creates a reply event (kind 1) for a community request
 * @param requestId - The ID of the request being replied to
 * @param message - The reply message
 * @param userPublicKey - User's public key (optional for unauthenticated replies)
 * @param replyToEventId - Optional ID of the specific event being replied to (for nested replies)
 * @returns Unsigned event for reply
 */
export const createReplyEvent = (
  requestId: string,
  requestPubkey: string,
  message: string
): UnsignedEvent => {
  const tags: string[][] = [
    ['e', requestId, '', 'root'], // Reference to the root request
    ['p', requestPubkey], // Reference to the root request
    ['A', getCommunityATagFromEnv()], // Community A tag
  ];

  return {
    kind: 1111, // Text note (reply)
    content: message,
    tags,
    created_at: Math.floor(Date.now() / 1000),
    // FIXME this should be reflected in the type
    pubkey: '',
  };
};
