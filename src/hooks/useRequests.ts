import { useState, useEffect, useCallback } from 'react';
import { useNostr } from './useNostr';
import type { Event } from 'nostr-tools';
import { processCommunityRequestEvents } from '../utils/nostrDataUtils';
import { createCommunityRequestFilter } from '../utils/communityRequest';
import {
  createStatusEventFilter,
  getLatestRequestStatus,
} from '../utils/statusEventUtils';
import { getCommunityATag } from '../utils/communityUtils';
import { useCommunityContext } from './useCommunityContext';

export interface RequestData {
  id: string;
  dTag?: string;
  title: string;
  description: string;
  author: string;
  createdAt: number;
  status: string;
}

export interface UseRequestsOptions {
  moderators?: string[];
  communityId?: string;
  communityIdentifier?: string;
}

export function useRequests({
  moderators = [],
  communityId: overrideCommunityId,
  communityIdentifier: overrideIdentifier,
}: UseRequestsOptions = {}) {
  const communityContext = useCommunityContext();
  const resolvedCommunityId =
    overrideCommunityId ?? communityContext?.communityPubkey;
  const resolvedCommunityIdentifier =
    overrideIdentifier ?? communityContext?.communityIdentifier;

  if (!resolvedCommunityId || !resolvedCommunityIdentifier) {
    throw new Error(
      'useRequests requires community context. Render inside CommunityLayout or provide communityId and communityIdentifier overrides.'
    );
  }

  const { isConnected, pool, relays } = useNostr();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [statusEvents, setStatusEvents] = useState<Event[]>([]);
  const [maxDTagNumber, setMaxDTagNumber] = useState(0);

  const fetchRequests = useCallback(async () => {
    if (!isConnected || !pool || !relays) return;

    setIsLoading(true);
    setError(null);

    try {
      // Query for community request events (kind 1111)
      const requestEvents = await pool.querySync(
        relays,
        createCommunityRequestFilter(
          getCommunityATag(resolvedCommunityId, resolvedCommunityIdentifier),
          100
        )
      );
      setEvents(requestEvents);

      // Query for status events (kind 9078) - filtered by moderators
      const statusEventsData = await pool.querySync(
        relays,
        createStatusEventFilter(undefined, undefined, moderators, 100)
      );
      setStatusEvents(statusEventsData);

      setIsLoading(false);
    } catch {
      setError('Failed to fetch requests');
      setIsLoading(false);
    }
  }, [
    isConnected,
    pool,
    relays,
    moderators,
    resolvedCommunityId,
    resolvedCommunityIdentifier,
  ]);

  const refreshRequests = useCallback(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Process events into request data with status information
  useEffect(() => {
    if (events.length === 0) {
      setRequests([]);
      setMaxDTagNumber(0);
      return;
    }

    const processedRequests = processCommunityRequestEvents(events);

    // Add status information to each request
    const requestsWithStatus = processedRequests.map(
      (request: Omit<RequestData, 'status'>) => {
        const status =
          getLatestRequestStatus(statusEvents, request.id) || 'New';
        return {
          ...request,
          status,
        };
      }
    );

    setRequests(requestsWithStatus);

    const numericDTags = requestsWithStatus
      .map(request => {
        if (!request.dTag) return NaN;
        const parsed = Number(request.dTag);
        return Number.isFinite(parsed) ? parsed : NaN;
      })
      .filter(value => !Number.isNaN(value));

    setMaxDTagNumber(numericDTags.length > 0 ? Math.max(...numericDTags) : 0);
  }, [events, statusEvents]);

  // Auto-fetch when connected
  useEffect(() => {
    if (isConnected) {
      fetchRequests();
    }
  }, [isConnected, fetchRequests]);

  return {
    requests,
    isLoading,
    error,
    refreshRequests,
    fetchRequests,
    maxDTagNumber,
    nextDTagNumber: maxDTagNumber + 1,
  };
}
