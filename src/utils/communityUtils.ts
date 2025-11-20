/**
 * Community utilities for NIP-72 implementation
 */

import { type Event, type Filter, type UnsignedEvent } from 'nostr-tools';

const COMMUNITY_KIND = '34550';

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
  return `${COMMUNITY_KIND}:${community_id}:${community_identifier}`;
};

export interface CommunityATagParts {
  community_id: string;
  community_identifier: string;
}

/**
 * Parses a community a tag (34550:community_id:community_identifier)
 */
export const parseCommunityATag = (aTag: string): CommunityATagParts | null => {
  const [kind, community_id, community_identifier] = aTag.split(':');
  if (
    !kind ||
    kind !== COMMUNITY_KIND ||
    !community_id ||
    !community_identifier
  ) {
    return null;
  }

  return {
    community_id,
    community_identifier,
  };
};

/**
 * Returns featured community a tags defined in env (comma separated)
 */
export const getFeaturedCommunityATags = (): string[] => {
  const envValue = import.meta.env.VITE_NOSTR_FEATURED_COMMUNITIES || '';
  console.log('envValue', envValue);
  return envValue
    .split(',')
    .map((tag: string) => tag.trim())
    .filter(Boolean);
};

export const getFeaturedCommunityConfigs = (): Array<
  CommunityATagParts & { aTag: string }
> => {
  const featuredCommunityConfigs = getFeaturedCommunityATags().map(aTag => {
    const parts = parseCommunityATag(aTag);
    if (!parts) {
      // eslint-disable-next-line no-console
      console.warn(
        `Invalid community a tag "${aTag}" in VITE_NOSTR_FEATURED_COMMUNITIES. Expected format ${COMMUNITY_KIND}:community_id:community_identifier`
      );
      return null;
    }
    return {
      ...parts,
      aTag,
    };
  });
  featuredCommunityConfigs.forEach(config => {
    console.log('config', config);
  });
  return featuredCommunityConfigs.filter(
    (config): config is CommunityATagParts & { aTag: string } => config !== null
  );
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

/**
 * Creates an updated community definition event with a new moderator added
 * This is a replaceable event (kind 34550 with d tag), so publishing this will replace the old one
 * @param currentEvent - The current community definition event
 * @param newModeratorPubkey - The public key of the new moderator to add
 * @param moderatorRelay - Optional relay URL for the new moderator
 * @returns Unsigned event with the new moderator added
 */
export const createUpdatedCommunityDefinitionWithModerator = (
  currentEvent: Event,
  newModeratorPubkey: string,
  moderatorRelay?: string
): UnsignedEvent => {
  // Get the d tag (identifier) from the current event
  const dTag = currentEvent.tags.find(tag => tag[0] === 'd');
  if (!dTag || !dTag[1]) {
    throw new Error('Current community event must have a d tag');
  }

  // Get all existing tags except moderator p tags
  const existingTags = currentEvent.tags.filter(
    tag => !(tag[0] === 'p' && tag[3] === 'moderator')
  );

  // Get existing moderators
  const existingModerators = currentEvent.tags
    .filter(tag => tag[0] === 'p' && tag[3] === 'moderator')
    .map(tag => tag[1]);

  // Check if moderator already exists
  if (existingModerators.includes(newModeratorPubkey)) {
    throw new Error('Moderator already exists in community');
  }

  // Create new moderator tag
  const newModeratorTag: string[] = ['p', newModeratorPubkey];
  newModeratorTag.push(moderatorRelay || '');
  newModeratorTag.push('moderator');

  // Re-add all existing moderator tags
  const moderatorTags = currentEvent.tags
    .filter(tag => tag[0] === 'p' && tag[3] === 'moderator')
    .map(tag => [...tag]); // Clone the tag arrays

  // Add the new moderator tag
  moderatorTags.push(newModeratorTag);

  // Combine all tags: existing non-moderator tags + all moderator tags
  const allTags = [...existingTags, ...moderatorTags];

  return {
    kind: 34550,
    pubkey: currentEvent.pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: allTags,
    content: currentEvent.content,
  };
};
