import { createContext } from 'react';
import type { Event, UnsignedEvent, VerifiedEvent } from 'nostr-tools';
import type { NostrConnectionState } from '../hooks/useNostrConnectionState';
import type { BunkerAuthState } from '../hooks/useBunkerAuthState';
import type { SecretKeyAuthState } from '../hooks/useSecretKeyAuthState';
import type { EventQueueState } from '../hooks/useEventQueue';
import type { UserMetadataState } from '../hooks/useUserMetadata';
import type { RequestFormData } from '../types/RequestFormSchema';
import type { OpenBunkerResponse } from '../api/openbunker';

// Callbacks for authenticated operations
export interface AuthenticatedCallbacks {
  logout: () => Promise<void>;
  sendVerifiedEvent: (event: VerifiedEvent) => Promise<Event>;
  signAndSendEvent: (event: UnsignedEvent) => Promise<Event>;
  submitEvent: (event: UnsignedEvent) => string; // Returns the queue item ID
}

export interface NostrContextType
  extends NostrConnectionState,
    BunkerAuthState,
    SecretKeyAuthState,
    EventQueueState,
    UserMetadataState,
    AuthenticatedCallbacks {
  // Computed aggregated nostr status for display
  popup: Window | null;
  isConfigured: boolean;
  userPublicKey: string | null;
  // API flow
  submitToOpenBunker: (data: RequestFormData) => Promise<void>;
  confirmBunkerConnection: (secret: string) => Promise<void>;
  // Nostr connect flow
  configureBunkerConnectionWithNostrConnect: () => Promise<void>;
  configureBunkerConnectionWithBunkerToken: () => Promise<void>;
  isOBAPISubmitting: boolean;
  isWaitingForConfirmation: boolean;
  email: string | null;
  error: string | null;
  lastResponse: OpenBunkerResponse | null;
}

export const NostrContext = createContext<NostrContextType | undefined>(
  undefined
);
