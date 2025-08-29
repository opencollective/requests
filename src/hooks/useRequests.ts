import { useState, useEffect, useCallback, useRef } from 'react';
import { useNostr } from './useNostr';
import type { Event } from 'nostr-tools';

export interface RequestData {
  id: string;
  subject: string;
  message: string;
  email: string;
  name: string;
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
        {
          kinds: [1111], // NIP-72: Community Request
          '#t': ['community-request'],
          limit: 100,
        },
        {
          onevent(event) {
            console.log('Received NIP-72 community request event:', event);
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
            console.log('NIP-72 community requests subscription ended');
            setIsLoading(false);
          },
        }
      );

      subscriptionRef.current = unsubscribe;
    } catch (err) {
      console.error('Failed to fetch requests:', err);
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

    const processedRequests: RequestData[] = events
      .filter(event => event.kind === 1111) // NIP-72: Community Request
      .map(event => {
        try {
          const content = JSON.parse(event.content);

          // Extract community a tag if present (NIP-72)
          const communityATag =
            event.tags.find(tag => tag[0] === 'a')?.[1] || '';

          return {
            id: event.id,
            subject: content.subject || 'No subject',
            message: content.message || 'No message',
            email: content.email || 'No email',
            name: content.name || 'Anonymous',
            createdAt:
              content.createdAt ||
              new Date(event.created_at * 1000).toISOString(),
            author: event.pubkey,
            timestamp: event.created_at,
            communityATag, // Add community a tag for NIP-72 compliance
          };
        } catch {
          return null;
        }
      })
      .filter((request): request is RequestData => request !== null)
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

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
