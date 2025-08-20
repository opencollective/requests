import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RequestFormData } from '../types/RequestFormSchema';
import { RequestForm } from '../components/RequestForm';
import { useNostr } from '../contexts/NostrContext';

const NewRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, userProfile, userPublicKey, bunkerSigner, sendEvent } =
    useNostr();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isConnected) {
      navigate('/login');
    }
  }, [isConnected, navigate]);

  const defaultEmail = userProfile?.content
    ? JSON.parse(userProfile.content).email || ''
    : '';
  const defaultName = userProfile?.content
    ? JSON.parse(userProfile.content).name || ''
    : '';

  const defaultValues: RequestFormData = {
    title: '',
    description: '',
    requestType: 'general',
    priority: 'medium',
    email: defaultEmail,
    name: defaultName,
    phone: '',
    organization: '',
    expectedCompletionDate: undefined,
    additionalDetails: '',
    attachments: [],
    status: 'pending',
  };

  const onSubmit = async (data: RequestFormData) => {
    if (!bunkerSigner || !userPublicKey) {
      throw new Error('Not authenticated');
    }

    setIsSubmitting(true);
    try {
      // Create a Nostr event for the request
      const requestEvent = await bunkerSigner.signEvent({
        kind: 30023, // NIP-23: Long-form Content
        content: JSON.stringify({
          title: data.title,
          description: data.description,
          requestType: data.requestType,
          priority: data.priority,
          email: data.email,
          name: data.name,
          phone: data.phone,
          organization: data.organization,
          expectedCompletionDate: data.expectedCompletionDate?.toISOString(),
          additionalDetails: data.additionalDetails,
          status: data.status,
          createdAt: new Date().toISOString(),
        }),
        tags: [
          ['d', `request-${Date.now()}`], // Unique identifier
          ['title', data.title],
          ['requestType', data.requestType],
          ['priority', data.priority],
          ['status', data.status],
          ['t', 'community-request'], // Topic tag
        ],
        created_at: Math.floor(Date.now() / 1000),
      });

      // Publish the event to Nostr relays
      await sendEvent(requestEvent);

      // Navigate to success page or dashboard
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
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  // Show loading while checking authentication
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Submit New Request
          </h1>
          <p className="text-lg text-gray-600">
            Tell us about your community request
          </p>
        </div>

        <RequestForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
};

export default NewRequestPage;
