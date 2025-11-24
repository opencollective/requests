import { useState, useEffect, useCallback } from 'react';
import type { SimplePool, Filter } from 'nostr-tools';
import {
  parseCommunityDefinitionEvent,
  parseCommunityId,
  type CommunityInfo,
} from '../utils/communityUtils.ts';

export interface CommunityByIdState {
  communityInfo: CommunityInfo | null;
  isLoading: boolean;
  error: string | null;
  fetchCommunity: () => Promise<void>;
  refreshCommunity: () => Promise<void>;
}

/**
 * Hook to fetch and manage a community definition event by ID from URL
 * The communityId should be in format: "community_id:identifier"
 */
export function useCommunityById(
  communityId: string | undefined,
  isConnected: boolean,
  pool: SimplePool | null,
  relays: string[] | null
): CommunityByIdState {
  const [communityInfo, setCommunityInfo] = useState<CommunityInfo | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunity = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!communityId) {
        setError('No community ID provided');
        setCommunityInfo(null);
        return;
      }

      const parsed = parseCommunityId(communityId);
      if (!parsed) {
        setError(
          'Invalid community ID format. Expected format: "community_id:identifier"'
        );
        setCommunityInfo(null);
        return;
      }

      if (!isConnected || !pool || !relays) {
        setError('Not connected to Nostr relays');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Query for community definition event (kind 34550)
        // If forceRefresh is true, add a since parameter to bypass cache
        const filter: Filter = {
          kinds: [34550], // NIP-72: Community Definition
          authors: [parsed.community_id],
          '#d': [parsed.community_identifier],
          limit: 1,
        };

        // Add since parameter to force fresh query (1 second ago to ensure we get latest)
        if (forceRefresh) {
          filter.since = Math.floor(Date.now() / 1000) - 1;
        }

        const communityEvents = await pool.querySync(relays, filter);

        if (communityEvents.length === 0) {
          setError(
            `Community not found: ${parsed.community_id}:${parsed.community_identifier}`
          );
          setCommunityInfo(null);
          return;
        }

        const communityEvent = communityEvents[0];
        const parsedCommunity = parseCommunityDefinitionEvent(communityEvent);

        if (parsedCommunity) {
          setCommunityInfo(parsedCommunity);
          setError(null);
        } else {
          setError('Failed to parse community event data');
          setCommunityInfo(null);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to fetch community event';
        setError(errorMessage);
        setCommunityInfo(null);
      } finally {
        setIsLoading(false);
      }
    },
    [communityId, isConnected, pool, relays]
  );

  const refreshCommunity = useCallback(async () => {
    // Add a small delay to allow relay propagation after event publication
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Force refresh to bypass any caching
    await fetchCommunity(true);
  }, [fetchCommunity]);

  // Auto-fetch when connected and communityId is available
  useEffect(() => {
    if (isConnected && communityId && !communityInfo) {
      fetchCommunity();
    }
  }, [isConnected, communityId, communityInfo, fetchCommunity]);

  return {
    communityInfo,
    isLoading,
    error,
    fetchCommunity,
    refreshCommunity,
  };
}
