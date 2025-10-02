/**
 * Status Event Utilities
 * Functions for creating and processing status events (kind 9078)
 * Status events track the status of community requests
 */

import { type Event, type Filter, type UnsignedEvent } from 'nostr-tools';

// ============================================================================
// STATUS OPTIONS AND INTERFACES
// ============================================================================

/**
 * Status option configuration
 */
export interface StatusOption {
  value: string;
  label: string;
  color: string;
}

/**
 * Available status options with their display labels and colors
 */
export const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'new',
    label: 'New',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    value: 'in-progress',
    label: 'In Progress',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    value: 'rejected',
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    value: 'completed',
    label: 'Completed',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  },
];

/**
 * Status Event (kind 9078) - Tracks the status of community requests
 * The d tag references the original request event ID
 */
export interface StatusEvent extends UnsignedEvent {
  kind: 9078;
  tags: Array<
    | ['d', string] // Event ID of the original request being referenced
    | ['status', string] // Status of the referenced request
    | ['a', string] // Community reference (optional)
  >;
}

// ============================================================================
// FILTER CREATION FUNCTIONS
// ============================================================================

/**
 * Creates a filter for status events (kind 9078)
 * @param requestId - Optional request ID to filter by (d tag)
 * @param status - Optional status to filter by
 * @param moderators - Optional array of moderator pubkeys to filter by
 * @param limit - Maximum number of events to return
 * @returns Filter for status events
 */
export const createStatusEventFilter = (
  requestId?: string,
  status?: string,
  moderators?: string[],
  limit: number = 100
): Filter => {
  const filter: Filter = {
    kinds: [9078], // Status Event
    limit,
  };

  if (requestId) {
    filter['#d'] = [requestId];
  }

  if (status) {
    filter['#status'] = [status];
  }

  if (moderators && moderators.length > 0) {
    filter.authors = moderators;
  }

  return filter;
};

/**
 * Creates a filter for status events by request ID (d tag)
 * @param requestId - The request ID (d tag) to filter by
 * @param moderators - Optional array of moderator pubkeys to filter by
 * @param limit - Maximum number of events to return
 * @returns Filter for status events by request ID
 */
export const createStatusEventByRequestIdFilter = (
  requestId: string,
  moderators?: string[],
  limit: number = 1
): Filter => {
  const filter: Filter = {
    kinds: [9078], // Status Event
    '#d': [requestId],
    limit,
  };

  if (moderators && moderators.length > 0) {
    filter.authors = moderators;
  }

  return filter;
};

// ============================================================================
// STATUS EVENT CREATION FUNCTIONS
// ============================================================================

/**
 * Creates a status event (kind 9078) for tracking request status
 * @param requestId - The ID of the request being referenced (used as d tag)
 * @param status - The status of the request
 * @param userPublicKey - User's public key
 * @param options - Optional parameters for the status event
 * @returns Unsigned status event
 */
export const createStatusEvent = (
  requestId: string,
  status: string,
  userPublicKey: string,
  options: {
    communityATag?: string;
  } = {}
): StatusEvent => {
  const tags: Array<['d', string] | ['status', string] | ['a', string]> = [
    ['d', requestId], // Reference to the original request event ID
    ['status', status], // Status of the referenced request
  ];

  // Add community reference if provided
  if (options.communityATag) {
    tags.push(['a', options.communityATag]);
  }

  return {
    kind: 9078, // Status Event
    content: `Status updated to: ${status}`,
    tags,
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey,
  };
};

// ============================================================================
// EVENT PROCESSING FUNCTIONS
// ============================================================================

/**
 * Processes status events (kind 9078) into a structured format
 * @param events - Array of Nostr events
 * @returns Array of processed status event data
 */
