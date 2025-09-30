import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import type { RequestFormData } from '../types/RequestFormSchema';
import { RequestForm } from '../components/RequestForm';
import { createCommunityRequestEvent } from '../utils/nostrDataUtils';

const RequestPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    userPublicKey,
    submitEvent,
    error: openbunkerError,
    submitToOpenBunker,
  } = useNostr();

  const defaultEmail = '';
  const defaultName = '';
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    try {
      setIsSubmitting(true);

      // Create NIP-72 kind 1111 event for community request
      const eventData = createCommunityRequestEvent(
        data,
        userPublicKey || undefined
      );

      // Add to event queue for later processing
      const newQueueItemId = submitEvent(eventData);

      // This will submit to OpenBunker and handle authentication if needed
      submitToOpenBunker(data);
      navigate(`/queue/${newQueueItemId}`);
    } finally {
      setIsSubmitting(false);
    }
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
        </div>

        <RequestForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />

        {openbunkerError && (
          <div className="max-w-2xl mx-auto mt-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Error:</p>
              <p>{openbunkerError}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestPage;
