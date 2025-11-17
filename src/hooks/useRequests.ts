import { useState, useEffect, useCallback } from 'react';
import { useNostr } from './useNostr';
import type { Event } from 'nostr-tools';
import { processCommunityRequestEvents } from '../utils/nostrDataUtils';
import { createCommunityRequestFilterFromEnv } from '../utils/communityRequest';
import {
  createStatusEventFilter,
  getLatestRequestStatus,
} from '../utils/statusEventUtils';

export interface RequestData {
  id: string;
  dTag?: string;
  title: string;
  description: string;
  author: string;
  createdAt: number;
  status: string;
}

export function useRequests(
  moderators: string[] = [],
  overrideCommunityId?: string,
  overrideIdentifier?: string
) {
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
        createCommunityRequestFilterFromEnv(
          100,
          overrideCommunityId,
          overrideIdentifier
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
    overrideCommunityId,
    overrideIdentifier,
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
