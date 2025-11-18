import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNostr } from './useNostr';
import {
  createCommunityDefinitionsFilter,
  getFeaturedCommunityConfigs,
  parseCommunityDefinitionEvent,
  type CommunityInfo,
} from '../utils/communityUtils';
import type { Event, Filter } from 'nostr-tools';

const DEFAULT_COMMUNITY_LIMIT = 50;

const getCommunityKey = (community: CommunityInfo) =>
  community.identifier || community.id;

export function useCommunities(limit: number = DEFAULT_COMMUNITY_LIMIT) {
  const { isConnected, pool, relays } = useNostr();
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
      const primaryFilter = createCommunityDefinitionsFilter({ limit });
      const primaryResults = await pool.querySync(relays, primaryFilter);

      const featuredConfigs = getFeaturedCommunityConfigs();
      let featuredResults: Event[] = [];
      if (featuredConfigs.length > 0) {
        const uniqueAuthors = Array.from(
          new Set(featuredConfigs.map(config => config.community_id))
        );
        const dTags = featuredConfigs.map(
          config => config.community_identifier
        );
        const featuredFilter: Filter = {
          kinds: [34550],
          authors: uniqueAuthors,
          '#d': dTags,
          limit: featuredConfigs.length,
        };
        featuredResults = await pool.querySync(relays, featuredFilter);
      }

      const allResults = [...primaryResults, ...featuredResults];
      const parsed = allResults
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

    fetchedCommunities.forEach(community => {
      map.set(getCommunityKey(community), community);
    });

    return Array.from(map.values());
  }, [fetchedCommunities]);

  return {
    communities,
    isLoading,
    error,
    refreshCommunities,
    fetchCommunities,
  };
}
