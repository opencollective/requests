/**
 * Moderator Request Utilities
 * Functions for creating and processing moderator request events (kind 4552)
 * Moderator requests allow users to request to become moderators of a community
 */

import { type Event, type Filter, type UnsignedEvent } from 'nostr-tools';
import { getCommunityATag } from './communityUtils';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Moderator Request Event (kind 4552)
 * Used by users to request to become a moderator of a community
 */
export interface ModeratorRequestEvent extends UnsignedEvent {
  kind: 4552;
  tags: Array<
    | ['a', string] // Community a tag: 34550:community_creator_pubkey:identifier
    | ['role', string] // Role being requested (e.g., "moderator")
  >;
}

/**
 * Parsed moderator request data
 */
export interface ModeratorRequestData {
  id: string;
  pubkey: string;
  communityATag: string;
  role: string;
  content: string;
  createdAt: number;
  event: Event;
}

// ============================================================================
// EVENT CREATION FUNCTIONS
// ============================================================================

/**
 * Creates a moderator request event (kind 4552)
 * @param communityPubkey - The community creator's public key
 * @param communityIdentifier - The community identifier
 * @param userPublicKey - The requesting user's public key
 * @param message - Optional message explaining why they want to be a moderator
 * @returns Unsigned moderator request event
 */
export const createModeratorRequestEvent = (
  communityPubkey: string,
  communityIdentifier: string,
  userPublicKey: string,
  message: string = 'I would like to join this community as a moderator.'
): ModeratorRequestEvent => {
  const communityATag = getCommunityATag(communityPubkey, communityIdentifier);

  return {
    kind: 4552,
    pubkey: userPublicKey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['a', communityATag],
      ['role', 'moderator'],
    ],
    content: message,
  };
};

// ============================================================================
// FILTER CREATION FUNCTIONS
// ============================================================================

/**
 * Creates a filter for moderator request events (kind 4552)
 * @param communityATag - Optional community a tag to filter by
 * @param requestingPubkey - Optional requesting user's pubkey to filter by
 * @param limit - Maximum number of events to return
 * @returns Filter for moderator request events
 */
export const createModeratorRequestFilter = (
  communityATag?: string,
  requestingPubkey?: string,
  limit: number = 100
): Filter => {
  const filter: Filter = {
    kinds: [4552],
    limit,
  };

  if (communityATag) {
    filter['#a'] = [communityATag];
  }

  if (requestingPubkey) {
    filter.authors = [requestingPubkey];
  }

  return filter;
};

// ============================================================================
// EVENT PROCESSING FUNCTIONS
// ============================================================================

/**
 * Parses a moderator request event (kind 4552) into structured data
 * @param event - The event to parse
 * @returns Parsed moderator request data or null if parsing fails
 */
export const parseModeratorRequestEvent = (
  event: Event
): ModeratorRequestData | null => {
  try {
    if (event.kind !== 4552) {
      return null;
    }

    const communityATag = event.tags.find(tag => tag[0] === 'a')?.[1] || '';
    const role = event.tags.find(tag => tag[0] === 'role')?.[1] || '';

    if (!communityATag || !role) {
      return null;
    }

    return {
      id: event.id,
      pubkey: event.pubkey,
      communityATag,
      role,
      content: event.content,
      createdAt: event.created_at,
      event,
    };
  } catch (err) {
    console.error('Failed to parse moderator request event:', err);
    return null;
  }
};

/**
 * Processes an array of moderator request events into structured data
 * @param events - Array of Nostr events
 * @returns Array of parsed moderator request data
 */
export const processModeratorRequestEvents = (
  events: Event[]
): ModeratorRequestData[] => {
  return events
    .map(parseModeratorRequestEvent)
    .filter((request): request is ModeratorRequestData => request !== null)
    .sort((a, b) => b.createdAt - a.createdAt); // Sort by newest first
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates if an event is a valid moderator request event
 * @param event - The event to validate
 * @returns True if the event is a valid moderator request event
 */
export const isValidModeratorRequestEvent = (event: Event): boolean => {
  return (
    event.kind === 4552 &&
    event.tags.some(tag => tag[0] === 'a' && tag[1]) && // Must have a tag (community reference)
    event.tags.some(tag => tag[0] === 'role' && tag[1]) // Must have role tag
  );
};

/**
 * Checks if a user has already requested to be a moderator
 * @param events - Array of moderator request events
 * @param userPubkey - The user's public key to check
 * @param communityATag - The community a tag to check
 * @returns True if the user has already requested
 */
export const hasUserRequestedModerator = (
  events: Event[],
  userPubkey: string,
  communityATag: string
): boolean => {
  return events.some(event => {
    if (event.kind !== 4552 || event.pubkey !== userPubkey) {
      return false;
    }
    const eventCommunityATag = event.tags.find(tag => tag[0] === 'a')?.[1];
    return eventCommunityATag === communityATag;
  });
};
