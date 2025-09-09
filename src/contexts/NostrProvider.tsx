import React, { useCallback, useMemo } from 'react';
import { finalizeEvent, type Event, type UnsignedEvent } from 'nostr-tools';
import type { NostrContextType } from './NostrContextTypes';
import {
  useNostrConnectionState,
  useSecretKeyAuthState,
  useBunkerAuthState,
  useUserAuthenticationState,
} from '../hooks/useNostrStates';
import { useEventQueue } from '../hooks/useEventQueue';
import { useOpenbunkerState } from '../hooks/useOpenbunkerState';
import { NostrContext } from './NostrContext';

export function NostrProvider({ children }: { children: React.ReactNode }) {
  // Use custom hooks for different state management
  const connectionState = useNostrConnectionState();
  const secretKeyAuth = useSecretKeyAuthState();
  const bunkerAuth = useBunkerAuthState();
  const userAuth = useUserAuthenticationState(secretKeyAuth, bunkerAuth);

  const hasSigningMethod = useMemo(
    () => !!secretKeyAuth.localSecretKey || !!bunkerAuth.bunkerSigner,
    [secretKeyAuth.localSecretKey, bunkerAuth.bunkerSigner]
  );
  // Initialize OpenBunker state
  const openBunkerState = useOpenbunkerState(
    hasSigningMethod,
    bunkerAuth.handleBunkerConnectionToken
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

  // Simple sendEvent function for compatibility with existing components
  const sendEvent = useCallback(
    async (event: Event) => {
      return await signAndSendEvent(event);
    },
    [signAndSendEvent]
  );

  // Logout function that clears all states
  const logout = useCallback(async () => {
    await Promise.all([
      secretKeyAuth.secretKeyLogout(),
      bunkerAuth.bunkerLogout(),
    ]);
    eventQueue.clearQueue();
    openBunkerState.clearResponse();
  }, [secretKeyAuth, bunkerAuth, eventQueue, openBunkerState]);

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
    if (userAuth.isAuthenticated && eventQueue.queue.length > 0) {
      // Only process events if we have a signing method available

      if (hasSigningMethod) {
        // Try to process any pending events in the queue
        eventQueue.processQueue();
      }
    }
  }, [
    hasSigningMethod,
    userAuth.isAuthenticated,
    eventQueue,
    secretKeyAuth.localSecretKey,
    bunkerAuth.bunkerSigner,
  ]);

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

  const value: NostrContextType = {
    // Pool and general Nostr connection state
    ...connectionState,

    // User authentication state
    ...userAuth,

    // Secret key authentication state
    ...secretKeyAuth,

    // Bunker authentication state
    ...bunkerAuth,

    // Event queue state
    ...eventQueue,

    // OpenBunker state
    ...openBunkerState,

    // Computed nostrStatus for display
    nostrStatus,

    // Callbacks
    logout,
    sendVerifiedEvent,
    sendEvent,
    submitEvent,
  };

  return (
    <NostrContext.Provider value={value}>{children}</NostrContext.Provider>
  );
}
