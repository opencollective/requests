import type { Event, Filter, SimplePool, VerifiedEvent } from 'nostr-tools';
import type { BunkerSigner } from 'nostr-tools/nip46';

// Event queue item for pending events
export interface EventQueueItem {
  id: string;
  event: Event;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// Event queue state
export interface EventQueueState {
  queue: EventQueueItem[];
  isProcessing: boolean;
  addToQueue: (event: Event) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  processQueue: () => Promise<void>;
}

// Pool and general Nostr connection state (no authentication required)
export interface NostrConnectionState {
  pool: SimplePool | null;
  isConnected: boolean;
  relays: string[];
  error: string | null;
  events: Event[];
  subscribeToEvents: (filter: Filter) => (() => void) | undefined;
  clearEvents: () => void;
}

// User authentication state - either secret key or bunker
export interface UserAuthenticationState {
  isAuthenticated: boolean;
  isConfigured: boolean;
  userPublicKey: string | null;
  userProfile: Event | null;
}

// Secret key authentication specific state
export interface SecretKeyAuthState {
  localSecretKey: Uint8Array | null;
  secretKeyError: string | null;
  secretKeyLogout: () => Promise<void>;
}

// Bunker authentication specific state
export interface BunkerAuthState {
  bunkerConnectionToken: string | null;
  setBunkerConnectionToken: (token: string) => void;
  handleBunkerConnectionToken: (
    bunkerConnectionToken: string,
    localSecretKey: Uint8Array
  ) => Promise<void>;
  bunkerStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  bunkerError: string | null;
  bunkerSigner: BunkerSigner | null;
  localSecretKey: Uint8Array | null; // Local secret key used with bunker
  setLocalSecretKey: (sk: Uint8Array) => void;
  bunkerPublicKey: string | null; // Public key from the bunker

  bunkerLogout: () => Promise<void>;
}

// Callbacks for authenticated operations
export interface AuthenticatedCallbacks {
  logout: () => Promise<void>;
  sendVerifiedEvent: (event: VerifiedEvent) => Promise<void>;
  sendEvent: (event: Event) => Promise<void>;
  submitEvent: (event: Event) => void; // New method for queue-based submission
}

export interface NostrContextType
  extends NostrConnectionState,
    UserAuthenticationState,
    SecretKeyAuthState,
    BunkerAuthState,
    EventQueueState,
    AuthenticatedCallbacks {}
