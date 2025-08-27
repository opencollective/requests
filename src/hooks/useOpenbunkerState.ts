import { useState, useCallback } from 'react';
import { openBunkerApi, type OpenBunkerResponse } from '../api/openbunker';
import type { RequestFormData } from '../types/RequestFormSchema';
import { generateSecretKey } from 'nostr-tools';

export interface OpenBunkerState {
  isSubmitting: boolean;
  error: string | null;
  lastResponse: OpenBunkerResponse | null;
  triggerOpenbunkerLogin: (data: RequestFormData) => Promise<void>;
  clearError: () => void;
  clearResponse: () => void;
}

export function useOpenbunkerState(
  hasSigningMethod: boolean,
  handleBunkerConnectionToken: (
    bunkerConnectionToken: string,
    localSecretKey: Uint8Array
  ) => Promise<void>
): OpenBunkerState {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<OpenBunkerResponse | null>(
    null
  );

  const triggerOpenbunkerLogin = useCallback(
    async (data: RequestFormData): Promise<void> => {
      if (hasSigningMethod) {
        return;
      }
      setIsSubmitting(true);
      setError(null);

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
        console.log('OpenBunker API result:', result);

        // Store the response
        setLastResponse(result);

        // Check if we got a bunker connection token
        if (result.success && result.bunkerConnectionToken) {
          try {
            // Generate a local secret key and handle the bunker connection
            const localSecretKey = generateSecretKey();
            await handleBunkerConnectionToken(
              result.bunkerConnectionToken,
              localSecretKey
            );
            console.log('Successfully connected to OpenBunker');
          } catch (bunkerError) {
            console.error('Failed to connect to OpenBunker:', bunkerError);
            setError(
              bunkerError instanceof Error
                ? bunkerError.message
                : 'Failed to connect to OpenBunker'
            );
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
        setIsSubmitting(false);
      }
    },
    [handleBunkerConnectionToken, hasSigningMethod]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResponse = useCallback(() => {
    setLastResponse(null);
  }, []);

  return {
    isSubmitting,
    error,
    lastResponse,
    triggerOpenbunkerLogin,
    clearError,
    clearResponse,
  };
}
