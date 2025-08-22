import { useState, useCallback, useEffect } from 'react';
import { SimplePool, getPublicKey } from 'nostr-tools';
import type { Event, Filter } from 'nostr-tools';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46';
import localforage from 'localforage';
import type {
  NostrConnectionState,
  SecretKeyAuthState,
  BunkerAuthState,
  UserAuthenticationState,
} from '../contexts/NostrContextTypes';

// Configure localForage
localforage.config({
  name: 'nostr-community-requests',
  storeName: 'nostr-storage',
});

// Storage keys
const STORAGE_KEYS = {
  LOCAL_SECRET_KEY: 'local-secret-key',
  BUNKER_CONNECTION_TOKEN: 'bunker-connection-token',
  BUNKER_LOCAL_SECRET_KEY: 'bunker-local-secret-key',
  BUNKER_PUBLIC_KEY: 'bunker-public-key',
} as const;

// Storage utility functions
export const storage = {
  async saveSecretKey(secretKey: Uint8Array): Promise<void> {
    try {
      await localforage.setItem(
        STORAGE_KEYS.LOCAL_SECRET_KEY,
        Array.from(secretKey)
      );
    } catch (error) {
      console.error('Failed to save secret key:', error);
    }
  },

  async loadSecretKey(): Promise<Uint8Array | null> {
    try {
      const stored = await localforage.getItem<number[]>(
        STORAGE_KEYS.LOCAL_SECRET_KEY
      );
      return stored ? new Uint8Array(stored) : null;
    } catch (error) {
      console.error('Failed to load secret key:', error);
      return null;
    }
  },

  async saveBunkerToken(token: string): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.BUNKER_CONNECTION_TOKEN, token);
    } catch (error) {
      console.error('Failed to save bunker token:', error);
    }
  },

  async loadBunkerToken(): Promise<string | null> {
    try {
      return await localforage.getItem<string>(
        STORAGE_KEYS.BUNKER_CONNECTION_TOKEN
      );
    } catch (error) {
      console.error('Failed to load bunker token:', error);
      return null;
    }
  },

  async saveBunkerLocalSecretKey(secretKey: Uint8Array): Promise<void> {
    try {
      await localforage.setItem(
        STORAGE_KEYS.BUNKER_LOCAL_SECRET_KEY,
        Array.from(secretKey)
      );
    } catch (error) {
      console.error('Failed to save bunker local secret key:', error);
    }
  },

  async loadBunkerLocalSecretKey(): Promise<Uint8Array | null> {
    try {
      const stored = await localforage.getItem<number[]>(
        STORAGE_KEYS.BUNKER_LOCAL_SECRET_KEY
      );
      return stored ? new Uint8Array(stored) : null;
    } catch (error) {
      console.error('Failed to load bunker local secret key:', error);
      return null;
    }
  },

  async saveBunkerPublicKey(publicKey: string): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.BUNKER_PUBLIC_KEY, publicKey);
    } catch (error) {
      console.error('Failed to save bunker public key:', error);
    }
  },

  async loadBunkerPublicKey(): Promise<string | null> {
    try {
      return await localforage.getItem<string>(STORAGE_KEYS.BUNKER_PUBLIC_KEY);
    } catch (error) {
      console.error('Failed to load bunker public key:', error);
      return null;
    }
  },

  async clearAll(): Promise<void> {
    try {
      await localforage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  },

  async hasStoredData(): Promise<boolean> {
    try {
      const [hasSecretKey, hasBunkerToken] = await Promise.all([
        localforage.getItem(STORAGE_KEYS.LOCAL_SECRET_KEY),
        localforage.getItem(STORAGE_KEYS.BUNKER_CONNECTION_TOKEN),
      ]);
      return !!(hasSecretKey || hasBunkerToken);
    } catch (error) {
      console.error('Failed to check stored data:', error);
      return false;
    }
  },
};

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

  // Load secret key from storage on mount
  useEffect(() => {
    const loadStoredSecretKey = async () => {
      try {
        const stored = await storage.loadSecretKey();
        if (stored) {
          setLocalSecretKeyState(stored);
          console.log('Loaded secret key from storage');
        }
      } catch (error) {
        console.error('Failed to load secret key from storage:', error);
      }
    };

    loadStoredSecretKey();
  }, []);

  const setLocalSecretKey = useCallback(async (sk: Uint8Array) => {
    setLocalSecretKeyState(sk);
    setSecretKeyError(null);
    // Save to storage
    await storage.saveSecretKey(sk);
  }, []);

  const secretKeyLogout = useCallback(async () => {
    setLocalSecretKeyState(null);
    setSecretKeyError(null);
    // Clear from storage
    await storage.clearAll();
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
  const [bunkerPublicKey, setBunkerPublicKey] = useState<string | null>(null);

  // Load bunker data from storage on mount
  useEffect(() => {
    const loadStoredBunkerData = async () => {
      try {
        const [token, secretKey, publicKey] = await Promise.all([
          storage.loadBunkerToken(),
          storage.loadBunkerLocalSecretKey(),
          storage.loadBunkerPublicKey(),
        ]);

        if (token && secretKey) {
          setBunkerConnectionToken(token);
          setBunkerLocalSecretKey(secretKey);
          if (publicKey) {
            setBunkerPublicKey(publicKey);
          }
          console.log(
            'Loaded bunker data from storage, attempting reconnection...'
          );

          // Automatically attempt to reconnect when data is loaded from storage
          try {
            setBunkerStatus('connecting');
            setBunkerError(null);

            const bunkerInput = await parseBunkerInput(token);
            if (!bunkerInput) {
              throw new Error('Invalid bunker input from storage');
            }

            let bunkerSigner = new BunkerSigner(secretKey, bunkerInput);

            // Retry connection with timeout - up to 3 attempts
            const maxRetries = 3;
            const timeoutMs = 10000; // 10 seconds timeout
            let lastError: Error | null = null;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                bunkerSigner = new BunkerSigner(secretKey, bunkerInput);
                console.log(
                  `Auto-reconnection attempt ${attempt}/${maxRetries}`
                );

                // Create a promise that rejects after timeout
                const timeoutPromise = new Promise<never>((_, reject) => {
                  setTimeout(
                    () => reject(new Error('Connection timeout')),
                    timeoutMs
                  );
                });

                // Race between connection and timeout
                await Promise.race([bunkerSigner.connect(), timeoutPromise]);

                // If we get here, connection was successful
                console.log('Bunker auto-reconnection successful');
                setBunkerStatus('connected');
                setBunkerSigner(bunkerSigner);
                return; // Exit the function successfully
              } catch (err) {
                lastError =
                  err instanceof Error
                    ? err
                    : new Error('Unknown connection error');
                console.error(
                  `Bunker auto-reconnection attempt ${attempt} failed:`,
                  lastError.message
                );

                if (attempt < maxRetries) {
                  // Wait before retrying (exponential backoff)
                  const delayMs = Math.min(
                    1000 * Math.pow(2, attempt - 1),
                    5000
                  );
                  console.log(`Waiting ${delayMs}ms before retry...`);
                  await new Promise(resolve => setTimeout(resolve, delayMs));
                }
              }
            }

            // If we get here, all attempts failed
            console.error('All bunker auto-reconnection attempts failed');
            setBunkerStatus('error');
            setBunkerError(
              `Failed to auto-reconnect to bunker after ${maxRetries} attempts. Last error: ${
                lastError?.message || 'Unknown error'
              }`
            );
          } catch (reconnectErr) {
            console.error('Failed to auto-reconnect bunker:', reconnectErr);
            setBunkerStatus('error');
            setBunkerError(
              reconnectErr instanceof Error
                ? reconnectErr.message
                : 'Failed to auto-reconnect bunker'
            );
          }
        }
      } catch (error) {
        console.error('Failed to load bunker data from storage:', error);
      }
    };

    loadStoredBunkerData();
  }, []);

  const handleBunkerConnectionToken = useCallback(
    async (bunkerConnectionToken: string, localSecretKey: Uint8Array) => {
      try {
        setBunkerStatus('connecting');
        setBunkerError(null);
        setBunkerConnectionToken(bunkerConnectionToken); // Store the token
        setBunkerLocalSecretKey(localSecretKey); // Store the local secret key used with bunker

        // Save to storage
        await Promise.all([
          storage.saveBunkerToken(bunkerConnectionToken),
          storage.saveBunkerLocalSecretKey(localSecretKey),
        ]);

        console.log('Bunker connection token:', bunkerConnectionToken);

        const bunkerInput = await parseBunkerInput(bunkerConnectionToken);
        if (!bunkerInput) {
          throw new Error('Invalid bunker input');
        }

        const bunkerPubkey = bunkerInput.pubkey;
        const bunkerRelays = bunkerInput.relays;
        console.log('Bunker pubkey:', bunkerPubkey);
        console.log('Bunker relays:', bunkerRelays);

        // Store the bunker public key
        setBunkerPublicKey(bunkerPubkey);
        // Save to storage
        await storage.saveBunkerPublicKey(bunkerPubkey);

        let bunkerSigner = new BunkerSigner(localSecretKey, bunkerInput);

        // Retry connection with timeout - up to 3 attempts
        const maxRetries = 3;
        const timeoutMs = 10000; // 10 seconds timeout
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            bunkerSigner = new BunkerSigner(localSecretKey, bunkerInput);
            console.log(
              `Attempting bunker connection (attempt ${attempt}/${maxRetries})`
            );

            // Create a promise that rejects after timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(
                () => reject(new Error('Connection timeout')),
                timeoutMs
              );
            });

            // Race between connection and timeout
            await Promise.race([bunkerSigner.connect(), timeoutPromise]);

            // If we get here, connection was successful
            console.log('Bunker connected successfully');
            setBunkerStatus('connected');
            setBunkerSigner(bunkerSigner);
            return; // Exit the function successfully
          } catch (err) {
            lastError =
              err instanceof Error
                ? err
                : new Error('Unknown connection error');
            console.error(
              `Bunker connection attempt ${attempt} failed:`,
              lastError.message
            );

            if (attempt < maxRetries) {
              // Wait before retrying (exponential backoff)
              const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              console.log(`Waiting ${delayMs}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
        }

        // If we get here, all attempts failed
        console.error('All bunker connection attempts failed');
        setBunkerStatus('error');
        setBunkerError(
          `Failed to connect to bunker after ${maxRetries} attempts. Last error: ${
            lastError?.message || 'Unknown error'
          }`
        );
      } catch (err) {
        console.error('Failed to setup bunker connection:', err);
        setBunkerStatus('error');
        setBunkerError(
          err instanceof Error
            ? err.message
            : 'Failed to setup bunker connection'
        );
      }
    },
    []
  );

  const bunkerLogout = useCallback(async () => {
    setBunkerConnectionToken(null);
    setBunkerStatus('disconnected');
    setBunkerError(null);
    setBunkerSigner(null);
    setBunkerLocalSecretKey(null);
    setBunkerPublicKey(null);
    // Clear from storage
    await storage.clearAll();
  }, []);

  const setLocalSecretKey = useCallback(async (sk: Uint8Array) => {
    setBunkerLocalSecretKey(sk);
    // Save to storage
    await storage.saveBunkerLocalSecretKey(sk);
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
    bunkerPublicKey,
  };
}

export function useUserAuthenticationState(
  secretKeyAuth: SecretKeyAuthState,
  bunkerAuth: BunkerAuthState
): UserAuthenticationState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);
  const [userProfile] = useState<Event | null>(null);

  // Calculate user public key from available authentication methods
  useEffect(() => {
    let pubkey: string | null = null;

    if (secretKeyAuth.localSecretKey) {
      // Derive public key from local secret key
      try {
        pubkey = getPublicKey(secretKeyAuth.localSecretKey);
      } catch (err) {
        console.error('Failed to derive public key from secret key:', err);
      }
    } else if (
      bunkerAuth.bunkerSigner &&
      bunkerAuth.bunkerStatus === 'connected'
    ) {
      // Get public key from bunker auth state
      pubkey = bunkerAuth.bunkerPublicKey;
    }

    setUserPublicKey(pubkey);
  }, [
    secretKeyAuth.localSecretKey,
    bunkerAuth.bunkerSigner,
    bunkerAuth.bunkerStatus,
    bunkerAuth.bunkerPublicKey,
  ]);

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
