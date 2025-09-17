import { useState, useCallback, useEffect } from 'react';
import { useNostr } from './useNostr';
import type { Event, Filter } from 'nostr-tools';

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
            console.log('Subscription ended');
          },
        });

        return () => {
          sub.close();
        };
      } catch (err) {
        console.error('Failed to subscribe to events:', err);
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
      subscribeToRequestEvents({
        ids: [requestId],
        limit: 1,
      });

      // Then fetch the thread (replies and related events)
      subscribeToRequestEvents({
        kinds: [1, 30023], // Text notes and community requests
        '#e': [requestId], // Events that reference this request
        limit: 100,
      });

      // Also fetch events that this request references (for building the thread)
      subscribeToRequestEvents({
        kinds: [1, 30023],
        '#e': [requestId],
        limit: 100,
      });
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

    // Build the thread following NIP-10
    const threadEvents: ThreadEvent[] = [];

    // Add the main request as root
    if (mainRequest) {
      threadEvents.push({
        ...mainRequest,
        level: 0,
        isRoot: true,
      });
    }

    // Process all events that reference this request
    const allReplies = uniqueEvents.filter(
      event =>
        event.id !== requestId &&
        event.kind === 1 && // Text notes (replies)
        event.tags.some(tag => tag[0] === 'e' && tag[1] === requestId) &&
        !threadEvents.some(threadEvent => threadEvent.id === event.id)
    );

    // Sort replies by timestamp
    allReplies.sort((a, b) => a.created_at - b.created_at);

    // Build thread hierarchy using NIP-10 logic
    const processedReplies = allReplies.map(reply => {
      // Analyze the 'e' tags to determine reply level
      const eventTags = reply.tags.filter(tag => tag[0] === 'e');
      let level = 1; // Default level for direct replies

      if (eventTags.length > 1) {
        // Check if this is a reply to another reply
        const replyToEventId = eventTags[1]?.[1]; // Second 'e' tag
        if (replyToEventId && replyToEventId !== requestId) {
          // This is a reply to another reply
          level = 2;
        }
      }

      return {
        ...reply,
        level,
        isRoot: false,
      };
    });

    // Add processed replies to thread
    threadEvents.push(...processedReplies);

    setThread(threadEvents);
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
