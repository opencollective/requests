/**
 * Community utilities for NIP-72 implementation
 */

import { type Event } from 'nostr-tools';
/**
 * Creates a community a tag according to NIP-72 specification
 * Format: 34550:community_id:community_identifier
 *
 * @param community_id - The community ID from environment variables
 * @param community_identifier - The community identifier from environment variables
 * @returns The formatted community a tag
 */
export const getCommunityATag = (
  community_id: string,
  community_identifier: string
): string => {
  return `34550:${community_id}:${community_identifier}`;
};

/**
 * Gets community environment variables with fallbacks
 * @returns Object containing community_id and community_identifier
 */
export const getCommunityConfig = () => {
  const community_id = import.meta.env.VITE_NOSTR_COMMUNITY_ID;
  const community_identifier = import.meta.env.VITE_NOSTR_COMMUNITY_IDENTIFIER;

  if (!community_id || !community_identifier) {
    console.warn(
      'Missing NOSTR community environment variables. Please set VITE_NOSTR_COMMUNITY_ID and VITE_NOSTR_COMMUNITY_IDENTIFIER'
    );
  }

  return {
    community_id: community_id || '',
    community_identifier: community_identifier || '',
  };
};

/**
 * Creates a complete community a tag using environment variables
 * @returns The formatted community a tag or empty string if not configured
 */
export const getCommunityATagFromEnv = (): string => {
  const { community_id, community_identifier } = getCommunityConfig();
  if (!community_id || !community_identifier) {
    return '';
  }
  return getCommunityATag(community_id, community_identifier);
};

/**
 * Extracts the community a tag from an event
 * @param event - The event to extract from
 * @returns The community a tag or empty string
 */
export const extractCommunityATag = (event: Event): string => {
  return event.tags.find(tag => tag[0] === 'a')?.[1] || '';
};
