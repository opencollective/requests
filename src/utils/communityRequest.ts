import { type Event, type Filter, type UnsignedEvent } from 'nostr-tools';
import { getCommunityATagFromEnv, getCommunityConfig } from './communityUtils';
import type { RequestFormData } from '../types/RequestFormSchema';

/**
 * Creates a community request event (NIP-72 kind 1111)
 * @param data - Request form data
 * @param userPublicKey - User's public key (optional for unauthenticated requests)
 * @returns Unsigned event for community request
 */
export const createCommunityRequestEvent = (
  data: RequestFormData,
  userPublicKey?: string
): UnsignedEvent => {
  const communityATag = getCommunityATagFromEnv();
  const { community_id } = getCommunityConfig();
  return {
    kind: 1111, // NIP-72: Community Request -> NIP-7D
    content: data.message,
    tags: [
      ['d', `request-${Date.now()}`], // Unique identifier
      ['t', 'community-request'], // Topic tag
      ['title', data.subject],
      ['a', communityATag], // Community a tag
      ['A', communityATag],
      ['k', '34550'],
      ['K', '34550'],
      ['p', community_id],
      ['P', community_id],
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey || '', // Set the public key if authenticated, empty if not
  };
};

/**
 * Creates a filter for community request events (NIP-72)
 * @param communityATag - Optional community a tag to filter by
 * @param limit - Maximum number of events to return
 * @returns Filter for community request events
 */
export const createCommunityRequestFilter = (
  communityATag: string,
  limit: number = 100
): Filter => {
  const filter: Filter = {
    kinds: [1111], // NIP-72: Community Request
    '#a': [communityATag],
    limit,
  };

  return filter;
};

/**
 * Creates a filter for community request events with environment-based community tag
 * @param limit - Maximum number of events to return
 * @returns Filter for community request events
 */
export const createCommunityRequestFilterFromEnv = (
  limit: number = 100
): Filter => {
  const communityATag = getCommunityATagFromEnv();
  return createCommunityRequestFilter(communityATag, limit);
};

/**
 * Validates if an event is a valid community request
 * @param event - The event to validate
 * @returns True if the event is a valid community request
 */
export const isValidCommunityRequest = (event: Event): boolean => {
  return (
    event.kind === 1111 && // NIP-72: Community Request -> NIP-7D
    event.tags.some(tag => tag[0] === 't' && tag[1] === 'community-request') &&
    event.content.length > 0
  );
};