export const processStatusEvents = (events: Event[]) => {
  return events
    .filter(event => event.kind === 9078) // Status Event
    .map(event => {
      try {
        const dTag = event.tags.find(tag => tag[0] === 'd')?.[1] || '';
        const status = event.tags.find(tag => tag[0] === 'status')?.[1] || '';
        const communityATag = event.tags.find(tag => tag[0] === 'a')?.[1] || '';

        return {
          id: event.id,
          dTag, // d tag is the same as requestId
          requestId: dTag, // d tag references the request event ID
          status,
          author: event.pubkey,
          createdAt: new Date(event.created_at * 1000).toISOString(),
          timestamp: event.created_at,
          communityATag,
        };
      } catch {
        return null;
      }
    })
    .filter(
      (statusEvent): statusEvent is NonNullable<typeof statusEvent> =>
        statusEvent !== null
    )
    .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates if an event is a valid status event
 * @param event - The event to validate
 * @returns True if the event is a valid status event
 */
export const isValidStatusEvent = (event: Event): boolean => {
  return (
    event.kind === 9078 && // Status Event
    event.tags.some(tag => tag[0] === 'd' && tag[1]) && // Must have d tag (request reference)
    event.tags.some(tag => tag[0] === 'status' && tag[1]) && // Must have status tag
    event.content.length > 0
  );
};

/**
 * Extracts the status from a status event
 * @param event - The event to extract from
 * @returns The status or empty string
 */
export const extractStatusEventStatus = (event: Event): string => {
  return event.tags.find(tag => tag[0] === 'status')?.[1] || '';
};

/**
 * Gets the latest status for a request from status events
 * @param events - Array of status events
 * @param requestId - The request ID to get status for
 * @returns The latest status or null if not found
 */
export const getLatestRequestStatus = (
  events: Event[],
  requestId: string
): string | null => {
  const statusEvents = events
    .filter(
      event =>
        event.kind === 9078 &&
        event.tags.some(tag => tag[0] === 'd' && tag[1] === requestId)
    )
    .sort((a, b) => b.created_at - a.created_at); // Sort by newest first

  if (statusEvents.length === 0) return null;

  return extractStatusEventStatus(statusEvents[0]);
};

// ============================================================================
// STATUS OPTIONS UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets the status option configuration for a given status value
 * @param status - The status value to look up
 * @returns The status option or undefined if not found
 */
export const getStatusOption = (status: string): StatusOption | undefined => {
  return STATUS_OPTIONS.find(option => option.value === status);
};

/**
 * Gets the color classes for a given status value
 * @param status - The status value to get colors for
 * @returns The color classes string or default gray colors
 */
export const getStatusColor = (status: string): string => {
  const option = getStatusOption(status);
  return option?.color || 'bg-gray-100 text-gray-800 border-gray-200';
};

/**
 * Gets the display label for a given status value
 * @param status - The status value to get label for
 * @returns The display label or the status value itself
 */
export const getStatusLabel = (status: string): string => {
  const option = getStatusOption(status);
  return option?.label || status;
};

/**
 * Validates if a status value is valid
 * @param status - The status value to validate
 * @returns True if the status is valid
 */
export const isValidStatus = (status: string): boolean => {
  return STATUS_OPTIONS.some(option => option.value === status);
};

/**
 * Gets the container colors for a status event div
 * @param status - The status value to get container colors for
 * @returns The container color classes string
 */
export const getStatusContainerColors = (status: string): string => {
  switch (status) {
    case 'new':
      return 'border-l-4 border-blue-200 pl-4 py-3 bg-blue-50';
    case 'in-progress':
      return 'border-l-4 border-purple-200 pl-4 py-3 bg-purple-50';
    case 'rejected':
      return 'border-l-4 border-red-200 pl-4 py-3 bg-red-50';
    case 'completed':
      return 'border-l-4 border-gray-200 pl-4 py-3 bg-gray-50';
    default:
      return 'border-l-4 border-gray-200 pl-4 py-3 bg-gray-50';
  }
};

/**
 * Checks if a user is a moderator
 * @param userPubkey - The user's public key to check
 * @param moderators - Array of moderator public keys
 * @returns True if the user is a moderator
 */
export const isModerator = (
  userPubkey: string,
  moderators: string[]
): boolean => {
  return moderators.includes(userPubkey);
};
