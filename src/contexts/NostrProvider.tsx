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
  // 'wss://nostr.wine',
];

export function NostrProvider({ children }: { children: React.ReactNode }) {
  const [pool, setPool] = useState<SimplePool | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [localSecretKey, setLocalSecretKeyState] = useState<Uint8Array | null>(
    null
  );
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
        console.log('Pool initialized');
        setError(null);
      } catch (err) {
        console.error('Failed to initialize Nostr pool:', err);
        setError('Failed to connect to Nostr relays');
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

  // Check for existing authentication on mount
  useEffect(() => {
    const checkExistingAuth = () => {
      // Check if user has a secret key or bunker connection
      if (localSecretKey || (bunkerSigner && bunkerStatus === 'connected')) {
        setIsAuthenticated(true);
      }
    };

    checkExistingAuth();
  }, [localSecretKey, bunkerSigner, bunkerStatus]);

  // Check if app is configured (either with secret key or bunker connection)
  useEffect(() => {
    const checkConfiguration = () => {
      // App is configured if either:
      // 1. User has a local secret key (secret key mode)
      // 2. User has a bunker connection token (bunker mode) - we consider them configured
      //    even if not yet connected, as they have the necessary credentials
      const hasSecretKey = localSecretKey !== null;
      const hasBunkerCredentials = bunkerConnectionToken !== null;

      setIsConfigured(hasSecretKey || hasBunkerCredentials);
    };

    checkConfiguration();
  }, [localSecretKey, bunkerConnectionToken]);

  // Wrapper function for setting local secret key
  const setLocalSecretKey = useCallback((sk: Uint8Array) => {
    setLocalSecretKeyState(sk);
    setIsAuthenticated(true);
    setIsConfigured(true);
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setLocalSecretKeyState(null);
    setUserPublicKey(null);
    setBunkerConnectionToken(null);
    setBunkerStatus('disconnected');
    setBunkerError(null);
    setBunkerSigner(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    setIsConfigured(false);
    setEvents([]);
  }, []);

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

        await Promise.all(pool.publish(relays, event));
        console.log('Profile updated successfully');
        setUserProfile(event);
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
        setBunkerConnectionToken(bunkerConnectionToken); // Store the token

        const bunkerInput = await parseBunkerInput(bunkerConnectionToken);
        if (!bunkerInput) {
          throw new Error('Invalid bunker input');
        }

        const bunkerPubkey = bunkerInput.pubkey;

        console.log('Bunker pubkey:', bunkerPubkey);
        setUserPublicKey(bunkerPubkey);

        const bunkerSigner = new BunkerSigner(localSecretKey, bunkerInput);

        await bunkerSigner
          .connect()
          .then(() => {
            console.log('Bunker connected');
            setBunkerStatus('connected');
            setBunkerSigner(bunkerSigner);
            setIsAuthenticated(true);
            setIsConfigured(true);
          })
          .catch(err => {
            console.error('Failed to connect to bunker:', err);
            setBunkerStatus('error');
            setBunkerError(
              err instanceof Error ? err.message : 'Failed to connect to bunker'
            );

            setIsAuthenticated(false);
          });
      } catch (err) {
        console.error('Failed to connect to bunker:', err);
        setBunkerStatus('error');
        setBunkerError(
          err instanceof Error ? err.message : 'Failed to connect to bunker'
        );
        setIsAuthenticated(false);
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
            setEvents(prev => {
              // Check if event with same ID already exists
              const eventExists = prev.some(
                existingEvent => existingEvent.id === event.id
              );
              if (eventExists) {
                return prev; // Return unchanged if event already exists
              }
              // Add new event and keep last 100 events
              return [event, ...prev.slice(0, 99)];
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
    isAuthenticated,
    isConfigured,
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
    logout,
  };

  return (
    <NostrContext.Provider value={value}>{children}</NostrContext.Provider>
  );
}
