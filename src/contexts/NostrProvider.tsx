import React, { useEffect, useState, useCallback } from 'react';
import { SimplePool } from 'nostr-tools';
import type { Event, Filter } from 'nostr-tools';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46';
import type { NostrContextType } from './NostrContextTypes';
import { NostrContext } from './NostrContext';

const relays = [
  'wss://relay.chorus.community',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://nostr.wine',
];

export function NostrProvider({ children }: { children: React.ReactNode }) {
  const [pool, setPool] = useState<SimplePool | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [localSecretKey, setLocalSecretKey] = useState<Uint8Array | null>(null);
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);
  const [bunkerConnectionToken, setBunkerConnectionToken] = useState<
    string | null
  >(null);
  const [bunkerStatus, setBunkerStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');
  const [bunkerError, setBunkerError] = useState<string | null>(null);
  const [bunkerSigner, setBunkerSigner] = useState<BunkerSigner | null>(null);
  const [userProfile, setUserProfile] = useState<Event | null>(null);

  // Initialize Nostr pool
  useEffect(() => {
    const initPool = async () => {
      try {
        const newPool = new SimplePool();
        setPool(newPool);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize Nostr pool:', err);
        setError('Failed to connect to Nostr relays');
        setIsConnected(false);
      }
    };

    // Only initialize if pool is null
    if (!pool) {
      initPool();
    }

    return () => {
      if (pool) {
        pool.close(relays);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const fetchUserProfile = useCallback(async () => {
    if (!pool || !userPublicKey) return;

    try {
      console.log('Fetching user profile for:', userPublicKey);
      const filter: Filter = {
        kinds: [0],
        authors: [userPublicKey],
        limit: 1,
      };

      const events = await pool.querySync(relays, filter);
      if (events.length > 0) {
        setUserProfile(events[0]);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setError('Failed to fetch user profile');
    }
  }, [pool, userPublicKey]);

  const updateUserProfile = useCallback(
    async (profileData: Record<string, string>) => {
      if (!pool || !localSecretKey) return;

      try {
        const event: Event = {
          kind: 0,
          content: JSON.stringify(profileData),
          tags: [],
          created_at: Math.floor(Date.now() / 1000),
          pubkey: userPublicKey || '',
          id: '',
          sig: '',
        };

        const signedEvent = await pool.publish(relays, event);
        console.log('Profile updated successfully');
        setUserProfile(signedEvent);
      } catch (err) {
        console.error('Failed to update profile:', err);
        setError('Failed to update profile');
      }
    },
    [pool, localSecretKey, userPublicKey]
  );

  const handleBunkerConnectionToken = useCallback(
    async (bunkerConnectionToken: string, localSecretKey: Uint8Array) => {
      try {
        setBunkerStatus('connecting');
        setBunkerError(null);

        const bunkerInput = parseBunkerInput(bunkerConnectionToken);
        if (!bunkerInput) {
          throw new Error('Invalid bunker input');
        }

        const bunkerPointer = bunkerInput.pointer;
        const bunkerPubkey = bunkerInput.pubkey;

        console.log('Bunker pubkey:', bunkerPubkey);
        setUserPublicKey(bunkerPubkey);

        const newPool = new SimplePool();
        setPool(newPool);

        console.log('Pool initialized');

        const bunkerSigner = new BunkerSigner(
          newPool,
          bunkerPointer,
          localSecretKey
        );

        console.log('Bunker pointer:', bunkerPointer);

        await bunkerSigner
          .connect()
          .then(() => {
            console.log('Bunker connected');
            setBunkerStatus('connected');
            setBunkerSigner(bunkerSigner);
            setIsConnected(true);
          })
          .catch(err => {
            console.error('Failed to connect to bunker:', err);
            setBunkerStatus('error');
            setBunkerError(
              err instanceof Error ? err.message : 'Failed to connect to bunker'
            );
            setIsConnected(false);
          });
      } catch (err) {
        console.error('Failed to connect to bunker:', err);
        setBunkerStatus('error');
        setBunkerError(
          err instanceof Error ? err.message : 'Failed to connect to bunker'
        );
        setIsConnected(false);
      }
    },
    [] // Remove pool dependency
  );

  // Subscribe to events
  const subscribeToEvents = useCallback(
    (filter: Filter) => {
      if (!pool) return;

      try {
        const sub = pool.subscribe(relays, filter, {
          onevent(event) {
            console.log('Received Nostr event:', event);
            setEvents(prev => [event, ...prev.slice(0, 99)]); // Keep last 100 events
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
    [pool]
  );

  // Send event
  const sendEvent = useCallback(
    async (event: Event) => {
      if (!pool) return;

      try {
        await pool.publish(relays, event);
        console.log('Event published successfully');
      } catch (err) {
        console.error('Failed to publish event:', err);
        setError('Failed to publish event');
      }
    },
    [pool]
  );

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const value: NostrContextType = {
    isConnected,
    bunkerStatus,
    bunkerError,
    bunkerSigner,
    events,
    userProfile,
    fetchUserProfile,
    updateUserProfile,
    sendEvent,
    subscribeToEvents,
    clearEvents,
    error,
    localSecretKey,
    userPublicKey,
    bunkerConnectionToken,
    setBunkerConnectionToken,
    setLocalSecretKey,
    handleBunkerConnectionToken,
  };

  return (
    <NostrContext.Provider value={value}>{children}</NostrContext.Provider>
  );
}
