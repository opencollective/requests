import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import type { RequestFormData } from '../types/RequestFormSchema';
import { RequestForm } from '../components/RequestForm';
import { QueueItemDisplay } from '../components/QueueItemDisplay';
import { createCommunityRequestEvent } from '../utils/communityRequest';
import { useRequests } from '../hooks/useRequests';
import { useCommunityContext } from '../hooks/useCommunityContext';

const RequestPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    userPublicKey,
    metadata,
    submitEvent,
    error: openbunkerError,
    submitToOpenBunker,
  } = useNostr();
  const communityContext = useCommunityContext();

  // Call all hooks unconditionally before any early returns
  const { nextDTagNumber } = useRequests({
    moderators: communityContext?.communityInfo?.moderators || [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedQueueItemId, setSubmittedQueueItemId] = useState<
    string | null
  >(null);
  const queueDisplayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (submittedQueueItemId && queueDisplayRef.current) {
      // Small delay to ensure the element is rendered
      setTimeout(() => {
        queueDisplayRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 150);
    }
  }, [submittedQueueItemId]);

  if (!communityContext) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900">
            Choose a community first
          </h2>
          <p className="text-gray-600">
            Requests must belong to a community. Please select one from the
            communities list.
          </p>
          <button
            type="button"
            onClick={() => navigate('/communities')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Browse communities
          </button>
        </div>
      </div>
    );
  }

  const { communityId, communityPubkey, communityIdentifier } =
    communityContext;
  const encodedCommunityId = encodeURIComponent(communityId);

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
        communityPubkey,
        communityIdentifier,
        userPublicKey || undefined,
        nextDTagNumber
      );

      // Add to event queue for later processing
      const newQueueItemId = submitEvent(eventData);
      if (!userPublicKey) {
        // This will submit to OpenBunker and handle authentication if needed
        submitToOpenBunker(data);
      }

      // Show the queue item display instead of navigating
      setSubmittedQueueItemId(newQueueItemId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/community/${encodedCommunityId}/dashboard`);
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
            buttonReplacement={
              submittedQueueItemId ? (
                <div
                  ref={queueDisplayRef}
                  className="transition-all duration-300 ease-in-out"
                  style={{
                    animation: 'fadeInUp 0.4s ease-out',
                  }}
                >
                  <QueueItemDisplay
                    queueItemId={submittedQueueItemId}
                    onCompleted={eventId =>
                      navigate(
                        `/community/${encodedCommunityId}/requests/${eventId}`
                      )
                    }
                    onFailed={() =>
                      navigate(`/community/${encodedCommunityId}/dashboard`)
                    }
                  />
                </div>
              ) : undefined
            }
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
