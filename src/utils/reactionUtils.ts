/**
 * Reaction Event Utilities
 * Functions for creating and processing reaction events (kind 7)
 * Reaction events allow users to react to requests with emojis
 */

import { type Event, type Filter, type UnsignedEvent } from 'nostr-tools';

// ============================================================================
// REACTION TYPES AND CONSTANTS
// ============================================================================

/**
 * Valid emoji reactions
 */
export const REACTION_EMOJIS = {
  HEART: '❤️',
  LIKE: '👍',
  CROSS: '❌',
} as const;

export type ReactionEmoji =
  | typeof REACTION_EMOJIS.HEART
  | typeof REACTION_EMOJIS.LIKE
  | typeof REACTION_EMOJIS.CROSS;

/**
 * Reaction Event (kind 7) - Standard Nostr reaction event
 * References the request using an e tag
 * Includes a p tag with the pubkey of the event being reacted to
 * Content is a single emoji
 */
export interface ReactionEvent extends UnsignedEvent {
  kind: 7;
  content: ReactionEmoji;
  tags: Array<
    | ['e', string] // Event ID of the request being reacted to
    | ['p', string] // Pubkey of the event being reacted to
  >;
}

// ============================================================================
// FILTER CREATION FUNCTIONS
// ============================================================================

/**
 * Creates a filter for reaction events (kind 7) for a specific request
 * @param requestId - The event ID of the request to get reactions for
 * @param limit - Maximum number of events to return
 * @returns Filter for reaction events
 */
export const createReactionFilter = (
  requestId: string,
  limit: number = 100
): Filter => {
  return {
    kinds: [7], // Reaction Event
    '#e': [requestId], // Filter by event ID
    limit,
  };
};

/**
 * Creates a filter for reaction events by multiple request IDs
 * @param requestIds - Array of event IDs to get reactions for
 * @param limit - Maximum number of events to return
 * @returns Filter for reaction events
 */
export const createReactionFilterMultiple = (
  requestIds: string[],
  limit: number = 100
): Filter => {
  return {
    kinds: [7], // Reaction Event
    '#e': requestIds, // Filter by multiple event IDs
    limit,
  };
};

// ============================================================================
// REACTION EVENT CREATION FUNCTIONS
// ============================================================================

/**
 * Creates a reaction event (kind 7) for a request
 * @param requestId - The event ID of the request being reacted to
 * @param requestPubkey - The pubkey of the request event being reacted to
 * @param emoji - The emoji reaction (heart, like, or cross)
 * @param userPublicKey - User's public key
 * @returns Unsigned reaction event
 */
