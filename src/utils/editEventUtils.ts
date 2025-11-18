/**
 * Edit Event Utilities
 * Functions for creating and processing edited events using replaceable event pattern
 * Edited events use the same kind, d tag, and pubkey as the original event
 * They reference the original event via an e tag
 */

import { type Event, type UnsignedEvent } from 'nostr-tools';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts the d tag from an event
 * @param event - The event to extract from
 * @returns The d tag value or empty string
 */
export const getDTag = (event: Event): string => {
  return event.tags.find(tag => tag[0] === 'd')?.[1] || '';
};

/**
 * Gets the latest replaceable event for a given d tag and pubkey
 * Replaceable events are identified by having the same kind, d tag, and pubkey
 * The latest event (by created_at) is the current version
 * @param events - Array of events to search
 * @param originalEvent - The original event to find replacements for
 * @returns The latest replaceable event or the original if no replacement found
 */
export const getLatestReplaceableEvent = (
  events: Event[],
  originalEvent: Event
): Event => {
  const dTag = getDTag(originalEvent);
  if (!dTag) {
    // If original has no d tag, return it as-is
    return originalEvent;
  }

  // Find all events with same kind, d tag, and pubkey
  const replaceableEvents = events.filter(
    event =>
      event.kind === originalEvent.kind &&
      getDTag(event) === dTag &&
      event.pubkey === originalEvent.pubkey
  );

  if (replaceableEvents.length === 0) {
    return originalEvent;
  }

  // Sort by created_at (newest first) and return the latest
  const sorted = replaceableEvents.sort((a, b) => b.created_at - a.created_at);
  return sorted[0];
};

/**
 * Checks if an event is an edit/replacement of another event
 * An event is considered an edit if it has:
 * - Same kind, d tag, and pubkey as the original
 * - An e tag referencing the original event ID
 * - Later created_at timestamp
 * @param event - The event to check
 * @param originalEvent - The original event
 * @returns True if the event is a replacement/edit
 */
export const isReplacementEvent = (
  event: Event,
  originalEvent: Event
): boolean => {
  const dTag = getDTag(originalEvent);
  if (!dTag) return false;

  return (
    event.kind === originalEvent.kind &&
    getDTag(event) === dTag &&
    event.pubkey === originalEvent.pubkey &&
    event.created_at > originalEvent.created_at &&
    event.tags.some(tag => tag[0] === 'e' && tag[1] === originalEvent.id)
  );
};

/**
 * Checks if an event has been edited (has a replacement)
 * @param events - Array of events to check
 * @param originalEvent - The original event
 * @returns True if a replacement event exists
 */
export const hasBeenEdited = (
  events: Event[],
  originalEvent: Event
): boolean => {
  return events.some(event => isReplacementEvent(event, originalEvent));
};

// ============================================================================
// EDIT EVENT CREATION FUNCTIONS
// ============================================================================

/**
 * Creates an edited version of a request or comment event
 * Uses the same kind, d tag, and pubkey as the original
 * Adds an e tag to reference the original event
 * @param originalEvent - The original event being edited
 * @param newContent - The new text content
 * @param options - Optional parameters
 * @returns Unsigned event that replaces the original
 */
export const createEditedEvent = (
  originalEvent: Event,
  newContent: string,
  options: {
    communityATag: string;
    preserveTags?: boolean; // If true, preserve all tags from original except e tag
    newTitle?: string; // Optional new title for request events
  }
): UnsignedEvent => {
  const dTag = getDTag(originalEvent);
  const communityATag = options.communityATag;

  // Start with tags from original if preserveTags is true
  let tags: string[][];
  if (options.preserveTags) {
    // Filter out existing e tags that reference the original
    tags = originalEvent.tags.filter(
      tag => !(tag[0] === 'e' && tag[1] === originalEvent.id)
    );

    // If newTitle is provided, update or add the title tag
    if (options.newTitle !== undefined) {
      // Remove existing title tag
      tags = tags.filter(tag => tag[0] !== 'title');
      // Add new title tag
      tags.push(['title', options.newTitle]);
    }
  } else {
    // For requests, preserve important tags
    if (originalEvent.kind === 1111) {
      const titleTag = originalEvent.tags.find(tag => tag[0] === 'title');
      const topicTag = originalEvent.tags.find(tag => tag[0] === 't');
      const aTag = originalEvent.tags.find(tag => tag[0] === 'a');
      const ATag = originalEvent.tags.find(tag => tag[0] === 'A');
      const kTag = originalEvent.tags.find(tag => tag[0] === 'k');
      const KTag = originalEvent.tags.find(tag => tag[0] === 'K');
      const pTags = originalEvent.tags.filter(tag => tag[0] === 'p');
      const PTags = originalEvent.tags.filter(tag => tag[0] === 'P');

      tags = [];
      if (dTag) tags.push(['d', dTag]);
      if (topicTag) tags.push(topicTag);
      // Use newTitle if provided, otherwise use existing title tag
      if (options.newTitle !== undefined) {
        tags.push(['title', options.newTitle]);
      } else if (titleTag) {
        tags.push(titleTag);
      }
      if (aTag) tags.push(aTag);
      if (ATag) tags.push(ATag);
      if (kTag) tags.push(kTag);
      if (KTag) tags.push(KTag);
      pTags.forEach(pTag => tags.push(pTag));
      PTags.forEach(PTag => tags.push(PTag));
    } else {
      // For replies, preserve e and p tags (thread structure)
      tags = originalEvent.tags.filter(
        tag => tag[0] === 'e' || tag[0] === 'p' || tag[0] === 'A'
      );
    }

    // Remove d tag if it exists (will be added back)
    tags = tags.filter(tag => tag[0] !== 'd');

    // Ensure d tag is first
    if (dTag) {
      tags.unshift(['d', dTag]);
    }
  }

  // Add e tag to reference the original event
  tags.push(['e', originalEvent.id, '', 'reply']);

  // Add community a tag if not already present
  if (communityATag && !tags.some(tag => tag[0] === 'a')) {
    tags.push(['a', communityATag]);
  }

  return {
    kind: originalEvent.kind, // Same kind as original
    content: newContent,
    tags,
    created_at: Math.floor(Date.now() / 1000),
    pubkey: originalEvent.pubkey, // Same pubkey as original
  };
};
