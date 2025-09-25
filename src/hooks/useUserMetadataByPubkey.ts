import { useState, useCallback } from 'react';
import type { Event, SimplePool } from 'nostr-tools';

export interface UserMetadata {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  website?: string;
  lud16?: string;
  nip05?: string;
  created_at?: number;
}

export interface UserMetadataByPubkeyState {
  metadataByPubkey: Record<string, UserMetadata>;
  isLoading: boolean;
  error: string | null;
  fetchMetadataForPubkey: (pubkey: string) => Promise<void>;
  getDisplayName: (pubkey: string) => string;
}

/**
 * Hook to fetch and manage user metadata events (kind 0) for any public key
 * This fetches profile information from Nostr relays for any given public key
 */
export function useUserMetadataByPubkey(
  isConnected: boolean,
  pool: SimplePool | null,
  relays: string[] | null
): UserMetadataByPubkeyState {
  const [metadataByPubkey, setMetadataByPubkey] = useState<
    Record<string, UserMetadata>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseMetadataEvent = useCallback(
    (event: Event): UserMetadata | null => {
      try {
        if (event.kind !== 0) {
          return null;
        }

        const parsedContent = JSON.parse(event.content);

        return {
          name: parsedContent.name,
          display_name: parsedContent.display_name,
          about: parsedContent.about,
          picture: parsedContent.picture,
          banner: parsedContent.banner,
          website: parsedContent.website,
          lud16: parsedContent.lud16,
          nip05: parsedContent.nip05,
          created_at: event.created_at,
        };
      } catch (err) {
        console.error('Failed to parse metadata event:', err);
        return null;
      }
    },
    []
  );

  const fetchMetadataForPubkey = useCallback(
    async (pubkey: string) => {
      if (!isConnected || !pool || !relays) {
        const errorMsg = 'Not connected to Nostr relays';
        setError(errorMsg);
        return;
      }

      // If we already have metadata for this pubkey, don't fetch again
      if (metadataByPubkey[pubkey]) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Query for user metadata event (kind 0)
        const metadataEvents = await pool.querySync(relays, {
          kinds: [0], // NIP-01: Metadata
          authors: [pubkey],
          limit: 1,
        });

        if (metadataEvents.length === 0) {
          // Store empty metadata to avoid refetching
          setMetadataByPubkey(prev => ({
            ...prev,
            [pubkey]: {},
          }));
          return;
        }

        const metadataEvent = metadataEvents[0];
        const parsedMetadata = parseMetadataEvent(metadataEvent);

        if (parsedMetadata) {
          setMetadataByPubkey(prev => ({
            ...prev,
            [pubkey]: parsedMetadata,
          }));
        } else {
          // Store empty metadata to avoid refetching
          setMetadataByPubkey(prev => ({
            ...prev,
            [pubkey]: {},
          }));
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch user metadata';
        setError(errorMessage);
        // Store empty metadata to avoid refetching
        setMetadataByPubkey(prev => ({
          ...prev,
          [pubkey]: {},
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, pool, relays, metadataByPubkey, parseMetadataEvent]
  );

  const getDisplayName = useCallback(
    (pubkey: string): string => {
      const metadata = metadataByPubkey[pubkey];
      if (!metadata) {
        return pubkey.slice(0, 8) + '...' + pubkey.slice(-8);
      }

      // Prefer display_name, then name, then fallback to truncated pubkey
      return (
        metadata.display_name ||
        metadata.name ||
        pubkey.slice(0, 8) + '...' + pubkey.slice(-8)
      );
    },
    [metadataByPubkey]
  );

  return {
    metadataByPubkey,
    isLoading,
    error,
    fetchMetadataForPubkey,
    getDisplayName,
  };
}
