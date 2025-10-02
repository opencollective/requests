import { useState, useEffect, useCallback, useRef } from 'react';
import type { Event, SimplePool, UnsignedEvent } from 'nostr-tools';

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

export interface UserMetadataState {
  metadata: UserMetadata | null;
  isLoading: boolean;
  error: string | null;
  temporaryUserName: string | null;
  fetchMetadata: () => Promise<void>;
  refreshMetadata: () => Promise<void>;
  updateMetadata: (_newMetadata: Partial<UserMetadata>) => void;
  setTemporaryUserName: (_name: string | null) => void;
}

/**
 * Hook to fetch and manage user metadata events (kind 0)
 * This fetches the user's profile information from Nostr relays
 */
export function useUserMetadata(
  isConnected: boolean,
  pool: SimplePool | null,
  relays: string[] | null,
  userPublicKey: string | null,
  submitEvent: ((event: UnsignedEvent) => string) | null
): UserMetadataState {
  const [metadata, setMetadata] = useState<UserMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temporaryUserName, setTemporaryUserName] = useState<string | null>(
    null
  );
  const temporaryUserNameRef = useRef<string | null>(null);

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

  const fetchMetadata = useCallback(async () => {
    if (!isConnected || !pool || !relays || !userPublicKey) {
      const errorMsg = 'Not connected to Nostr relays or no user public key';
      setError(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Query for user metadata event (kind 0)
      const metadataEvents = await pool.querySync(relays, {
        kinds: [0], // NIP-01: Metadata
        authors: [userPublicKey],
        limit: 1,
      });

      // Query for user metadata event (kind 0)
      if (metadataEvents.length === 0) {
        // No metadata found, use temporary user name if available
        const currentTemporaryUserName = temporaryUserNameRef.current;
        if (currentTemporaryUserName) {
          const tempMetadata: UserMetadata = {
            name: currentTemporaryUserName,
            created_at: Math.floor(Date.now() / 1000),
          };
          setMetadata(tempMetadata);
          setError(null);

          // Create and submit metadata event with temporary name
          if (submitEvent) {
            const metadataEvent = {
              kind: 0,
              content: JSON.stringify({
                name: currentTemporaryUserName,
              }),
              created_at: Math.floor(Date.now() / 1000),
              pubkey: userPublicKey,
              tags: [],
            };
            submitEvent(metadataEvent);
          }
        } else {
          setMetadata(null);
          setError(null);
        }
        return;
      }

      const metadataEvent = metadataEvents[0];
      const parsedMetadata = parseMetadataEvent(metadataEvent);

      if (parsedMetadata) {
        setMetadata(parsedMetadata);
        setError(null);
      } else {
        const errorMsg = 'Failed to parse user metadata';
        setError(errorMsg);
        setMetadata(null);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch user metadata';
      setError(errorMessage);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    isConnected,
    pool,
    relays,
    userPublicKey,
    parseMetadataEvent,
    submitEvent,
  ]);

  const refreshMetadata = useCallback(async () => {
    await fetchMetadata();
  }, [fetchMetadata]);

  const setTemporaryUserNameCallback = useCallback((name: string | null) => {
    setTemporaryUserName(name);
    temporaryUserNameRef.current = name;
  }, []);

  const updateMetadata = useCallback(
    (newMetadata: Partial<UserMetadata>) => {
      if (!isConnected || !pool || !relays || !userPublicKey) {
        setError('Cannot update metadata: not properly connected');
        return;
      }

      if (!submitEvent) {
        setError('Cannot update metadata: signing not available');
        return;
      }

      // Only update if we have fetched metadata at least once (metadata !== null)
      // This ensures we don't update before the initial fetch is complete
      if (metadata === null && !isLoading) {
        setError('Cannot update metadata: initial metadata fetch not complete');
        return;
      }

      try {
        // Create the new metadata event, preserving existing values
        const currentMetadata = metadata || {};
        const updatedMetadata = {
          ...currentMetadata,
          ...newMetadata,
        };

        const metadataEvent = {
          kind: 0,
          content: JSON.stringify({
            name: updatedMetadata.name,
            display_name: updatedMetadata.display_name,
            about: updatedMetadata.about,
            picture: updatedMetadata.picture,
            banner: updatedMetadata.banner,
            website: updatedMetadata.website,
            lud16: updatedMetadata.lud16,
            nip05: updatedMetadata.nip05,
          }),
          created_at: Math.floor(Date.now() / 1000),
          pubkey: userPublicKey,
          tags: [],
        };

        // Update local state immediately for better UX
        setMetadata(updatedMetadata);

        // Submit the event for signing and publishing
        submitEvent(metadataEvent);
      } catch {
        setError('Failed to create or submit metadata event');
      }
    },
    [isConnected, pool, relays, userPublicKey]
  );

  // Reset metadata when userPublicKey changes
  useEffect(() => {
    setMetadata(null);
    setError(null);
    setTemporaryUserName(null);
    temporaryUserNameRef.current = null;
    fetchMetadata();
  }, [userPublicKey]);

  return {
    metadata,
    isLoading,
    error,
    temporaryUserName,
    fetchMetadata,
    refreshMetadata,
    updateMetadata,
    setTemporaryUserName: setTemporaryUserNameCallback,
  };
}
