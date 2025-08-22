import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';

import { generateSecretKey } from 'nostr-tools';
import type { RequestFormData } from '../types/RequestFormSchema';
import type { OpenBunkerResponse } from '../api/openbunker';
import { RequestForm } from '../components/RequestForm';
import { EventQueueHeader } from '../components/EventQueueHeader';
import { ConnectionStatusBox } from '../components/ConnectionStatusBox';

const RequestPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isConnected,
    userProfile,
    userPublicKey,
    bunkerSigner,
    submitEvent,
    handleBunkerConnectionToken,
    bunkerStatus,
    bunkerError,
    bunkerPublicKey,
    localSecretKey,
    queue,
    isProcessing,
    removeFromQueue,
    clearQueue,
  } = useNostr();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [bunkerResponse, setBunkerResponse] =
    useState<OpenBunkerResponse | null>(null);
  const [popup, setPopup] = useState<Window | null>(null);

  const openBunkerUrl =
    import.meta.env.VITE_OPENBUNKER_POPUP_URL || '/openbunker-login-popup';

  const defaultEmail = userProfile?.content
    ? JSON.parse(userProfile.content).email || ''
    : '';
  const defaultName = userProfile?.content
    ? JSON.parse(userProfile.content).name || ''
    : '';

  const defaultValues: RequestFormData = {
    name: defaultName,
    email: defaultEmail,
    subject: '',
    message: '',
  };

  const handleOpenBunkerSuccess = useCallback(
    async (bunkerConnectionToken: string) => {
      try {
        const sk = generateSecretKey();
        console.log('bunkerConnectionToken', bunkerConnectionToken);
        console.log('sk', sk);
        handleBunkerConnectionToken(bunkerConnectionToken, sk);
        console.log('handleBunkerConnectionToken: done');
        navigate('/dashboard');
      } catch (err) {
        console.error('Failed to complete OpenBunker authentication:', err);
      }
    },
    [handleBunkerConnectionToken, navigate]
  );

  const handleOpenBunkerPopup = useCallback(() => {
    console.log('handleOpenBunkerPopup');
    const popupWindow = window.open(
      openBunkerUrl,
      'openbunker-login',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    if (popupWindow) {
      setPopup(popupWindow);

      const checkClosed = setInterval(() => {
        console.log('checkClosed', popupWindow.closed);
        if (popup?.closed ?? true) {
          clearInterval(checkClosed);
          setPopup(null);
        }
      }, 1000);
    }
  }, [openBunkerUrl, popup]);

  const onSubmit = async (data: RequestFormData) => {
    // Both authenticated and unauthenticated submissions now use the same approach
    // Events are submitted to the queue but not yet signed
    await handleSubmission(data);
  };

  const handleSubmission = async (data: RequestFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Create the event data (unsigned)
      const eventData = {
        kind: 30023, // NIP-23: Long-form Content
        content: JSON.stringify({
          subject: data.subject,
          message: data.message,
          email: data.email,
          name: data.name,
          createdAt: new Date().toISOString(),
          isAuthenticated: !!userPublicKey, // Track if this was submitted by authenticated user
        }),
        tags: [
          ['d', `request-${Date.now()}`], // Unique identifier
          ['subject', data.subject],
          ['t', 'community-request'], // Topic tag
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      // For authenticated users, we can create a proper event structure
      if (userPublicKey && bunkerSigner) {
        // Create unsigned event - will be signed when processed from queue
        const unsignedEvent = {
          ...eventData,
          id: '', // Will be generated when signed
          sig: '', // Will be generated when signed
          pubkey: userPublicKey, // Set the public key
        };

        // Add to event queue for later signing and sending
        submitEvent(unsignedEvent);

        navigate('/dashboard', {
          state: {
            message:
              'Request submitted successfully! It will be signed and sent shortly.',
            requestId: `pending-${Date.now()}`,
          },
        });
      } else {
        // For unauthenticated users, create a temporary event structure
        const tempEvent = {
          ...eventData,
          id: `temp-${Date.now()}`,
          sig: '',
          pubkey: '', // No public key for unauthenticated users
        };

        // Add to event queue (will be handled specially for unauthenticated requests)
        submitEvent(tempEvent);

        // Show success message
        setShowSuccess(true);
        setBunkerResponse({
          success: true,
          message:
            'Request submitted successfully! It will be processed shortly.',
        });
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to submit request';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const handleContinueToOpenBunker = () => {
    if (bunkerResponse?.bunkerUrl) {
      window.open(bunkerResponse.bunkerUrl, '_blank');
    }
    navigate('/dashboard', {
      state: {
        message:
          'Request submitted successfully! Check your email for OpenBunker authentication details.',
      },
    });
  };

  const handleBunkerResponse = () => {
    if (bunkerResponse?.success === false) {
      handleOpenBunkerPopup();
    } else if (
      bunkerResponse?.success === true &&
      bunkerResponse?.bunkerConnectionToken
    ) {
      handleOpenBunkerSuccess(bunkerResponse.bunkerConnectionToken);
    } else if (bunkerResponse?.success === true) {
      // Request was queued successfully, go to dashboard
      navigate('/dashboard');
    } else {
      handleContinueToOpenBunker();
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Request Submitted Successfully!
              </h1>

              <p className="text-lg text-gray-600 mb-6">
                {bunkerResponse?.success === false
                  ? 'Authentication required. Please complete the OpenBunker setup.'
                  : bunkerResponse?.success === true
                    ? 'Your request has been queued and will be processed shortly. You can view the queue status on the dashboard.'
                    : 'Your request has been sent to OpenBunker. They will handle your authentication and identity setup.'}
              </p>

              {bunkerResponse?.message && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                  <p className="text-sm text-blue-700">
                    {bunkerResponse.message}
                  </p>
                </div>
              )}

              {bunkerResponse?.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                  <p className="text-sm text-red-700">
                    Error: {bunkerResponse.error}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={handleBunkerResponse}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {bunkerResponse?.success === false
                    ? 'Authenticate with OpenBunker'
                    : bunkerResponse?.success === true
                      ? 'Go to Dashboard'
                      : 'Continue to OpenBunker'}
                </button>

                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-gray-300 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Submit Community Request
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Tell us about your community request
          </p>

          {/* Event Queue Header */}
          <EventQueueHeader
            queue={queue}
            isProcessing={isProcessing}
            onRemoveFromQueue={removeFromQueue}
            onClearQueue={clearQueue}
          />
        </div>

        <RequestForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />

        {error && (
          <div className="max-w-2xl mx-auto mt-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {bunkerError && (
          <div className="max-w-2xl mx-auto mt-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Bunker Error:</p>
              <p>{bunkerError}</p>
            </div>
          </div>
        )}

        {/* Connection Status Box at the bottom */}
        <div className="max-w-2xl mx-auto mt-8">
          <ConnectionStatusBox
            isConnected={isConnected}
            userPublicKey={userPublicKey}
            bunkerStatus={bunkerStatus}
            bunkerPublicKey={bunkerPublicKey}
            localSecretKey={localSecretKey}
            isAuthenticated={!!userPublicKey}
            showLoginButton={true}
          />
        </div>
      </div>
    </div>
  );
};

export default RequestPage;
