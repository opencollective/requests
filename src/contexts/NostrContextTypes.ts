import type { Event, Filter, SimplePool, VerifiedEvent } from 'nostr-tools';
import type { BunkerSigner } from 'nostr-tools/nip46';

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
  secretKeyLogout: () => void;
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

  bunkerLogout: () => void;
}

// Callbacks for authenticated operations
export interface AuthenticatedCallbacks {
  logout: () => void;
  sendVerifiedEvent: (event: VerifiedEvent) => Promise<void>;
  sendEvent: (event: Event) => Promise<void>;
}

export interface NostrContextType
  extends NostrConnectionState,
    UserAuthenticationState,
    SecretKeyAuthState,
    BunkerAuthState,
    AuthenticatedCallbacks {}
