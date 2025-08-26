import type {
  Event,
  Filter,
  SimplePool,
  UnsignedEvent,
  VerifiedEvent,
} from 'nostr-tools';
import type { BunkerSigner } from 'nostr-tools/nip46';
import type { OpenBunkerResponse } from '../api/openbunker';
import type { RequestFormData } from '../types/RequestFormSchema';

// Event queue item for pending events
export interface EventQueueItem {
  id: string;
  event: UnsignedEvent;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ProcessedEventQueueItem {
  id: string;
  event: Event;
  timestamp: number;
  status: 'completed' | 'failed';
  error?: string;
}

// Event queue state
export interface EventQueueState {
  queue: EventQueueItem[];
  processedQueue: ProcessedEventQueueItem[];
  isProcessing: boolean;
  addToQueue: (event: UnsignedEvent) => string; // Returns the queue item ID
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  getQueueItemById: (
    id: string
  ) => EventQueueItem | ProcessedEventQueueItem | undefined;
  processQueue: () => Promise<void>;
}

// OpenBunker state for managing OpenBunker API interactions
export interface OpenBunkerState {
  isSubmitting: boolean;
  error: string | null;
  lastResponse: OpenBunkerResponse | null;
  triggerOpenbunkerLogin: (data: RequestFormData) => Promise<void>;
  clearError: () => void;
  clearResponse: () => void;
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
  sendVerifiedEvent: (event: VerifiedEvent) => Promise<Event>;
  sendEvent: (event: Event) => Promise<Event>;
  submitEvent: (event: UnsignedEvent) => string; // Returns the queue item ID
}

export interface NostrContextType
  extends NostrConnectionState,
    UserAuthenticationState,
    SecretKeyAuthState,
    BunkerAuthState,
    EventQueueState,
    OpenBunkerState,
    AuthenticatedCallbacks {}
