import { useState, useEffect, useCallback, useRef } from 'react';
import { useNostr } from './useNostr';
import type { Event } from 'nostr-tools';
import {
  createCommunityRequestFilterFromEnv,
  processCommunityRequestEvents,
} from '../utils/nostrDataUtils';

export interface RequestData {
  id: string;
  subject: string;
  message: string;
  // email: string;
  // name: string;
  createdAt: string;
  author: string;
  timestamp: number;
  communityATag: string; // Added for NIP-72 compliance
}

export function useRequests() {
  const { isConnected, pool, relays } = useNostr();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const subscriptionRef = useRef<{ close: () => void } | null>(null);

  const fetchRequests = useCallback(() => {
    if (!isConnected || !pool || !relays) return;

    setIsLoading(true);
    setError(null);

    try {
      // Clear any existing subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.close();
        subscriptionRef.current = null;
      }

      // Subscribe to NIP-72 community request events (kind 1111 with topic tag)
      const unsubscribe = pool.subscribe(
        relays,
        createCommunityRequestFilterFromEnv(100),
        {
          onevent(event) {
            setEvents(prevEvents => {
              // Avoid duplicates by checking if event already exists
              const exists = prevEvents.some(e => e.id === event.id);
              if (!exists) {
                return [...prevEvents, event];
              }
              return prevEvents;
            });
          },
          oneose() {
            setIsLoading(false);
          },
        }
      );

      subscriptionRef.current = unsubscribe;
    } catch {
      setError('Failed to fetch requests');
      setIsLoading(false);
    }
  }, [isConnected, pool, relays]);

  const refreshRequests = useCallback(() => {
    // Clear existing events and subscription
    setEvents([]);
    if (subscriptionRef.current) {
      subscriptionRef.current.close();
      subscriptionRef.current = null;
    }
    fetchRequests();
  }, [fetchRequests]);

  // Process events into request data
  useEffect(() => {
    if (events.length === 0) return;

    const processedRequests = processCommunityRequestEvents(events);
    setRequests(processedRequests);
  }, [events]);

  // Auto-fetch when connected
  useEffect(() => {
    if (isConnected) {
      fetchRequests();
    }
  }, [isConnected, fetchRequests]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.close();
      }
    };
  }, []);

  return {
    requests,
    isLoading,
    error,
    refreshRequests,
    fetchRequests,
  };
}
