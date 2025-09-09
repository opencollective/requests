import { useState, useCallback } from 'react';
import { openBunkerApi, type OpenBunkerResponse } from '../api/openbunker';
import type { RequestFormData } from '../types/RequestFormSchema';
import { generateSecretKey } from 'nostr-tools';
import type { OpenBunkerState } from '../contexts/NostrContextTypes';

export function useOpenbunkerState(
  hasSigningMethod: boolean,
  handleBunkerConnectionToken: (
    _bunkerConnectionToken: string,
    _localSecretKey: Uint8Array
  ) => Promise<void>
): OpenBunkerState {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<OpenBunkerResponse | null>(
    null
  );
  const [isWaitingForConfirmation, setIsWaitingForConfirmation] =
    useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const submitToOpenBunker = useCallback(
    async (data: RequestFormData): Promise<void> => {
      if (hasSigningMethod) {
        return;
      }
      setIsSubmitting(true);
      setError(null);
      setIsWaitingForConfirmation(false);
      setEmail(data.email);
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

        // Store the response
        setLastResponse(result);

        // Check if we got a bunker connection token
        if (result.success && result.bunkerConnectionToken) {
          // Check if the token contains a secret parameter
          const url = new URL(result.bunkerConnectionToken);
          const secret = url.searchParams.get('secret');

          if (secret) {
            // If we have a secret, proceed with bunker connection
            try {
              const localSecretKey = generateSecretKey();
              await handleBunkerConnectionToken(
                result.bunkerConnectionToken,
                localSecretKey
              );
            } catch (bunkerError) {
              setError(
                bunkerError instanceof Error
                  ? bunkerError.message
                  : 'Failed to connect to OpenBunker'
              );
            }
          } else {
            // No secret in the token, set waiting state
            setIsWaitingForConfirmation(true);
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

  const confirmBunkerConnection = useCallback(
    async (secret: string, email: string): Promise<void> => {
      if (!lastResponse?.bunkerConnectionToken) {
        throw new Error('No bunker connection token available');
      }

      setIsSubmitting(true);
      setError(null);

      try {
        // Create a new bunker connection token with the secret
        const url = new URL(lastResponse.bunkerConnectionToken);

        // FIXME this is a hack to get the secret and email into the bunker connection token
        const craftedSecret = secret + '+' + email;
        url.searchParams.set('secret', craftedSecret);
        const bunkerConnectionTokenWithSecret = url.toString();

        // Generate a local secret key and handle the bunker connection
        const localSecretKey = generateSecretKey();
        await handleBunkerConnectionToken(
          bunkerConnectionTokenWithSecret,
          localSecretKey
        );
        setIsWaitingForConfirmation(false);
      } catch (bunkerError) {
        setError(
          bunkerError instanceof Error
            ? bunkerError.message
            : 'Failed to connect to OpenBunker'
        );
        throw bunkerError;
      } finally {
        setIsSubmitting(false);
      }
    },
    [lastResponse?.bunkerConnectionToken, handleBunkerConnectionToken]
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
    isWaitingForConfirmation,
    submitToOpenBunker,
    confirmBunkerConnection,
    clearError,
    clearResponse,
    email,
  };
}
