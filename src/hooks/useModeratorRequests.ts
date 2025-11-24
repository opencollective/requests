import { useState, useEffect, useCallback } from 'react';
import type { SimplePool } from 'nostr-tools';
import {
  createModeratorRequestFilter,
  processModeratorRequestEvents,
  hasUserRequestedModerator,
  type ModeratorRequestData,
} from '../utils/moderatorRequestUtils';
import { getCommunityATag } from '../utils/communityUtils';

export interface UseModeratorRequestsState {
  requests: ModeratorRequestData[];
  isLoading: boolean;
  error: string | null;
  hasUserRequested: boolean;
  fetchRequests: () => Promise<void>;
  refreshRequests: () => Promise<void>;
}

/**
 * Hook to fetch and manage moderator requests for a community
 * @param communityPubkey - The community creator's public key
 * @param communityIdentifier - The community identifier
 * @param userPublicKey - The current user's public key (optional)
 * @param isConnected - Whether connected to Nostr relays
 * @param pool - Nostr pool instance
 * @param relays - Array of relay URLs
 */
export function useModeratorRequests(
  communityPubkey: string | undefined,
  communityIdentifier: string | undefined,
  userPublicKey: string | null,
  isConnected: boolean,
  pool: SimplePool | null,
  relays: string[] | null
): UseModeratorRequestsState {
  const [requests, setRequests] = useState<ModeratorRequestData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!communityPubkey || !communityIdentifier) {
      setError('Community information not available');
      setRequests([]);
      return;
    }

    if (!isConnected || !pool || !relays) {
      setError('Not connected to Nostr relays');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const communityATag = getCommunityATag(
        communityPubkey,
        communityIdentifier
      );

      const filter = createModeratorRequestFilter(communityATag);
      const events = await pool.querySync(relays, filter);

      const processedRequests = processModeratorRequestEvents(events);
      setRequests(processedRequests);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to fetch moderator requests';
      setError(errorMessage);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [communityPubkey, communityIdentifier, isConnected, pool, relays]);

  const refreshRequests = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await fetchRequests();
  }, [fetchRequests]);

  // Auto-fetch when connected and community info is available
  useEffect(() => {
    if (isConnected && communityPubkey && communityIdentifier) {
      fetchRequests();
    }
  }, [isConnected, communityPubkey, communityIdentifier, fetchRequests]);

  // Check if current user has already requested
  const hasUserRequested = userPublicKey
    ? hasUserRequestedModerator(
        requests.map(r => r.event),
        userPublicKey,
        communityPubkey && communityIdentifier
          ? getCommunityATag(communityPubkey, communityIdentifier)
          : ''
      )
    : false;

  return {
    requests,
    isLoading,
    error,
    hasUserRequested,
    fetchRequests,
    refreshRequests,
  };
}
