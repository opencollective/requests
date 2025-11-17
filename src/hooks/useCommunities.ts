import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNostr } from './useNostr';
import {
  createCommunityDefinitionsFilter,
  parseCommunityDefinitionEvent,
  type CommunityInfo,
} from '../utils/communityUtils';

const DEFAULT_COMMUNITY_LIMIT = 50;

const getCommunityKey = (community: CommunityInfo) =>
  community.identifier || community.id;

export function useCommunities(limit: number = DEFAULT_COMMUNITY_LIMIT) {
  const { isConnected, pool, relays, communityInfo } = useNostr();
  const [fetchedCommunities, setFetchedCommunities] = useState<CommunityInfo[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunities = useCallback(async () => {
    if (!isConnected || !pool || !relays) {
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await pool.querySync(
        relays,
        createCommunityDefinitionsFilter({ limit })
      );
      const parsed = result
        .map(parseCommunityDefinitionEvent)
        .filter((community): community is CommunityInfo => community !== null);
      setFetchedCommunities(parsed);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch communities', err);
      setError('Failed to fetch communities');
      setFetchedCommunities([]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, pool, relays, limit]);

  const refreshCommunities = useCallback(() => {
    void fetchCommunities();
  }, [fetchCommunities]);

  useEffect(() => {
    if (isConnected) {
      void fetchCommunities();
    }
  }, [isConnected, fetchCommunities]);

  const communities = useMemo(() => {
    const map = new Map<string, CommunityInfo>();

    if (communityInfo) {
      map.set(getCommunityKey(communityInfo), communityInfo);
    }

    fetchedCommunities.forEach(community => {
      map.set(getCommunityKey(community), community);
    });

    return Array.from(map.values());
  }, [communityInfo, fetchedCommunities]);

  return {
    communities,
    isLoading,
    error,
    refreshCommunities,
    fetchCommunities,
  };
}
