import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import type { RequestFormData } from '../types/RequestFormSchema';
import { RequestForm } from '../components/RequestForm';
import { EventQueueHeader } from '../components/EventQueueHeader';
import { ConnectionStatusBox } from '../components/ConnectionStatusBox';

const RequestPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    userProfile,
    userPublicKey,
    submitEvent,
    isSubmitting: isOpenbunkerSubmitting,
    error: openbunkerError,
    triggerOpenbunkerLogin,
  } = useNostr();

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
    const newQueueItemId = submitEvent(eventData);

    // This will trigger OpenBunker login if needed
    triggerOpenbunkerLogin(data);

    navigate(`/queue/${newQueueItemId}`);
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

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
          <EventQueueHeader />
        </div>

        <RequestForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          onCancel={handleCancel}
          isSubmitting={isOpenbunkerSubmitting}
        />

        {openbunkerError && (
          <div className="max-w-2xl mx-auto mt-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Error:</p>
              <p>{openbunkerError}</p>
            </div>
          </div>
        )}

        {/* Connection Status Box at the bottom */}
        <div className="max-w-2xl mx-auto mt-8">
          <ConnectionStatusBox showLoginButton={true} />
        </div>
      </div>
    </div>
  );
};

export default RequestPage;
