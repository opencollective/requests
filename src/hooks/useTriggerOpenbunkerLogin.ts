import { useState, useCallback } from 'react';
import { openBunkerApi, type OpenBunkerResponse } from '../api/openbunker';
import type { RequestFormData } from '../types/RequestFormSchema';
import { useNostr } from './useNostr';
import { generateSecretKey } from 'nostr-tools';

export function useTriggerOpenbunkerLogin() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handleBunkerConnectionToken } = useNostr();

  const triggerOpenbunkerLogin = useCallback(
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
        console.log('OpenBunker API result:', result);

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
            // If bunker connection fails, we'll still return the result
            // but the user will need to handle authentication manually
          }
        } else if (result.success && result.bunkerUrl) {
          // If we get a bunker URL but no token, the user needs to complete authentication
          console.log(
            'OpenBunker authentication required, redirecting to:',
            result.bunkerUrl
          );
          // The calling component should handle showing login options or redirecting
        }

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
    [handleBunkerConnectionToken]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // const handleOpenBunkerPopup = useCallback(() => {
  //   console.log('handleOpenBunkerPopup');
  //   // FIXME: this is not going to be needed
  //   const popupWindow = window.open(
  //     openBunkerUrl,
  //     'openbunker-login',
  //     'width=500,height=600,scrollbars=yes,resizable=yes'
  //   );

  //   if (popupWindow) {
  //     setPopup(popupWindow);

  //     const checkClosed = setInterval(() => {
  //       console.log('checkClosed', popupWindow.closed);
  //       if (popup?.closed ?? true) {
  //         clearInterval(checkClosed);
  //         setPopup(null);
  //       }
  //     }, 1000);
  //   }
  // }, [openBunkerUrl, popup]);

  //   const [popup, setPopup] = useState<Window | null>(null);

  //   const openBunkerUrl =
  //     import.meta.env.VITE_OPENBUNKER_POPUP_URL || '/openbunker-login-popup';

  //   const handleBunkerResponse = () => {
  //     if (bunkerResponse?.success === false) {
  //       // handleOpenBunkerPopup();
  //     } else if (
  //       bunkerResponse?.success === true &&
  //       bunkerResponse?.bunkerConnectionToken
  //     ) {
  //       handleOpenBunkerSuccess(bunkerResponse.bunkerConnectionToken);
  //     } else {
  //       // Always navigate to dashboard after handling response
  //       navigate('/dashboard', {
  //         state: {
  //           message:
  //             'Request submitted successfully! Check your dashboard for status updates.',
  //         },
  //       });
  //     }
  //   };
  return {
    triggerOpenbunkerLogin,
    isSubmitting,
    error,
    clearError,
  };
}
