import { useState, useCallback, useEffect } from 'react';
import { SimplePool, generateSecretKey, getPublicKey } from 'nostr-tools';

import type { Event, Filter } from 'nostr-tools';
import {
  BunkerSigner,
  type BunkerPointer,
  parseBunkerInput,
} from 'nostr-tools/nip46';
import localforage from 'localforage';
import type {
  NostrConnectionState,
  SecretKeyAuthState,
  BunkerAuthState,
  UserAuthenticationState,
} from '../contexts/NostrContextTypes';
import {
  bunkerSignerfromURI,
  createNostrConnectURI,
} from '../utils/nip46Utils';

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

export function useSecretKeyAuthState(): SecretKeyAuthState {
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

export type BunkerConnectionConfiguration = {
  connectionToken: string;
  localSecretKey: Uint8Array;
  publicKey: string;
  bunkerPointer: BunkerPointer;
};

export function useBunkerAuthState(): BunkerAuthState {
  const [bunkerStatus, setBunkerStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');
  const [bunkerError, setBunkerErrorState] = useState<string | null>(null);
  const [bunkerSigner, setBunkerSigner] = useState<BunkerSigner | null>(null);
  const [bunkerConnectionConfiguration, setBunkerConnectionConfiguration] =
    useState<BunkerConnectionConfiguration | null>(null);
  const configureBunkerConnection = useCallback(
    async (
      bunkerConnectionToken: string,
      localSecretKey: Uint8Array
    ): Promise<BunkerConnectionConfiguration> => {
      const bunkerPointer = await parseBunkerInput(bunkerConnectionToken);
      if (!bunkerPointer) {
        throw new Error('Invalid bunker input');
      }
      const bunkerConnectionConfiguration = {
        connectionToken: bunkerConnectionToken,
        localSecretKey: localSecretKey,
        publicKey: bunkerPointer.pubkey,
        bunkerPointer: bunkerPointer,
      };
      setBunkerConnectionConfiguration(bunkerConnectionConfiguration);
      return bunkerConnectionConfiguration;
    },
    []
  );

  const configureBunkerConnectionWithNostrConnect = useCallback(async () => {
    const localSecretKey = generateSecretKey();
    const secret = Math.random().toString(36).substring(2, 15);

    const connectionUri = createNostrConnectURI({
      clientPubkey: getPublicKey(localSecretKey),
      relays: ['wss://relay.nsec.app'],
      secret: secret,
      name: 'Community Requests',
    });

    // Get the OpenBunker URL from environment or use default
    const baseUrl =
      import.meta.env.VITE_OPENBUNKER_POPUP_URL || '/openbunker-login-popup';

    // Add query parameters for nostrconnect mode and token
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set('connectionMode', 'nostrconnect');
    url.searchParams.set('connectionToken', connectionUri);

    // Create a promise that resolves when the popup closes
    const popupPromise = new Promise<void>(resolve => {
      const popupWindow = window.open(
        url.toString(),
        'openbunker-login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popupWindow) {
        resolve();
        return;
      }

      // Check if popup is closed
      const checkClosed = setInterval(() => {
        if (popupWindow.closed) {
          clearInterval(checkClosed);
          resolve();
        }
      }, 1000);
    });

    // Wait for both the bunker connection and popup to complete
    const [bunkerSigner] = await Promise.all([
      bunkerSignerfromURI(localSecretKey, connectionUri),
      popupPromise,
    ]);

    // If we get here, connection was successful
    setBunkerSigner(bunkerSigner as BunkerSigner);
  }, []);
  const connected = useCallback(() => {
    setBunkerStatus('connected');
    setBunkerErrorState(null);
  }, []);

  const error = useCallback((error: string) => {
    setBunkerStatus('error');
    setBunkerErrorState(error);
  }, []);

  const disconnected = useCallback(() => {
    setBunkerStatus('disconnected');
    setBunkerErrorState(null);
    setBunkerSigner(null);
    setBunkerConnectionConfiguration(null);
  }, []);

  const connectToBunker = useCallback(
    async (bunkerSigner: BunkerSigner, timeoutMs: number) => {
      try {
        console.log(
          'Connecting to bunker: client-pubkey',
          bunkerSigner.bp.pubkey,
          'signer',
          bunkerSigner.bp.pubkey
        );

        // Create a promise that rejects after timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), timeoutMs);
        });

        // Race between connection and timeout
        const connectPromise = bunkerSigner.connect();
        await Promise.race([connectPromise, timeoutPromise]);
        connected();
      } catch (err) {
        console.error('Failed to connect to bunker:', err);
        error(
          err instanceof Error ? err.message : 'Failed to connect to bunker'
        );
      }
    },
    [connected, error]
  );

  const connectToBunkerWithRetry = useCallback(
    async (
      bunkerConnectionConfiguration: BunkerConnectionConfiguration,
      timeoutMs: number
    ) => {
      if (bunkerStatus === 'connecting') {
        return;
      }
      setBunkerErrorState(null);
      setBunkerStatus('connecting');
      // Automatically attempt to reconnect when data is loaded from storage
      try {
        // Retry connection with timeout - up to 3 attempts
        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const bunkerSigner = new BunkerSigner(
              bunkerConnectionConfiguration.localSecretKey,
              bunkerConnectionConfiguration.bunkerPointer
            );
            console.log(`Connection attempt ${attempt}/${maxRetries}`);
            await connectToBunker(bunkerSigner, timeoutMs);
            // If we get here, connection was successful
            setBunkerSigner(bunkerSigner);
            console.log('Bunker auto-reconnection successful');

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
                timeoutMs
              );
              console.log(`Waiting ${delayMs}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
        }

        // If we get here, all attempts failed
        error(
          `Failed to auto-reconnect to bunker after ${maxRetries} attempts. Last error: ${
            lastError?.message || 'Unknown error'
          }`
        );
      } catch (reconnectErr) {
        console.error('Failed to auto-reconnect bunker:', reconnectErr);
        error(
          reconnectErr instanceof Error
            ? reconnectErr.message
            : 'Failed to auto-reconnect bunker'
        );
      }
    },
    [bunkerConnectionConfiguration, disconnected, error, connectToBunker]
  );

  // Load bunker data from storage on mount
  useEffect(() => {
    const loadStoredBunkerData = async () => {
      try {
        console.log('loadStoredBunkerData');
        const [token, secretKey, publicKey] = await Promise.all([
          storage.loadBunkerToken(),
          storage.loadBunkerLocalSecretKey(),
          storage.loadBunkerPublicKey(),
        ]);
        if (token && secretKey && publicKey) {
          const bunkerConnectionConfiguration = await configureBunkerConnection(
            token,
            secretKey
          );
          if (!bunkerConnectionConfiguration) {
            console.warn('Bunker not configured');
            disconnected();
            return;
          }
          await connectToBunkerWithRetry(bunkerConnectionConfiguration, 10000);
        }
        console.log(token, secretKey, publicKey);
      } catch (error) {
        console.error('Failed to load bunker data from storage:', error);
      }
    };

    loadStoredBunkerData();
  }, []);

  const handleBunkerConnectionToken = useCallback(
    async (bunkerConnectionToken: string, localSecretKey: Uint8Array) => {
      try {
        console.log('handleBunkerConnectionToken');
        const bunkerConnectionConfiguration = await configureBunkerConnection(
          bunkerConnectionToken,
          localSecretKey
        );
        if (!bunkerConnectionConfiguration) {
          disconnected();
          console.warn('Bunker not configured');
          return;
        }

        await connectToBunkerWithRetry(bunkerConnectionConfiguration, 10000);
        await storage.saveBunkerToken(bunkerConnectionToken);
        await storage.saveBunkerLocalSecretKey(localSecretKey);
        await storage.saveBunkerPublicKey(
          bunkerConnectionConfiguration.publicKey
        );
      } catch (err) {
        console.error('Failed to handle bunker connection token:', err);
        error(
          err instanceof Error
            ? err.message
            : 'Failed to setup bunker connection'
        );
      }
    },
    [configureBunkerConnection, connectToBunkerWithRetry, disconnected, error]
  );

  const bunkerLogout = useCallback(async () => {
    disconnected();
    setBunkerSigner(null);
    setBunkerConnectionConfiguration(null);
    // Clear from storage
    await storage.clearAll();
  }, []);

  return {
    bunkerConnectionConfiguration,
    configureBunkerConnection,
    configureBunkerConnectionWithNostrConnect,
    handleBunkerConnectionToken,
    bunkerStatus,
    bunkerError,
    bunkerSigner,
    bunkerLogout,
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
      pubkey = bunkerAuth.bunkerConnectionConfiguration?.publicKey || null;
    }

    setUserPublicKey(pubkey);
  }, [
    secretKeyAuth.localSecretKey,
    bunkerAuth.bunkerSigner,
    bunkerAuth.bunkerStatus,
    bunkerAuth.bunkerConnectionConfiguration?.publicKey,
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
      const hasBunkerCredentials =
        bunkerAuth.bunkerConnectionConfiguration !== null;

      setIsConfigured(hasSecretKey || hasBunkerCredentials);
    };

    checkConfiguration();
  }, [secretKeyAuth.localSecretKey, bunkerAuth.bunkerConnectionConfiguration]);

  return {
    isAuthenticated,
    isConfigured,
    userPublicKey,
    userProfile,
  };
}