export const createReactionEvent = (
  requestId: string,
  requestPubkey: string,
  emoji: ReactionEmoji,
  userPublicKey: string
): ReactionEvent => {
  return {
    kind: 7, // Reaction Event
    content: emoji,
    tags: [
      ['e', requestId], // Reference to the request event
      ['p', requestPubkey], // Pubkey of the event being reacted to
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey,
  };
};

// ============================================================================
// EVENT PROCESSING FUNCTIONS
// ============================================================================

/**
 * Filters out reaction events that have been deleted (kind 5)
 * @param reactionEvents - Array of reaction events (kind 7)
 * @param allEvents - Array of all events (including deletion events)
 * @returns Array of reaction events that haven't been deleted
 */
export const filterDeletedReactions = (
  reactionEvents: Event[],
  allEvents: Event[]
): Event[] => {
  // Get all deletion events (kind 5)
  const deletionEvents = allEvents.filter(event => event.kind === 5);

  // Create a set of deleted event IDs
  const deletedEventIds = new Set<string>();
  deletionEvents.forEach(deletionEvent => {
    deletionEvent.tags.forEach(tag => {
      if (tag[0] === 'e' && tag[1]) {
        deletedEventIds.add(tag[1]);
      }
    });
  });

  // Filter out reactions that have been deleted
  return reactionEvents.filter(reaction => !deletedEventIds.has(reaction.id));
};

/**
 * Processes reaction events (kind 7) into a structured format
 * @param events - Array of Nostr events
 * @param requestId - Optional request ID to filter by
 * @returns Array of processed reaction data grouped by emoji
 */
export const processReactionEvents = (
  events: Event[],
  requestId?: string
): {
  emoji: string;
  count: number;
  reactors: string[]; // Array of pubkeys who reacted
  events: Event[]; // All reaction events for this emoji
}[] => {
  // Filter for reaction events
  let reactionEvents = events.filter(event => event.kind === 7);

  // Filter out deleted reactions
  reactionEvents = filterDeletedReactions(reactionEvents, events);

  // Filter by request ID if provided
  if (requestId) {
    reactionEvents = reactionEvents.filter(event =>
      event.tags.some(tag => tag[0] === 'e' && tag[1] === requestId)
    );
  }

  // Group reactions by emoji
  const reactionsByEmoji = new Map<
    string,
    { reactors: Set<string>; events: Event[] }
  >();

  reactionEvents.forEach(event => {
    const emoji = event.content.trim();
    if (!emoji) return; // Skip empty reactions

    if (!reactionsByEmoji.has(emoji)) {
      reactionsByEmoji.set(emoji, { reactors: new Set(), events: [] });
    }

    const reactionData = reactionsByEmoji.get(emoji)!;
    reactionData.reactors.add(event.pubkey);
    reactionData.events.push(event);
  });

  // Convert to array format
  return Array.from(reactionsByEmoji.entries())
    .map(([emoji, data]) => ({
      emoji,
      count: data.reactors.size,
      reactors: Array.from(data.reactors),
      events: data.events,
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
};

/**
 * Gets all reactions for a specific request
 * @param events - Array of all events
 * @param requestId - The request event ID
 * @returns Array of reaction data grouped by emoji
 */
export const getReactionsForRequest = (events: Event[], requestId: string) => {
  return processReactionEvents(events, requestId);
};

/**
 * Checks if a user has reacted to a request with a specific emoji
 * @param events - Array of reaction events (should include all events for deletion checking)
 * @param requestId - The request event ID
 * @param userPubkey - The user's public key
 * @param emoji - The emoji to check for
 * @returns True if the user has reacted with this emoji (and it hasn't been deleted)
 */
export const hasUserReacted = (
  events: Event[],
  requestId: string,
  userPubkey: string,
  emoji: ReactionEmoji
): boolean => {
  // Get all reaction events
  const reactionEvents = events.filter(event => event.kind === 7);

  // Filter out deleted reactions
  const activeReactions = filterDeletedReactions(reactionEvents, events);

  return activeReactions.some(
    event =>
      event.pubkey === userPubkey &&
      event.content.trim() === emoji &&
      event.tags.some(tag => tag[0] === 'e' && tag[1] === requestId)
  );
};

/**
 * Gets the user's reaction for a specific request
 * @param events - Array of reaction events
 * @param requestId - The request event ID
 * @param userPubkey - The user's public key
 * @returns The emoji the user reacted with, or null if no reaction
 */
export const getUserReaction = (
  events: Event[],
  requestId: string,
  userPubkey: string
): ReactionEmoji | null => {
  const userReaction = events.find(
    event =>
      event.kind === 7 &&
      event.pubkey === userPubkey &&
      event.tags.some(tag => tag[0] === 'e' && tag[1] === requestId)
  );

  if (!userReaction) return null;

  const emoji = userReaction.content.trim();
  // Validate it's one of our allowed emojis
  if (
    emoji === REACTION_EMOJIS.HEART ||
    emoji === REACTION_EMOJIS.LIKE ||
    emoji === REACTION_EMOJIS.CROSS
  ) {
    return emoji as ReactionEmoji;
  }

  return null;
};

/**
 * Finds the user's reaction event for a specific request and emoji
 * @param events - Array of reaction events (should include all events for deletion checking)
 * @param requestId - The request event ID
 * @param userPubkey - The user's public key
 * @param emoji - The emoji to find
 * @returns The reaction event, or null if not found (or if it was deleted)
 */
export const getUserReactionEvent = (
  events: Event[],
  requestId: string,
  userPubkey: string,
  emoji: ReactionEmoji
): Event | null => {
  // Get all reaction events
  const reactionEvents = events.filter(event => event.kind === 7);

  // Filter out deleted reactions
  const activeReactions = filterDeletedReactions(reactionEvents, events);

  return (
    activeReactions.find(
      event =>
        event.pubkey === userPubkey &&
        event.content.trim() === emoji &&
        event.tags.some(tag => tag[0] === 'e' && tag[1] === requestId)
    ) || null
  );
};

/**
 * Creates a deletion event (kind 5) to remove a reaction
 * @param reactionEventId - The ID of the reaction event to delete
 * @param userPublicKey - User's public key
 * @returns Unsigned deletion event
 */
export const createDeletionEvent = (
  reactionEventId: string,
  userPublicKey: string
): UnsignedEvent => {
  return {
    kind: 5, // Deletion Event (NIP-09)
    content: '',
    tags: [['e', reactionEventId]], // Reference to the reaction event to delete
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey,
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates if an event is a valid reaction event
 * @param event - The event to validate
 * @returns True if the event is a valid reaction event
 */
export const isValidReactionEvent = (event: Event): boolean => {
  return (
    event.kind === 7 && // Reaction Event
    event.tags.some(tag => tag[0] === 'e' && tag[1]) && // Must have e tag (request reference)
    event.tags.some(tag => tag[0] === 'p' && tag[1]) && // Must have p tag (pubkey reference)
    event.content.trim().length > 0 // Must have content (emoji)
  );
};

/**
 * Validates if an emoji is a valid reaction emoji
 * @param emoji - The emoji to validate
 * @returns True if the emoji is valid
 */
export const isValidReactionEmoji = (emoji: string): emoji is ReactionEmoji => {
  return (
    emoji === REACTION_EMOJIS.HEART ||
    emoji === REACTION_EMOJIS.LIKE ||
    emoji === REACTION_EMOJIS.CROSS
  );
};
