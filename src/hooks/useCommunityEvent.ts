import { useState, useEffect, useCallback } from 'react';
import type { Event, SimplePool } from 'nostr-tools';
import { getCommunityConfig } from '../utils/communityUtils.ts';

export interface CommunityInfo {
  id: string;
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

export interface CommunityEventState {
  communityInfo: CommunityInfo | null;
  isLoading: boolean;
  error: string | null;
  fetchCommunity: () => Promise<void>;
  refreshCommunity: () => Promise<void>;
}

/**
 * Hook to fetch and manage the NIP-72 community definition event
 * This fetches the community event (kind 34550) for the configured community
 */
export function useCommunityEvent(
  isConnected: boolean,
  pool: SimplePool | null,
  relays: string[] | null
): CommunityEventState {
  const [communityInfo, setCommunityInfo] = useState<CommunityInfo | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCommunityEvent = useCallback(
    (event: Event): CommunityInfo | null => {
      try {
        const nameTag = event.tags.find(tag => tag[0] === 'name')?.[1] || '';
        const descriptionTag =
          event.tags.find(tag => tag[0] === 'description')?.[1] || '';
        const imageTag = event.tags.find(tag => tag[0] === 'image');

        // Extract moderators (p tags with 'moderator' marker)
        const moderators = event.tags
          .filter(tag => tag[0] === 'p' && tag[3] === 'moderator')
          .map(tag => tag[1])
          .filter(Boolean);

        // Extract relays with their purposes
        const relayTags = event.tags.filter(tag => tag[0] === 'relay');
        const relays: CommunityInfo['relays'] = {
          general: [],
        };

        relayTags.forEach(tag => {
          const relayUrl = tag[1];
          const purpose = tag[2]; // 'author', 'requests', 'approvals', or undefined for general

          if (purpose === 'author') {
            relays.author = relayUrl;
          } else if (purpose === 'requests') {
            relays.requests = relayUrl;
          } else if (purpose === 'approvals') {
            relays.approvals = relayUrl;
          } else {
            relays.general?.push(relayUrl);
          }
        });

        return {
          id: event.id,
          name: nameTag,
          description: descriptionTag,
          image: imageTag?.[1],
          moderators,
          relays,
          createdAt: event.created_at,
          pubkey: event.pubkey,
        };
      } catch (err) {
        console.error('Failed to parse community event:', err);
        return null;
      }
    },
    []
  );

  const fetchCommunity = useCallback(async () => {
    if (!isConnected || !pool || !relays) {
      setError('Not connected to Nostr relays');
      return;
    }

    const { community_id, community_identifier } = getCommunityConfig();

    if (!community_id || !community_identifier) {
      setError(
        'Community configuration not found. Please set VITE_NOSTR_COMMUNITY_ID and VITE_NOSTR_COMMUNITY_IDENTIFIER'
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Query for community definition event (kind 34550)
      const communityEvents = await pool.querySync(relays, {
        kinds: [34550], // NIP-72: Community Definition
        authors: [community_id],
        '#d': [community_identifier],
        limit: 1,
      });

      if (communityEvents.length === 0) {
        setError(
          `Community not found: ${community_id}:${community_identifier}`
        );
        setCommunityInfo(null);
        return;
      }

      const communityEvent = communityEvents[0];
      const parsedCommunity = parseCommunityEvent(communityEvent);

      if (parsedCommunity) {
        setCommunityInfo(parsedCommunity);
        setError(null);
      } else {
        setError('Failed to parse community event data');
        setCommunityInfo(null);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch community event';
      setError(errorMessage);
      setCommunityInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, pool, relays, parseCommunityEvent]);

  const refreshCommunity = useCallback(async () => {
    await fetchCommunity();
  }, [fetchCommunity]);

  // Auto-fetch when connected
  useEffect(() => {
    if (isConnected && !communityInfo) {
      fetchCommunity();
    }
  }, [isConnected, communityInfo, fetchCommunity]);

  return {
    communityInfo,
    isLoading,
    error,
    fetchCommunity,
    refreshCommunity,
  };
}
