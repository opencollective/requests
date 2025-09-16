import { useState, useCallback, useEffect } from 'react';
import { SimplePool } from 'nostr-tools';

import type { Event, Filter } from 'nostr-tools';

const relays = [
  'wss://relay.chorus.community',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  // 'wss://nostr.wine',
];

// Pool and general Nostr connection state (no authentication required)
export interface NostrConnectionState {
  pool: SimplePool | null;
  isConnected: boolean;
  relays: string[];
  error: string | null;
  // FIXME get rid of this
  events: Event[];
  subscribeToEvents: (filter: Filter) => (() => void) | undefined;
  clearEvents: () => void;
}

export function useNostrConnectionState(): NostrConnectionState & {
  subscribeToEvents: (filter: Filter) => (() => void) | undefined;
  clearEvents: () => void;
} {
  const [pool, setPool] = useState<SimplePool | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  // Initialize Nostr pool
  useEffect(() => {
    const initPool = async () => {
      try {
        const newPool = new SimplePool();
        setPool(newPool);
        setIsConnected(true);
        console.log('Pool initialized');
        setConnectionError(null);
      } catch (err) {
        console.error('Failed to initialize Nostr pool:', err);
        setConnectionError('Failed to connect to Nostr relays');
        setIsConnected(false);
      }
    };

    // Initialize pool on mount
    initPool();

    return () => {
      if (pool) {
        pool.close(relays);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Subscribe to events (no authentication required)
  const subscribeToEvents = useCallback(
    (filter: Filter) => {
      if (!pool) return;

      try {
        const sub = pool.subscribe(relays, filter, {
          onevent(event) {
            console.log('Received Nostr event:', event);
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
        setConnectionError('Failed to subscribe to Nostr events');
      }
    },
    [pool]
  );

  // Clear events (no authentication required)
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    pool,
    isConnected,
    relays,
    error: connectionError,
    events,
    subscribeToEvents,
    clearEvents,
  };
}
