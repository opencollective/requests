/* eslint-disable no-console */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNostr } from './useNostr';
import type { Event, Filter } from 'nostr-tools';
import {
  createEventByIdFilter,
  processThreadEvents,
} from '../utils/nostrDataUtils';
import {
  createStatusEventFilter,
  getLatestRequestStatus,
} from '../utils/statusEventUtils';
import { createThreadFilter } from '../utils/replies';
import { createReactionFilter } from '../utils/reactionUtils';

const relays = ['wss://relay.chorus.community', 'wss://nos.lol'];

export interface ThreadEvent extends Event {
  level: number;
  isRoot: boolean;
}

export interface RequestDetails {
  request: Event | null;
  thread: ThreadEvent[];
  status: string;
  statusEvents: Event[];
  reactions: Event[]; // Reaction events (kind 7)
  allEvents: Event[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRequestDetails(
  requestId: string,
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
  const [reactions, setReactions] = useState<Event[]>([]);

  // Store moderators in a ref to use in callbacks without causing re-renders
  const moderatorsRef = useRef(moderators);
  useEffect(() => {
    moderatorsRef.current = moderators;
  }, [moderators]);

  // Track active subscriptions to close them when refetching
  const subscriptionsRef = useRef<Array<() => void>>([]);
  const isFetchingRef = useRef(false);
  const pendingSubscriptionsRef = useRef(0);

  const markSubscriptionCompleted = useCallback(() => {
    if (pendingSubscriptionsRef.current > 0) {
      pendingSubscriptionsRef.current -= 1;
    }
    if (pendingSubscriptionsRef.current === 0 && !isFetchingRef.current) {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to events for a specific request
  const subscribeToRequestEvents = useCallback(
    (filter: Filter) => {
      if (!pool || !isConnected) return;

      try {
        let hasCompleted = false;
        const finalize = () => {
          if (hasCompleted) {
            return;
          }
          hasCompleted = true;
          markSubscriptionCompleted();
        };

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
            finalize();
          },
        });

        pendingSubscriptionsRef.current += 1;

        return () => {
          sub.close();
          finalize();
        };
      } catch {
        setError('Failed to subscribe to Nostr events');
        markSubscriptionCompleted();
      }
    },
    [pool, isConnected, markSubscriptionCompleted]
  );

  // Fetch request details and build thread
  const fetchRequestDetails = useCallback(() => {
    if (!pool || !isConnected) {
      return;
    }
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;

    // Close existing subscriptions
    subscriptionsRef.current.forEach(close => close());
    subscriptionsRef.current = [];

    setIsLoading(true);
    pendingSubscriptionsRef.current = 0;
    setError(null);
    // Don't clear events - let subscriptions add new ones incrementally

    try {
      const mainRequestFilter = createEventByIdFilter(requestId);
      const sub1 = subscribeToRequestEvents(mainRequestFilter);
      if (sub1) {
        subscriptionsRef.current.push(sub1);
      } else {
        console.warn('[useRequestDetails] failed to subscribe to main request');
      }

      const threadFilter = createThreadFilter(requestId, 100);
      const sub2 = subscribeToRequestEvents(threadFilter);
      if (sub2) {
        subscriptionsRef.current.push(sub2);
      } else {
        console.warn('[useRequestDetails] failed to subscribe to thread');
      }

      const statusFilter = createStatusEventFilter(
        requestId,
        undefined,
        moderatorsRef.current,
        100
      );
      const sub3 = subscribeToRequestEvents(statusFilter);
      if (sub3) {
        subscriptionsRef.current.push(sub3);
      } else {
        console.warn(
          '[useRequestDetails] failed to subscribe to status events'
        );
      }

      const reactionFilter = createReactionFilter(requestId, 100);
      const sub4 = subscribeToRequestEvents(reactionFilter);
      if (sub4) {
        subscriptionsRef.current.push(sub4);
      } else {
        console.warn(
          '[useRequestDetails] failed to subscribe to reaction events'
        );
      }

      isFetchingRef.current = false;
      if (pendingSubscriptionsRef.current === 0) {
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[useRequestDetails] error while subscribing', err);
      setError('Failed to fetch request details');
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [requestId, pool, isConnected, subscribeToRequestEvents]);

  // Process events into request and thread
  useEffect(() => {
    const uniqueEvents = events.filter(
      (event, index, arr) => arr.findIndex(e => e.id === event.id) === index
    );

    // Separate status events, reaction events, and other events
    const statusEventsFiltered = uniqueEvents.filter(
      event => event.kind === 9078
    );
    const reactionEventsFiltered = uniqueEvents.filter(
      event => event.kind === 7
    );
    const otherEvents = uniqueEvents.filter(
      event => event.kind !== 9078 && event.kind !== 7
    );

    // Only update status events if they actually changed (compare by IDs)
    setStatusEvents(prev => {
      const prevIds = new Set(prev.map(e => e.id));
      const newIds = new Set(statusEventsFiltered.map(e => e.id));
      if (
        prevIds.size !== newIds.size ||
        ![...prevIds].every(id => newIds.has(id))
      ) {
        return statusEventsFiltered;
      }
      return prev;
    });

    // Only update reaction events if they actually changed (compare by IDs)
    setReactions(prev => {
      const prevIds = new Set(prev.map(e => e.id));
      const newIds = new Set(reactionEventsFiltered.map(e => e.id));
      if (
        prevIds.size !== newIds.size ||
        ![...prevIds].every(id => newIds.has(id))
      ) {
        return reactionEventsFiltered;
      }
      return prev;
    });

    // Find the main request (could be the original or a replacement)
    const mainRequest = otherEvents.find(event => event.id === requestId);
    if (mainRequest) {
      setRequest(prev => {
        // Only update if it's actually different
        if (!prev || prev.id !== mainRequest.id) {
          return mainRequest;
        }
        return prev;
      });
    }

    // Process thread events using the utility function
    if (requestId) {
      const threadEvents = processThreadEvents(otherEvents, requestId);
      setThread(prev => {
        // Only update if thread actually changed (compare by IDs)
        const prevIds = new Set(prev.map(e => e.id));
        const newIds = new Set(threadEvents.map(e => e.id));
        if (
          prevIds.size !== newIds.size ||
          ![...prevIds].every(id => newIds.has(id))
        ) {
          return threadEvents;
        }
        return prev;
      });
    }
  }, [events, requestId, request]);

  // Update status when status events change
  useEffect(() => {
    if (requestId && statusEvents.length > 0) {
      const latestStatus = getLatestRequestStatus(statusEvents, requestId);
      if (latestStatus) {
        setStatus(prev => (prev !== latestStatus ? latestStatus : prev));
      }
    } else if (requestId) {
      setStatus(prev => (prev !== 'New' ? 'New' : prev));
    }
  }, [statusEvents, requestId]);

  // Initial fetch when dependencies are ready
  useEffect(() => {
    if (!requestId || !pool || !isConnected) {
      return;
    }
    fetchRequestDetails();
    // Cleanup subscriptions on unmount or dependency change
    return () => {
      subscriptionsRef.current.forEach(close => close());
      subscriptionsRef.current = [];
    };
  }, [requestId, pool, isConnected, fetchRequestDetails]);

  return {
    request,
    thread,
    status,
    statusEvents,
    reactions,
    allEvents: events, // Return all events for finding replaceable events
    isLoading,
    error,
    refetch: fetchRequestDetails,
  };
}
