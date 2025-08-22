import { useState, useCallback, useEffect } from 'react';
import { SimplePool } from 'nostr-tools';
import type { Event, Filter } from 'nostr-tools';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46';
import type {
  NostrConnectionState,
  SecretKeyAuthState,
  BunkerAuthState,
  UserAuthenticationState,
} from '../contexts/NostrContextTypes';

const relays = [
  'wss://relay.chorus.community',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  // 'wss://nostr.wine',
];

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

export function useSecretKeyAuthState(): SecretKeyAuthState & {
  setLocalSecretKey: (sk: Uint8Array) => void;
} {
  const [localSecretKey, setLocalSecretKeyState] = useState<Uint8Array | null>(
    null
  );
  const [secretKeyError, setSecretKeyError] = useState<string | null>(null);

  const setLocalSecretKey = useCallback((sk: Uint8Array) => {
    setLocalSecretKeyState(sk);
    setSecretKeyError(null);
  }, []);

  const secretKeyLogout = useCallback(() => {
    setLocalSecretKeyState(null);
    setSecretKeyError(null);
  }, []);

  return {
    localSecretKey,
    secretKeyError,
    secretKeyLogout,
    setLocalSecretKey,
  };
}

export function useBunkerAuthState(): BunkerAuthState & {
  setBunkerLocalSecretKey: (sk: Uint8Array) => void;
} {
  const [bunkerConnectionToken, setBunkerConnectionToken] = useState<
    string | null
  >(null);
  const [bunkerStatus, setBunkerStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');
  const [bunkerError, setBunkerError] = useState<string | null>(null);
  const [bunkerSigner, setBunkerSigner] = useState<BunkerSigner | null>(null);
  const [bunkerLocalSecretKey, setBunkerLocalSecretKey] =
    useState<Uint8Array | null>(null);

  const handleBunkerConnectionToken = useCallback(
    async (bunkerConnectionToken: string, localSecretKey: Uint8Array) => {
      try {
        setBunkerStatus('connecting');
        setBunkerError(null);
        setBunkerConnectionToken(bunkerConnectionToken); // Store the token
        setBunkerLocalSecretKey(localSecretKey); // Store the local secret key used with bunker
        console.log('Bunker connection token:', bunkerConnectionToken);

        const bunkerInput = await parseBunkerInput(bunkerConnectionToken);
        if (!bunkerInput) {
          throw new Error('Invalid bunker input');
        }

        const bunkerPubkey = bunkerInput.pubkey;
        const bunkerRelays = bunkerInput.relays;
        console.log('Bunker pubkey:', bunkerPubkey);
        console.log('Bunker relays:', bunkerRelays);

        const bunkerSigner = new BunkerSigner(localSecretKey, bunkerInput);

        await bunkerSigner
          .connect()
          .then(() => {
            console.log('Bunker connected');
            setBunkerStatus('connected');
            setBunkerSigner(bunkerSigner);
          })
          .catch(err => {
            console.error('Failed to connect to bunker:', err);
            setBunkerStatus('error');
            setBunkerError(
              err instanceof Error ? err.message : 'Failed to connect to bunker'
            );
          });
      } catch (err) {
        console.error('Failed to connect to bunker:', err);
        setBunkerStatus('error');
        setBunkerError(
          err instanceof Error ? err.message : 'Failed to connect to bunker'
        );
      }
    },
    []
  );

  const bunkerLogout = useCallback(() => {
    setBunkerConnectionToken(null);
    setBunkerStatus('disconnected');
    setBunkerError(null);
    setBunkerSigner(null);
    setBunkerLocalSecretKey(null);
  }, []);

  const setLocalSecretKey = useCallback((sk: Uint8Array) => {
    setBunkerLocalSecretKey(sk);
  }, []);

  return {
    bunkerConnectionToken,
    setBunkerConnectionToken,
    handleBunkerConnectionToken,
    bunkerStatus,
    bunkerError,
    bunkerSigner,
    localSecretKey: bunkerLocalSecretKey,
    setLocalSecretKey,
    bunkerLogout,
    setBunkerLocalSecretKey,
  };
}

export function useUserAuthenticationState(
  secretKeyAuth: SecretKeyAuthState,
  bunkerAuth: BunkerAuthState
): UserAuthenticationState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [userPublicKey] = useState<string | null>(null);
  const [userProfile] = useState<Event | null>(null);

  // Check for existing authentication when auth states change
  useEffect(() => {
    const checkExistingAuth = () => {
      // Check if user has a secret key or bunker connection
      if (
        secretKeyAuth.localSecretKey ||
        (bunkerAuth.bunkerSigner && bunkerAuth.bunkerStatus === 'connected')
      ) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };

    checkExistingAuth();
  }, [
    secretKeyAuth.localSecretKey,
    bunkerAuth.bunkerSigner,
    bunkerAuth.bunkerStatus,
  ]);

  // Check if app is configured (either with secret key or bunker connection)
  useEffect(() => {
    const checkConfiguration = () => {
      // App is configured if either:
      // 1. User has a local secret key (secret key mode)
      // 2. User has a bunker connection token (bunker mode) - we consider them configured
      //    even if not yet connected, as they have the necessary credentials
      const hasSecretKey = secretKeyAuth.localSecretKey !== null;
      const hasBunkerCredentials = bunkerAuth.bunkerConnectionToken !== null;

      setIsConfigured(hasSecretKey || hasBunkerCredentials);
    };

    checkConfiguration();
  }, [secretKeyAuth.localSecretKey, bunkerAuth.bunkerConnectionToken]);

  return {
    isAuthenticated,
    isConfigured,
    userPublicKey,
    userProfile,
  };
}
