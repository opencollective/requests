import { useState, useEffect, useCallback } from 'react';
import { useNostr } from './useNostr';
import type { Event } from 'nostr-tools';
import {
  createCommunityRequestFilterFromEnv,
  processCommunityRequestEvents,
} from '../utils/nostrDataUtils';
import {
  createStatusEventFilter,
  getLatestRequestStatus,
} from '../utils/statusEventUtils';

export interface RequestData {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: number;
  status: string;
}

export function useRequests() {
  const { isConnected, pool, relays } = useNostr();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [statusEvents, setStatusEvents] = useState<Event[]>([]);

  const fetchRequests = useCallback(async () => {
    if (!isConnected || !pool || !relays) return;

    setIsLoading(true);
    setError(null);

    try {
      // Query for community request events (kind 1111)
      const requestEvents = await pool.querySync(
        relays,
        createCommunityRequestFilterFromEnv(100)
      );
      setEvents(requestEvents);

      // Query for status events (kind 9078)
      const statusEventsData = await pool.querySync(
        relays,
        createStatusEventFilter(undefined, undefined, 100)
      );
      setStatusEvents(statusEventsData);

      setIsLoading(false);
    } catch {
      setError('Failed to fetch requests');
      setIsLoading(false);
    }
  }, [isConnected, pool, relays]);

  const refreshRequests = useCallback(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Process events into request data with status information
  useEffect(() => {
    if (events.length === 0) {
      setRequests([]);
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
  };
}
