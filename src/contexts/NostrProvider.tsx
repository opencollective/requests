import React, { useCallback, useMemo, useState } from 'react';
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  type Event,
  type UnsignedEvent,
  type VerifiedEvent,
} from 'nostr-tools';
import {
  useNostrConnectionState,
  type NostrConnectionState,
} from '../hooks/useNostrConnectionState';
import {
  useSecretKeyAuthState,
  type SecretKeyAuthState,
} from '../hooks/useSecretKeyAuthState';
import {
  useBunkerAuthState,
  type BunkerAuthState,
} from '../hooks/useBunkerAuthState';
import { useEventQueue, type EventQueueState } from '../hooks/useEventQueue';
import { NostrContext } from './NostrContext';
import {
  bunkerSignerfromURI,
  createNostrConnectURI,
} from '../utils/nip46Utils';
import {
  openBunkerApi,
  type OpenBunkerAuthSuccessEvent,
  type OpenBunkerResponse,
} from '../api/openbunker';
import type { RequestFormData } from '../types/RequestFormSchema';

// Callbacks for authenticated operations
export interface AuthenticatedCallbacks {
  logout: () => Promise<void>;
  sendVerifiedEvent: (event: VerifiedEvent) => Promise<Event>;
  submitEvent: (event: UnsignedEvent) => string; // Returns the queue item ID
}

export interface NostrContextType
  extends NostrConnectionState,
    SecretKeyAuthState,
    BunkerAuthState,
    EventQueueState,
    AuthenticatedCallbacks {
  // Computed aggregated nostr status for display
  nostrStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  popup: Window | null;
  isConfigured: boolean;
  userPublicKey: string | null;
  // API flow
  submitToOpenBunker: (data: RequestFormData) => Promise<void>;
  confirmBunkerConnection: (secret: string, email: string) => Promise<void>;
  // Nostr connect flow
  configureBunkerConnectionWithNostrConnect: () => Promise<void>;
  configureBunkerConnectionWithBunkerToken: () => Promise<void>;
  isOBAPISubmitting: boolean;
  isWaitingForConfirmation: boolean;
  email: string | null;
  error: string | null;
  lastResponse: OpenBunkerResponse | null;
}

