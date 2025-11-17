/**
 * Nostr Data Utilities
 * Centralized functions for creating Nostr events and filters
 */

import { type Event, type Filter } from 'nostr-tools';
import type { RequestData } from '../hooks/useRequests';
import { getDTag } from './editEventUtils';

// ============================================================================
// FILTER CREATION FUNCTIONS
// ============================================================================

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

// ============================================================================
// EVENT PROCESSING FUNCTIONS
// ============================================================================

/**
 * Processes community request events into RequestData format
 * Deduplicates by d tag to show only the latest version of each request
 * @param events - Array of Nostr events
 * @returns Array of processed request data (deduplicated by d tag)
 */
export const processCommunityRequestEvents = (
  events: Event[]
): Omit<RequestData, 'status'>[] => {
  // Filter for community request events (kind 1111)
  const requestEvents = events.filter(event => event.kind === 1111);

  if (requestEvents.length === 0) {
    return [];
  }

  // Group events by d tag, kind, and pubkey to find unique requests
  // Each group represents a request (original + edits)
  const requestGroups = new Map<string, Event[]>();

  requestEvents.forEach(event => {
    const dTag = getDTag(event);
    if (!dTag) {
      // Events without d tags are treated individually (shouldn't happen for requests, but handle it)
      const key = `${event.kind}:${event.pubkey}:${event.id}`;
      requestGroups.set(key, [event]);
      return;
    }

    // Key: kind:dTag:pubkey - identifies a unique request
    const key = `${event.kind}:${dTag}:${event.pubkey}`;
    if (!requestGroups.has(key)) {
      requestGroups.set(key, []);
    }
    requestGroups.get(key)!.push(event);
  });

  // For each group, get both the original event (for ID) and latest event (for content)
  // This handles the replaceable event pattern where edits have the same d tag
  const requestData: Array<{
    originalEvent: Event;
    latestEvent: Event;
  }> = [];

  requestGroups.forEach(groupEvents => {
    if (groupEvents.length === 1) {
      requestData.push({
        originalEvent: groupEvents[0],
        latestEvent: groupEvents[0],
      });
    } else {
      // Multiple events with same d tag
      // Sort by created_at: oldest first (original), newest first (latest)
      const sorted = groupEvents.sort((a, b) => a.created_at - b.created_at);
      const originalEvent = sorted[0];
      const latestEvent = sorted[sorted.length - 1];
      requestData.push({
        originalEvent,
        latestEvent,
      });
    }
  });

  // Process the events into RequestData format
  // Use original event ID for navigation, but latest event content for display
  return requestData
    .map(({ originalEvent, latestEvent }) => {
      try {
        const content = latestEvent.content; // Use latest content

        // Extract community a tag if present (NIP-72)
        const communityATag =
          latestEvent.tags.find(tag => tag[0] === 'a')?.[1] || '';
        const titleTag =
          latestEvent.tags.find(tag => tag[0] === 'title')?.[1] || '';

        return {
          id: originalEvent.id, // Use original event ID for stable navigation
          dTag: getDTag(originalEvent) || getDTag(latestEvent) || undefined,
          title: titleTag || content,
          description: content || 'No message',
          author: originalEvent.pubkey, // Use original author
          createdAt: originalEvent.created_at, // Use original creation time
          timestamp: latestEvent.created_at, // But sort by latest update time
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
 * @returns Array of thread events with level, isRoot, and isEdit properties
 */
export const processThreadEvents = (events: Event[], requestId: string) => {
  const uniqueEvents = events.filter(
    (event, index, arr) => arr.findIndex(e => e.id === event.id) === index
  );

  if (uniqueEvents.length === 0) return [];

  const threadEvents: Array<
    Event & { level: number; isRoot: boolean; isEdit: boolean }
  > = [];

  // Find the main request
  const mainRequest = uniqueEvents.find(event => event.id === requestId);
  if (!mainRequest) {
    return [];
  }

  // Get the d tag and pubkey from the original request to identify edits
  const requestDTag = getDTag(mainRequest);
  const requestPubkey = mainRequest.pubkey;

  threadEvents.push({
    ...mainRequest,
    level: 0,
    isRoot: true,
    isEdit: false,
  });

  // Process all events that reference this request
  const allReplies = uniqueEvents.filter(
    event =>
      event.id !== requestId &&
      event.kind === 1111 && // Text notes (replies)
      event.tags.some(tag => tag[0] === 'e' && tag[1] === requestId) &&
      !threadEvents.some(threadEvent => threadEvent.id === event.id)
  );

  // Identify edits: events with the same d tag and pubkey as the original request
  const isEditEvent = (event: Event): boolean => {
    if (!requestDTag) return false;
    const eventDTag = getDTag(event);
    return (
      eventDTag === requestDTag &&
      event.pubkey === requestPubkey &&
      event.id !== requestId
    );
  };

  // Separate edits from regular replies
  const edits = allReplies.filter(isEditEvent);
  const regularReplies = allReplies.filter(event => !isEditEvent(event));

  // Sort edits by timestamp
  edits.sort((a, b) => a.created_at - b.created_at);

  // Add edit events to thread (marked as edits)
  const processedEdits = edits.map(edit => ({
    ...edit,
    level: 0, // Edits are at the same level as the root
    isRoot: false,
    isEdit: true,
  }));

  // Sort regular replies by timestamp
  regularReplies.sort((a, b) => a.created_at - b.created_at);

  // Build thread hierarchy using NIP-10 logic for regular replies
  const processedReplies = regularReplies.map(reply => {
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
      isEdit: false,
    };
  });

  // Add processed edits and replies to thread
  threadEvents.push(...processedEdits, ...processedReplies);

  return threadEvents;
};
