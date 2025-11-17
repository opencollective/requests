/**
 * Community utilities for NIP-72 implementation
 */

import { type Event, type Filter } from 'nostr-tools';

export interface CommunityInfo {
  id: string;
  identifier: string;
  name: string;
  description: string;
  image?: string;
  moderators: string[];
  relays: {
    author?: string;
    requests?: string;
    approvals?: string;
    general?: string[];
  };
  createdAt: number;
  pubkey: string;
}
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
 * Parses a community ID from URL format (community_id:identifier)
 * @param communityId - The community ID from URL (format: "pubkey:identifier")
 * @returns Object containing community_id and community_identifier, or null if invalid
 */
export const parseCommunityId = (
  communityId: string
): { community_id: string; community_identifier: string } | null => {
  const parts = communityId.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return {
    community_id: parts[0],
    community_identifier: parts[1],
  };
};

/**
 * Gets community environment variables with fallbacks
 * @param overrideCommunityId - Optional community ID to use instead of env
 * @param overrideIdentifier - Optional identifier to use instead of env
 * @returns Object containing community_id and community_identifier
 */
export const getCommunityConfig = (
  overrideCommunityId?: string,
  overrideIdentifier?: string
) => {
  const community_id =
    overrideCommunityId || import.meta.env.VITE_NOSTR_COMMUNITY_ID;
  const community_identifier =
    overrideIdentifier || import.meta.env.VITE_NOSTR_COMMUNITY_IDENTIFIER;

  if (!community_id || !community_identifier) {
    // eslint-disable-next-line no-console
    console.warn(
      'Missing NOSTR community configuration. Please provide community_id and identifier or set VITE_NOSTR_COMMUNITY_ID and VITE_NOSTR_COMMUNITY_IDENTIFIER'
    );
  }

  return {
    community_id: community_id || '',
    community_identifier: community_identifier || '',
  };
};

/**
 * Creates a complete community a tag using environment variables or provided parameters
 * @param overrideCommunityId - Optional community ID to use instead of env
 * @param overrideIdentifier - Optional identifier to use instead of env
 * @returns The formatted community a tag or empty string if not configured
 */
export const getCommunityATagFromEnv = (
  overrideCommunityId?: string,
  overrideIdentifier?: string
): string => {
  const { community_id, community_identifier } = getCommunityConfig(
    overrideCommunityId,
    overrideIdentifier
  );
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

/**
 * Parses a community definition event (kind 34550) into CommunityInfo
 * @param event - The event to parse
 * @returns Parsed community info or null if parsing fails
 */
export const parseCommunityDefinitionEvent = (
  event: Event
): CommunityInfo | null => {
  try {
    const identifier =
      event.tags.find(tag => tag[0] === 'd')?.[1] || event.id || '';
    const nameTag = event.tags.find(tag => tag[0] === 'name')?.[1] || '';
    const descriptionTag =
      event.tags.find(tag => tag[0] === 'description')?.[1] || '';
    const imageTag = event.tags.find(tag => tag[0] === 'image');

    const moderators = event.tags
      .filter(tag => tag[0] === 'p' && tag[3] === 'moderator')
      .map(tag => tag[1])
      .filter(Boolean);

    const relayTags = event.tags.filter(tag => tag[0] === 'relay');
    const relays: CommunityInfo['relays'] = {
      general: [],
    };

    relayTags.forEach(tag => {
      const relayUrl = tag[1];
      const purpose = tag[2];

      if (purpose === 'author') {
        relays.author = relayUrl;
      } else if (purpose === 'requests') {
        relays.requests = relayUrl;
      } else if (purpose === 'approvals') {
        relays.approvals = relayUrl;
      } else if (relayUrl) {
        relays.general?.push(relayUrl);
      }
    });

    return {
      id: event.id,
      identifier,
      name: nameTag,
      description: descriptionTag,
      image: imageTag?.[1],
      moderators,
      relays,
      createdAt: event.created_at,
      pubkey: event.pubkey,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse community definition event:', err);
    return null;
  }
};

export interface CommunityQueryOptions {
  limit?: number;
  authors?: string[];
  identifiers?: string[];
}

/**
 * Creates a filter for querying community definition events (kind 34550)
 * @param options - Filter options such as limit, authors, or identifiers
 * @returns Filter for use with Nostr queries
 */
export const createCommunityDefinitionsFilter = (
  options: CommunityQueryOptions = {}
): Filter => {
  const filter: Filter = {
    kinds: [34550],
    limit: options.limit ?? 50,
  };

  if (options.authors && options.authors.length > 0) {
    filter.authors = options.authors;
  }

  if (options.identifiers && options.identifiers.length > 0) {
    filter['#d'] = options.identifiers;
  }

  return filter;
};
