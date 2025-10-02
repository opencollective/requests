import { useState, useCallback, useEffect } from 'react';
import { useNostr } from './useNostr';
import type { Event, Filter } from 'nostr-tools';
import {
  createEventByIdFilter,
  createThreadFilter,
  processThreadEvents,
} from '../utils/nostrDataUtils';
import {
  createStatusEventFilter,
  getLatestRequestStatus,
} from '../utils/statusEventUtils';

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
  status: string;
  statusEvents: Event[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRequestDetails(
  requestId: string | undefined,
  moderators: string[] = []
): RequestDetails {
  const { pool, isConnected } = useNostr();
  const [request, setRequest] = useState<Event | null>(null);
  const [thread, setThread] = useState<ThreadEvent[]>([]);
  const [status, setStatus] = useState<string>('New');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [statusEvents, setStatusEvents] = useState<Event[]>([]);

  // Subscribe to events for a specific request
  const subscribeToRequestEvents = useCallback(
    (filter: Filter) => {
      if (!pool || !isConnected) return;

      try {
        const sub = pool.subscribe(relays, filter, {
          onevent(event: Event) {
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
    setStatusEvents([]);

    try {
      // First, fetch the main request
      subscribeToRequestEvents(createEventByIdFilter(requestId));

      // Then fetch the thread (replies and related events)
      subscribeToRequestEvents(createThreadFilter(requestId, 100));

      // Fetch status events for this specific request (filtered by moderators)
      subscribeToRequestEvents(
        createStatusEventFilter(requestId, undefined, moderators, 100)
      );
    } catch {
      setError('Failed to fetch request details');
      setIsLoading(false);
    }
  }, [requestId, pool, isConnected, subscribeToRequestEvents, moderators]);

  // Process events into request and thread
  useEffect(() => {
    const uniqueEvents = events.filter(
      (event, index, arr) => arr.findIndex(e => e.id === event.id) === index
    );

    if (uniqueEvents.length === 0) return;

    // Separate status events from other events
    const statusEvents = uniqueEvents.filter(event => event.kind === 9078);
    const otherEvents = uniqueEvents.filter(event => event.kind !== 9078);

    // Update status events state (already filtered by moderators at query level)
    setStatusEvents(statusEvents);

    // Find the main request
    const mainRequest = otherEvents.find(event => event.id === requestId);
    if (mainRequest) {
      setRequest(mainRequest);
    }

    // Process thread events using the utility function
    if (requestId) {
      const threadEvents = processThreadEvents(otherEvents, requestId);
      setThread(threadEvents);
    }
    setIsLoading(false);
  }, [events, requestId]);

  // Update status when status events change
  useEffect(() => {
    if (requestId && statusEvents.length > 0) {
      const latestStatus = getLatestRequestStatus(statusEvents, requestId);
      if (latestStatus) {
        setStatus(latestStatus);
      }
    } else if (requestId) {
      setStatus('New');
    }
  }, [statusEvents, requestId]);

  // Initial fetch when requestId changes
  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  return {
    request,
    thread,
    status,
    statusEvents,
    isLoading,
    error,
    refetch: fetchRequestDetails,
  };
}
