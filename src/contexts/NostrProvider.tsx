import React, { useCallback } from 'react';
import type { Event } from 'nostr-tools';
import type { NostrContextType } from './NostrContextTypes';
import { NostrContext } from './NostrContext';
import {
  useNostrConnectionState,
  useSecretKeyAuthState,
  useBunkerAuthState,
  useUserAuthenticationState,
} from '../hooks/useNostrStates';
import { useEventQueue } from '../hooks/useEventQueue';

export function NostrProvider({ children }: { children: React.ReactNode }) {
  // Use custom hooks for different state management
  const connectionState = useNostrConnectionState();
  const secretKeyAuth = useSecretKeyAuthState();
  const bunkerAuth = useBunkerAuthState();
  const userAuth = useUserAuthenticationState(secretKeyAuth, bunkerAuth);

  // Send event (requires authentication)
  const sendVerifiedEvent = useCallback(
    async (event: Event) => {
      if (!connectionState.pool) return;

      try {
        await connectionState.pool.publish(connectionState.relays, event);
        console.log('Event published successfully');
      } catch (err) {
        console.error('Failed to publish event:', err);
        // Note: Error handling is now managed in the secret key auth state
      }
    },
    [connectionState.pool, connectionState.relays]
  );

  // Sign and send event (placeholder - implement based on your needs)
  const signAndSendEvent = useCallback(
    async (event: Event) => {
      // Implement signing logic here based on whether using secret key or bunker
      if (secretKeyAuth.localSecretKey) {
        // Sign with local secret key
        return sendVerifiedEvent(event);
      } else if (bunkerAuth.bunkerSigner) {
        // Sign with bunker signer
        return sendVerifiedEvent(event);
      } else {
        throw new Error('No signing method available');
      }
    },
    [secretKeyAuth.localSecretKey, bunkerAuth.bunkerSigner, sendVerifiedEvent]
  );

  // Simple sendEvent function for compatibility with existing components
  const sendEvent = useCallback(
    async (event: Event) => {
      return signAndSendEvent(event);
    },
    [signAndSendEvent]
  );

  // Initialize event queue with the sendEvent function
  const eventQueue = useEventQueue(sendEvent);

  // Logout function that clears all states
  const logout = useCallback(() => {
    secretKeyAuth.secretKeyLogout();
    bunkerAuth.bunkerLogout();
    eventQueue.clearQueue();
  }, [secretKeyAuth, bunkerAuth, eventQueue]);

  // New submitEvent function that adds events to the queue
  const submitEvent = useCallback(
    (event: Event) => {
      eventQueue.addToQueue(event);
      console.log('Event added to queue:', event);
    },
    [eventQueue]
  );

  // Process queue when authentication becomes available
  React.useEffect(() => {
    if (userAuth.isAuthenticated && eventQueue.queue.length > 0) {
      // Try to process any pending events in the queue
      eventQueue.processQueue();
    }
  }, [userAuth.isAuthenticated, eventQueue]);

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
