import type { Event, Filter } from 'nostr-tools';
import type { BunkerSigner } from 'nostr-tools/nip46';

export interface NostrContextType {
  localSecretKey: Uint8Array | null;
  userPublicKey: string | null;
  bunkerConnectionToken: string | null;
  setBunkerConnectionToken: (token: string) => void;
  setLocalSecretKey: (sk: Uint8Array) => void;
  handleBunkerConnectionToken: (
    bunkerConnectionToken: string,
    localSecretKey: Uint8Array
  ) => void;

  isConnected: boolean;
  bunkerStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  bunkerError: string | null;
  bunkerSigner: BunkerSigner | null;
  events: Event[];
  userProfile: Event | null;
  fetchUserProfile: () => Promise<void>;
  updateUserProfile: (profileData: Record<string, string>) => Promise<void>;
  sendEvent: (event: Event) => void;
  subscribeToEvents: (filter: Filter) => void;
  clearEvents: () => void;
  error: string | null;
}
