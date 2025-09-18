import { useState, useCallback, useEffect } from 'react';
import { useNostr } from './useNostr';
import type { Event, Filter } from 'nostr-tools';
import {
  createEventByIdFilter,
  createThreadFilter,
  processThreadEvents,
} from '../utils/nostrDataUtils';

const relays = [
  'wss://relay.chorus.community',
  'wss://relay.damus.io',
  'wss://nos.lol',
];

export interface ThreadEvent extends Event {
  level: number;
  isRoot: boolean;
}

export interface RequestDetails {
  request: Event | null;
  thread: ThreadEvent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRequestDetails(
  requestId: string | undefined
): RequestDetails {
  const { pool, isConnected } = useNostr();
  const [request, setRequest] = useState<Event | null>(null);
  const [thread, setThread] = useState<ThreadEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  // Subscribe to events for a specific request
  const subscribeToRequestEvents = useCallback(
    (filter: Filter) => {
      if (!pool || !isConnected) return;

      try {
        const sub = pool.subscribe(relays, filter, {
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
            // Subscription ended
          },
        });

        return () => {
          sub.close();
        };
      } catch {
        setError('Failed to subscribe to Nostr events');
      }
    },
    [pool, isConnected]
  );

  // Fetch request details and build thread
  const fetchRequestDetails = useCallback(() => {
    if (!requestId || !pool || !isConnected) return;

    setIsLoading(true);
    setError(null);
    setEvents([]);

    try {
      // First, fetch the main request
      subscribeToRequestEvents(createEventByIdFilter(requestId));

      // Then fetch the thread (replies and related events)
      subscribeToRequestEvents(createThreadFilter(requestId, 100));
    } catch {
      setError('Failed to fetch request details');
      setIsLoading(false);
    }
  }, [requestId, pool, isConnected, subscribeToRequestEvents]);

  // Process events into request and thread
  useEffect(() => {
    const uniqueEvents = events.filter(
      (event, index, arr) => arr.findIndex(e => e.id === event.id) === index
    );

    if (uniqueEvents.length === 0) return;

    // Find the main request
    const mainRequest = uniqueEvents.find(event => event.id === requestId);
    if (mainRequest) {
      setRequest(mainRequest);
    }

    // Process thread events using the utility function
    if (requestId) {
      const threadEvents = processThreadEvents(uniqueEvents, requestId);
      setThread(threadEvents);
    }
    setIsLoading(false);
  }, [events, requestId]);

  // Initial fetch when requestId changes
  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  return {
    request,
    thread,
    isLoading,
    error,
    refetch: fetchRequestDetails,
  };
}
