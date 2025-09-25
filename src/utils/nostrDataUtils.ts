/**
 * Nostr Data Utilities
 * Centralized functions for creating Nostr events and filters
 */

import { type Event, type Filter, type UnsignedEvent } from 'nostr-tools';
import { getCommunityATagFromEnv } from './communityUtils';
import type { RequestFormData } from '../types/RequestFormSchema';
import type { RequestData } from '../hooks/useRequests';

// ============================================================================
// FILTER CREATION FUNCTIONS
// ============================================================================

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
 * Creates a filter for a specific event by ID
 * @param eventId - The ID of the event to fetch
 * @returns Filter for specific event
 */
export const createEventByIdFilter = (eventId: string): Filter => {
  return {
    ids: [eventId],
    limit: 1,
  };
};

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

// ============================================================================
// REQUEST CREATION FUNCTIONS
// ============================================================================

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

  return {
    kind: 1111, // NIP-72: Community Request -> NIP-7D
    content: data.message,
    tags: [
      ['d', `request-${Date.now()}`], // Unique identifier
      ['t', 'community-request'], // Topic tag
      ['title', data.subject],
      ['a', communityATag], // Community a tag
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey || '', // Set the public key if authenticated, empty if not
  };
};

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

// ============================================================================
// EVENT PROCESSING FUNCTIONS
// ============================================================================

/**
 * Processes community request events into RequestData format
 * @param events - Array of Nostr events
 * @returns Array of processed request data
 */
export const processCommunityRequestEvents = (
  events: Event[]
): Omit<RequestData, 'status'>[] => {
  return events
    .filter(event => event.kind === 1111) // NIP-72: Community Request -> NIP-7D
    .map(event => {
      try {
        const content = event.content;

        // Extract community a tag if present (NIP-72)
        const communityATag = event.tags.find(tag => tag[0] === 'a')?.[1] || '';
        const titleTag = event.tags.find(tag => tag[0] === 'title')?.[1] || '';

        return {
          id: event.id,
          title: titleTag || content,
          description: content || 'No message',
          author: event.pubkey,
          createdAt: event.created_at,
          timestamp: event.created_at,
          communityATag, // Add community a tag for NIP-72 compliance
        };
      } catch {
        return null;
      }
    })
    .filter(
      (request): request is NonNullable<typeof request> => request !== null
    )
    .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
};

/**
 * Processes events into a thread structure following NIP-10
 * @param events - Array of Nostr events
 * @param requestId - The ID of the main request
 * @returns Array of thread events with level and isRoot properties
 */
export const processThreadEvents = (events: Event[], requestId: string) => {
  const uniqueEvents = events.filter(
    (event, index, arr) => arr.findIndex(e => e.id === event.id) === index
  );

  if (uniqueEvents.length === 0) return [];

  const threadEvents: Array<Event & { level: number; isRoot: boolean }> = [];

  // Find the main request
  const mainRequest = uniqueEvents.find(event => event.id === requestId);
  if (mainRequest) {
    threadEvents.push({
      ...mainRequest,
      level: 0,
      isRoot: true,
    });
  }

  // Process all events that reference this request
  const allReplies = uniqueEvents.filter(
    event =>
      event.id !== requestId &&
      event.kind === 1111 && // Text notes (replies)
      event.tags.some(tag => tag[0] === 'e' && tag[1] === requestId) &&
      !threadEvents.some(threadEvent => threadEvent.id === event.id)
  );

  // Sort replies by timestamp
  allReplies.sort((a, b) => a.created_at - b.created_at);

  // Build thread hierarchy using NIP-10 logic
  const processedReplies = allReplies.map(reply => {
    // Analyze the 'e' tags to determine reply level
    const eventTags = reply.tags.filter(tag => tag[0] === 'e');
    let level = 1; // Default level for direct replies

    if (eventTags.length > 1) {
      // Check if this is a reply to another reply
      const replyToEventId = eventTags[1]?.[1]; // Second 'e' tag
      if (replyToEventId && replyToEventId !== requestId) {
        // This is a reply to another reply
        level = 2;
      }
    }

    return {
      ...reply,
      level,
      isRoot: false,
    };
  });

  // Add processed replies to thread
  threadEvents.push(...processedReplies);

  return threadEvents;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

/**
 * Extracts the community a tag from an event
 * @param event - The event to extract from
 * @returns The community a tag or empty string
 */
export const extractCommunityATag = (event: Event): string => {
  return event.tags.find(tag => tag[0] === 'a')?.[1] || '';
};

/**
 * Extracts event references from an event's tags
 * @param event - The event to extract from
 * @returns Array of event IDs referenced by this event
 */
export const extractEventReferences = (event: Event): string[] => {
  return event.tags
    .filter(tag => tag[0] === 'e')
    .map(tag => tag[1])
    .filter(Boolean);
};

/**
 * Extracts public key references from an event's tags
 * @param event - The event to extract from
 * @returns Array of public keys referenced by this event
 */
export const extractPublicKeyReferences = (event: Event): string[] => {
  return event.tags
    .filter(tag => tag[0] === 'p')
    .map(tag => tag[1])
    .filter(Boolean);
};
