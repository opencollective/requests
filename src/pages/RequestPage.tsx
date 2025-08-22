import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { useUnauthenticatedRequests } from '../hooks/useUnauthenticatedRequests';
import { generateSecretKey } from 'nostr-tools';
import type { RequestFormData } from '../types/RequestFormSchema';
import type { OpenBunkerResponse } from '../api/openbunker';
import { RequestForm } from '../components/RequestForm';

const RequestPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isConnected,
    userProfile,
    userPublicKey,
    bunkerSigner,
    sendEvent,
    handleBunkerConnectionToken,
    bunkerStatus,
    bunkerError,
  } = useNostr();

  const { submitUnauthenticatedRequest, isSubmitting, error } =
    useUnauthenticatedRequests();

  const [showSuccess, setShowSuccess] = useState(false);
  const [bunkerResponse, setBunkerResponse] =
    useState<OpenBunkerResponse | null>(null);
  const [popup, setPopup] = useState<Window | null>(null);
  const [isAuthenticatedSubmitting, setIsAuthenticatedSubmitting] =
    useState(false);

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
    if (userPublicKey && bunkerSigner) {
      // Authenticated submission
      await handleAuthenticatedSubmission(data);
    } else {
      // Unauthenticated submission
      await handleUnauthenticatedSubmission(data);
    }
  };

  const handleAuthenticatedSubmission = async (data: RequestFormData) => {
    if (!bunkerSigner || !userPublicKey) {
      throw new Error('Not authenticated');
    }

    setIsAuthenticatedSubmitting(true);
    try {
      const requestEvent = await bunkerSigner.signEvent({
        kind: 30023, // NIP-23: Long-form Content
        content: JSON.stringify({
          subject: data.subject,
          message: data.message,
          email: data.email,
          name: data.name,
          createdAt: new Date().toISOString(),
        }),
        tags: [
          ['d', `request-${Date.now()}`], // Unique identifier
          ['subject', data.subject],
          ['t', 'community-request'], // Topic tag
        ],
        created_at: Math.floor(Date.now() / 1000),
      });

      await sendEvent(requestEvent);

      navigate('/dashboard', {
        state: {
          message: 'Request submitted successfully!',
          requestId: requestEvent.id,
        },
      });
    } catch (error) {
      console.error('Error submitting request:', error);
      throw new Error('Failed to submit request');
    } finally {
      setIsAuthenticatedSubmitting(false);
    }
  };

  const handleUnauthenticatedSubmission = async (data: RequestFormData) => {
    try {
      const response = await submitUnauthenticatedRequest(data);
      setBunkerResponse(response);
      setShowSuccess(true);
    } catch (err) {
      console.error('Failed to submit request:', err);
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
    } else {
      handleContinueToOpenBunker();
    }
  };

  const handleLogin = () => {
    navigate('/login');
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
                    ? 'Your request has been processed. Setting up your authentication...'
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
                      ? 'Complete Setup'
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

          {/* Connection Status Section */}
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Connection Status
              </h3>

              <div className="space-y-3">
                {/* Nostr Connection Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nostr Network:</span>
                  <div className="flex items-center">
                    <div
                      className={`w-3 h-3 rounded-full mr-2 ${
                        isConnected ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    ></div>
                    <span
                      className={`text-sm font-medium ${
                        isConnected ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                {/* Authentication Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Authentication:</span>
                  <div className="flex items-center">
                    <div
                      className={`w-3 h-3 rounded-full mr-2 ${
                        userPublicKey ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                    ></div>
                    <span
                      className={`text-sm font-medium ${
                        userPublicKey ? 'text-green-700' : 'text-yellow-700'
                      }`}
                    >
                      {userPublicKey ? 'Authenticated' : 'Not Authenticated'}
                    </span>
                  </div>
                </div>

                {/* Bunker Status (if applicable) */}
                {userPublicKey && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Bunker Status:
                    </span>
                    <div className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-2 ${
                          bunkerStatus === 'connected'
                            ? 'bg-green-500'
                            : bunkerStatus === 'connecting'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                      ></div>
                      <span
                        className={`text-sm font-medium ${
                          bunkerStatus === 'connected'
                            ? 'text-green-700'
                            : bunkerStatus === 'connecting'
                              ? 'text-yellow-700'
                              : 'text-red-700'
                        }`}
                      >
                        {bunkerStatus === 'connected'
                          ? 'Connected'
                          : bunkerStatus === 'connecting'
                            ? 'Connecting'
                            : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                )}

                {/* User Public Key Display */}
                {userPublicKey && (
                  <div className="pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-500 block text-left mb-1">
                      Public Key:
                    </span>
                    <code className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded break-all">
                      {userPublicKey.slice(0, 16)}...{userPublicKey.slice(-8)}
                    </code>
                  </div>
                )}
              </div>

              {/* Login Button for unauthenticated users */}
              {!userPublicKey && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleLogin}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium"
                  >
                    Login to Submit Authenticated Request
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Or submit anonymously below
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <RequestForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting || isAuthenticatedSubmitting}
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
      </div>
    </div>
  );
};

export default RequestPage;
