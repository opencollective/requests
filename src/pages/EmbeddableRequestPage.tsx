import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { RequestFormData } from '../types/RequestFormSchema';
import { RequestForm } from '../components/RequestForm';

const EmbeddableRequestPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formDefaultValues, setFormDefaultValues] =
    useState<RequestFormData | null>(null);

  // Get URL parameters for customization
  const showHeader = searchParams.get('showHeader') !== 'false';
  const redirectUrl = searchParams.get('redirectUrl') || '/';
  const title = searchParams.get('title') || '';
  const description = searchParams.get('description') || '';

  // Initialize default values
  useEffect(() => {
    setFormDefaultValues({
      name: '',
      email: '',
      subject: title || 'General Request',
      message: description || '',
    });
  }, [title, description]);

  const handleCreateRequest = async (data: RequestFormData) => {
    setIsSubmitting(true);
    try {
      // For embeddable version, we'll just send the data to the parent window
      // In a real implementation, you might want to send this to a backend or Nostr relay

      // Send message to parent window if embedded
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'REQUEST_CREATED',
            data: data,
            timestamp: new Date().toISOString(),
          },
          '*'
        );
      }

      // Show success message
      alert('Request submitted successfully!');

      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);
    } catch (error) {
      console.error('Error creating request:', error);

      // Send error message to parent window if embedded
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'REQUEST_ERROR',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          '*'
        );
      }

      alert('Error submitting request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Send cancel message to parent window if embedded
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'REQUEST_CANCELLED',
        },
        '*'
      );
    }

    // Redirect to cancel URL or default
    const cancelUrl = searchParams.get('cancelUrl') || redirectUrl;
    window.location.href = cancelUrl;
  };

  // Show loading while initializing
  if (!formDefaultValues) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 py-4">
        {showHeader && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Community Request
            </h1>
            <p className="text-gray-600">Get in touch with your request here</p>
          </div>
        )}

        <RequestForm
          defaultValues={formDefaultValues}
          onSubmit={handleCreateRequest}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          isEmbed={true}
        />
      </div>
    </div>
  );
};

export default EmbeddableRequestPage;
