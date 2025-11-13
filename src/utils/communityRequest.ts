import { type Event, type Filter, type UnsignedEvent } from 'nostr-tools';
import { getCommunityATagFromEnv, getCommunityConfig } from './communityUtils';
import type { RequestFormData } from '../types/RequestFormSchema';

/**
 * Creates a community request event (NIP-72 kind 1111)
 * @param data - Request form data
 * @param userPublicKey - User's public key (optional for unauthenticated requests)
 * @param overrideCommunityId - Optional community ID to use instead of env
 * @param overrideIdentifier - Optional identifier to use instead of env
 * @returns Unsigned event for community request
 */
export const createCommunityRequestEvent = (
  data: RequestFormData,
  userPublicKey?: string,
  overrideCommunityId?: string,
  overrideIdentifier?: string
): UnsignedEvent => {
  const communityATag = getCommunityATagFromEnv(
    overrideCommunityId,
    overrideIdentifier
  );
  const { community_id } = getCommunityConfig(
    overrideCommunityId,
    overrideIdentifier
  );
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
 * Creates a filter for community request events with environment-based or provided community tag
 * @param limit - Maximum number of events to return
 * @param overrideCommunityId - Optional community ID to use instead of env
 * @param overrideIdentifier - Optional identifier to use instead of env
 * @returns Filter for community request events
 */
export const createCommunityRequestFilterFromEnv = (
  limit: number = 100,
  overrideCommunityId?: string,
  overrideIdentifier?: string
): Filter => {
  const communityATag = getCommunityATagFromEnv(
    overrideCommunityId,
    overrideIdentifier
  );
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
