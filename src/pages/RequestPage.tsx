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
    metadata,
    submitEvent,
    error: openbunkerError,
    submitToOpenBunker,
  } = useNostr();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: RequestFormData = {
    name: '',
    email: '',
    subject: '',
    message: '',
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Make a request</h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            Cancel ✕
          </button>
        </div>

        {/* Form Section */}
        <div className="px-6 py-4">
          <RequestForm
            defaultValues={defaultValues}
            onSubmit={handleSubmission}
            isSubmitting={isSubmitting}
            userPublicKey={userPublicKey}
            metadata={metadata}
          />
        </div>

        {openbunkerError && (
          <div className="px-6 pb-4">
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
