import { useState, useCallback } from 'react';
import type { RequestFormData } from '../types/RequestFormSchema';
import { openBunkerApi, type OpenBunkerResponse } from '../api/openbunker';

export function useUnauthenticatedRequests() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitUnauthenticatedRequest = useCallback(
    async (data: RequestFormData): Promise<OpenBunkerResponse> => {
      setIsSubmitting(true);
      setError(null);

      try {
        // Use the OpenBunker API to submit the request
        const result = await openBunkerApi.submitRequest({
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          timestamp: new Date().toISOString(),
        });
        console.log('result', result);

        return result;
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
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    submitUnauthenticatedRequest,
    isSubmitting,
    error,
    clearError,
  };
}
