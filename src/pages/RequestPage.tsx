import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { useTriggerOpenbunkerLogin } from '../hooks/useTriggerOpenbunkerLogin';
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
    submitEvent,
    bunkerStatus,
    bunkerError,
    bunkerPublicKey,
    localSecretKey,
    queue,
    processedQueue,
    isProcessing,
    removeFromQueue,
    clearQueue,
  } = useNostr();

  const {
    triggerOpenbunkerLogin,
    isSubmitting: isOpenbunkerSubmitting,
    error: openbunkerError,
  } = useTriggerOpenbunkerLogin();

  const [error, setError] = useState<string | null>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [bunkerResponse, setBunkerResponse] =
    useState<OpenBunkerResponse | null>(null);

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

  const onSubmit = async (data: RequestFormData) => {
    // Always submit the event to the queue and trigger OpenBunker login
    await handleSubmission(data);
  };

  const handleSubmission = async (data: RequestFormData) => {
    setError(null);

    try {
      // Always create and queue the event (will be processed later based on auth status)
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
        pubkey: userPublicKey || '', // Set the public key if authenticated, empty if not
      };

      // Add to event queue for later processing
      submitEvent(eventData);

      // Always trigger OpenBunker login to handle authentication
      try {
        const openbunkerResult = await triggerOpenbunkerLogin(data);
        setBunkerResponse(openbunkerResult);
        setShowSuccess(true);
      } catch (openbunkerError) {
        console.error('OpenBunker API error:', openbunkerError);
        setError(
          openbunkerError instanceof Error
            ? openbunkerError.message
            : 'Failed to submit to OpenBunker'
        );
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to submit request';
      setError(errorMessage);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
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
                  : 'Your request has been queued and will be processed shortly. You can view the queue status on the dashboard.'}
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
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {bunkerResponse?.success === false
                    ? 'Authenticate with OpenBunker'
                    : 'Go to Dashboard'}
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
            processedQueue={processedQueue}
            isProcessing={isProcessing}
            onRemoveFromQueue={removeFromQueue}
            onClearQueue={clearQueue}
          />
        </div>

        <RequestForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          onCancel={handleCancel}
          isSubmitting={isOpenbunkerSubmitting}
        />

        {(error || openbunkerError) && (
          <div className="max-w-2xl mx-auto mt-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Error:</p>
              <p>{error || openbunkerError}</p>
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