export function NostrProvider({ children }: { children: React.ReactNode }) {
  // Use custom hooks for different state management
  const connectionState = useNostrConnectionState();
  const secretKeyAuth = useSecretKeyAuthState();
  const bunkerAuth = useBunkerAuthState();

  // Openbunker specific
  const [isOBAPISubmitting, setIsOBAPISubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<OpenBunkerResponse | null>(
    null
  );
  const [isWaitingForConfirmation, setIsWaitingForConfirmation] =
    useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [popup, setPopup] = useState<Window | null>(null);

  const hasSigningMethod = useMemo(
    () => !!secretKeyAuth.localSecretKey || !!bunkerAuth.bunkerSigner,
    [secretKeyAuth.localSecretKey, bunkerAuth.bunkerSigner]
  );

  const isConfigured = useMemo(
    () =>
      !!secretKeyAuth.localSecretKey ||
      !!bunkerAuth.bunkerConnectionConfiguration,
    [secretKeyAuth.localSecretKey, bunkerAuth.bunkerConnectionConfiguration]
  );

  // Send event (requires authentication)
  const sendVerifiedEvent = useCallback(
    async (event: Event) => {
      if (!connectionState.pool) {
        throw new Error('No pool available');
      }

      try {
        await connectionState.pool.publish(connectionState.relays, event);
        console.log('Event published successfully');
      } catch (err) {
        console.error('Failed to publish event:', err);
        // Note: Error handling is now managed in the secret key auth state
      }
      return event;
    },
    [connectionState.pool, connectionState.relays]
  );

  // Sign and send event (placeholder - implement based on your needs)
  const signAndSendEvent = useCallback(
    async (event: UnsignedEvent) => {
      // Event needs to be signed first
      if (secretKeyAuth.localSecretKey) {
        const signedEvent = finalizeEvent(
          {
            kind: event.kind,
            content: event.content,
            tags: event.tags,
            created_at: event.created_at,
          },
          secretKeyAuth.localSecretKey
        );

        return sendVerifiedEvent(signedEvent);
      } else if (bunkerAuth.bunkerSigner) {
        // Sign with bunker signer
        const signedEvent = await bunkerAuth.bunkerSigner.signEvent({
          kind: event.kind,
          content: event.content,
          tags: event.tags,
          created_at: event.created_at,
        });

        return sendVerifiedEvent(signedEvent);
      } else {
        throw new Error('No signing method available');
      }
    },
    [secretKeyAuth.localSecretKey, bunkerAuth.bunkerSigner, sendVerifiedEvent]
  );

  // Initialize event queue with the sendEvent function
  const eventQueue = useEventQueue(signAndSendEvent);

  // Logout function that clears all states
  const logout = useCallback(async () => {
    await Promise.all([
      secretKeyAuth.secretKeyLogout(),
      bunkerAuth.bunkerLogout(),
    ]);
    eventQueue.clearQueue();
  }, [secretKeyAuth, bunkerAuth, eventQueue]);

  // New submitEvent function that adds events to the queue
  const submitEvent = useCallback(
    (event: UnsignedEvent) => {
      const queueItemId = eventQueue.addToQueue(event);
      console.log('Event added to queue:', event, 'with ID:', queueItemId);
      return queueItemId;
    },
    [eventQueue]
  );

  // Process queue when authentication becomes available
  React.useEffect(() => {
    if (isConfigured && eventQueue.queue.length > 0) {
      // Only process events if we have a signing method available

      if (hasSigningMethod) {
        // Try to process any pending events in the queue
        eventQueue.processQueue();
      }
    }
  }, [
    hasSigningMethod,
    isConfigured,
    eventQueue,
    secretKeyAuth.localSecretKey,
    bunkerAuth.bunkerSigner,
  ]);

  const handleOpenBunkerSuccess = useCallback(
    async (openBunkerEvent: MessageEvent<OpenBunkerAuthSuccessEvent>) => {
      try {
        const bunkerConnectionToken = openBunkerEvent.data.secretKey;
        const sk = generateSecretKey();
        // The bunker handling will continue in the background after navigating to the dashboard
        // no need to await
        bunkerAuth.handleBunkerConnectionToken(bunkerConnectionToken, sk);
      } catch (err) {
        console.error('Failed to complete OpenBunker authentication:', err);
      }
    },
    [bunkerAuth.handleBunkerConnectionToken]
  );

  const configureBunkerConnectionWithBunkerToken = useCallback(async () => {
    await openBunkerApi.openBunkerPopupOpen(
      setPopup,
      handleOpenBunkerSuccess as (
        _event: MessageEvent<OpenBunkerAuthSuccessEvent>
      ) => Promise<void>
    );
  }, [setPopup, handleOpenBunkerSuccess]);

  /**
   * This will init the flow from scratch using nostrconnect
   */
  const configureBunkerConnectionWithNostrConnect = useCallback(async () => {
    const localSecretKey = generateSecretKey();
    const secret = Math.random().toString(36).substring(2, 15);

    const connectionUri = createNostrConnectURI({
      clientPubkey: getPublicKey(localSecretKey),
      relays: ['wss://relay.nsec.app'],
      secret: secret,
      name: 'Community Requests',
    });

    const popupPromise = await openBunkerApi.openBunkerPopupNostrConnect(
      connectionUri,
      setPopup
    );
    // Wait for both the bunker connection and popup to complete
    const [bunkerSigner] = await Promise.all([
      bunkerSignerfromURI(localSecretKey, connectionUri),
      popupPromise,
    ]);
    console.log('bunkerSigner:', bunkerSigner);

    // If we get here, connection was successful
    await bunkerAuth.connected(bunkerSigner, localSecretKey);
  }, [bunkerAuth]);

  const submitToOpenBunker = async (data: RequestFormData) => {
    if (hasSigningMethod) {
      return;
    }
    setIsOBAPISubmitting(true);
    setError(null);
    setIsWaitingForConfirmation(false);
    setEmail(data.email);
    try {
      // Use the OpenBunker API to submit the request
      const result = await openBunkerApi.submitRequest({
        name: data.name,
        email: data.email,
        scope: import.meta.env.VITE_OPENBUNKER_SCOPE || 'community-requests',
        subject: data.subject,
        message: data.message,
        timestamp: new Date().toISOString(),
      });
      setLastResponse(result);
      if (result.success && result.bunkerConnectionToken) {
        // Check if the token contains a secret parameter
        const url = new URL(result.bunkerConnectionToken);
        const secret = url.searchParams.get('secret');

        if (secret) {
          // If we have a secret, proceed with bunker connection
          try {
            const localSecretKey = generateSecretKey();
            await bunkerAuth.handleBunkerConnectionToken(
              result.bunkerConnectionToken,
              localSecretKey
            );
          } catch (bunkerError) {
            setError(
              bunkerError instanceof Error
                ? bunkerError.message
                : 'Failed to connect to OpenBunker'
            );
          }
        } else {
          // No secret in the token, set waiting state
          setIsWaitingForConfirmation(true);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An error occurred while submitting the request';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsOBAPISubmitting(false);
    }
  };

  const confirmBunkerConnection = useCallback(
    async (secret: string, email: string): Promise<void> => {
      if (!lastResponse?.bunkerConnectionToken) {
        throw new Error('No bunker connection token available');
      }

      setIsOBAPISubmitting(true);
      setError(null);

      try {
        const bunkerConnectionTokenWithSecret =
          openBunkerApi.buildBunkerConnectionUrl(lastResponse, secret, email);

        // Generate a local secret key and handle the bunker connection
        const localSecretKey = generateSecretKey();
        await bunkerAuth.handleBunkerConnectionToken(
          bunkerConnectionTokenWithSecret,
          localSecretKey
        );
        setIsWaitingForConfirmation(false);
      } catch (bunkerError) {
        setError(
          bunkerError instanceof Error
            ? bunkerError.message
            : 'Failed to connect to OpenBunker'
        );
        throw bunkerError;
      } finally {
        setIsOBAPISubmitting(false);
      }
    },
    [lastResponse?.bunkerConnectionToken]
  );
  // Compute aggregated nostrStatus for display
  const nostrStatus = useMemo(() => {
    // If using bunker authentication, use bunker status
    if (bunkerAuth.bunkerConnectionConfiguration) {
      return bunkerAuth.bunkerStatus;
    }

    // If using local secret key authentication, check if we have a connection
    if (secretKeyAuth.localSecretKey) {
      return connectionState.isConnected ? 'connected' : 'disconnected';
    }

    // No authentication method configured
    return 'disconnected';
  }, [
    bunkerAuth.bunkerConnectionConfiguration,
    bunkerAuth.bunkerStatus,
    secretKeyAuth.localSecretKey,
    connectionState.isConnected,
  ]);

  const userPublicKey = useMemo(() => {
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
    return pubkey;
  }, [secretKeyAuth.localSecretKey, bunkerAuth.bunkerConnectionConfiguration]);

  const value: NostrContextType = {
    // Pool and general Nostr connection state
    ...connectionState,

    isConfigured,
    userPublicKey,
    // Secret key authentication state
    ...secretKeyAuth,

    // Bunker authentication state
    ...bunkerAuth,

    // Event queue state
    ...eventQueue,

    // Computed nostrStatus for display
    nostrStatus,
    isOBAPISubmitting,
    error,
    popup,
    isWaitingForConfirmation,
    email,
    // API flow with confirmation email
    submitToOpenBunker,
    confirmBunkerConnection,
    lastResponse,
    configureBunkerConnectionWithNostrConnect,
    configureBunkerConnectionWithBunkerToken,
    // Callbacks
    logout,
    sendVerifiedEvent,
    submitEvent,
  };

  return (
    <NostrContext.Provider value={value}>{children}</NostrContext.Provider>
  );
}
