import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  generateSecretKey,
  getPublicKey,
  type Event,
  type UnsignedEvent,
} from 'nostr-tools';
import { useNostrConnectionState } from '../hooks/useNostrConnectionState';
import { useBunkerAuthState } from '../hooks/useBunkerAuthState';
import { useEventQueue } from '../hooks/useEventQueue';
import { useCommunityEvent } from '../hooks/useCommunityEvent';
import { useUserMetadata } from '../hooks/useUserMetadata';
import { NostrContext, type NostrContextType } from './NostrContext';
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

export function NostrProvider({ children }: { children: React.ReactNode }) {
  // Use custom hooks for different state management
  const connectionState = useNostrConnectionState();
  const bunkerAuth = useBunkerAuthState();
  const communityEvent = useCommunityEvent(
    connectionState.isConnected,
    connectionState.pool,
    connectionState.relays
  );

  // Compute userPublicKey as async value
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);

  // Update userPublicKey when authentication state changes
  useEffect(() => {
    const updateUserPublicKey = async () => {
      let pubkey: string | null = null;

      if (bunkerAuth.bunkerSigner && bunkerAuth.bunkerStatus === 'connected') {
        // Get public key from bunker auth state
        try {
          pubkey = (await bunkerAuth.bunkerSigner.getPublicKey()) || null;
        } catch (err) {
          console.error('Failed to get public key from bunker signer:', err);
        }
      }

      setUserPublicKey(pubkey);
    };

    updateUserPublicKey();
  }, [
    bunkerAuth.bunkerConnectionConfiguration,
    bunkerAuth.bunkerSigner,
    bunkerAuth.bunkerStatus,
  ]);

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
    () => !!bunkerAuth.bunkerSigner,
    [bunkerAuth.bunkerSigner]
  );

  const isConfigured = useMemo(
    () => !!bunkerAuth.bunkerConnectionConfiguration,
    [bunkerAuth.bunkerConnectionConfiguration]
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
      }
      return event;
    },
    [connectionState.pool, connectionState.relays]
  );

  // Sign and send event (placeholder - implement based on your needs)
  const signAndSendEvent = useCallback(
    async (event: UnsignedEvent) => {
      // Event needs to be signed first
      if (bunkerAuth.bunkerSigner) {
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
    [bunkerAuth.bunkerSigner, sendVerifiedEvent]
  );

  // Initialize event queue with the sendEvent function
  const eventQueue = useEventQueue(signAndSendEvent);

  // New submitEvent function that adds events to the queue
  const submitEvent = useCallback(
    (event: UnsignedEvent) => {
      const queueItemId = eventQueue.addToQueue(event);
      return queueItemId;
    },
    [eventQueue]
  );

  const userMetadata = useUserMetadata(
    connectionState.isConnected,
    connectionState.pool,
    connectionState.relays,
    userPublicKey,
    submitEvent
  );

  // Logout function that clears all states
  const logout = useCallback(async () => {
    await bunkerAuth.bunkerLogout();
    eventQueue.clearQueue();
  }, [bunkerAuth, eventQueue]);

  // Process queue when authentication becomes available
  React.useEffect(() => {
    if (isConfigured && eventQueue.queue.length > 0) {
      // Only process events if we have a signing method available

      if (hasSigningMethod) {
        // Try to process any pending events in the queue
        eventQueue.processQueue();
      }
    }
  }, [hasSigningMethod, isConfigured, eventQueue, bunkerAuth.bunkerSigner]);

  const handleOpenBunkerSuccess = useCallback(
    (openBunkerEvent: MessageEvent<OpenBunkerAuthSuccessEvent>) => {
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
    [bunkerAuth]
  );

  const configureBunkerConnectionWithBunkerToken = useCallback(async () => {
    await openBunkerApi.openBunkerPopupOpen(
      setPopup,
      handleOpenBunkerSuccess as (
        _event: MessageEvent<OpenBunkerAuthSuccessEvent>
      ) => Promise<void>
    );
  }, [handleOpenBunkerSuccess]);

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
    async (secret: string): Promise<void> => {
      if (!lastResponse?.bunkerConnectionToken) {
        throw new Error('No bunker connection token available');
      }

      setIsOBAPISubmitting(true);
      setError(null);

      try {
        const bunkerConnectionTokenWithSecret =
          openBunkerApi.buildBunkerConnectionUrl(lastResponse, secret);

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
    [bunkerAuth, lastResponse]
  );

  const value: NostrContextType = {
    // Pool and general Nostr connection state
    ...connectionState,

    isConfigured,
    userPublicKey,
    // Bunker authentication state
    ...bunkerAuth,

    // Event queue state
    ...eventQueue,

    // Community event state
    ...communityEvent,

    // User metadata state
    ...userMetadata,

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
