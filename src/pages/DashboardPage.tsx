import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { useRequests } from '../hooks/useRequests';
import { EventQueueHeader } from '../components/EventQueueHeader';
import { ConnectionStatusBox } from '../components/ConnectionStatusBox';
import { RequestForm } from '../components/RequestForm';
import type { RequestFormData } from '../types/RequestFormSchema';
import { getCommunityATagFromEnv } from '../utils/communityUtils';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, isConnected } = useNostr();
  const { requests, isLoading, error, refreshRequests } = useRequests();
  const {
    userProfile,
    userPublicKey,
    submitEvent,
    isSubmitting: isOpenbunkerSubmitting,
    error: openbunkerError,
    submitToOpenBunker,
  } = useNostr();

  const [showNewRequestForm, setShowNewRequestForm] = useState(false);

  // Redirect to login if not connected
  useEffect(() => {
    if (!isConnected) {
      navigate('/login');
    }
  }, [isConnected, navigate]);

  // Auto-refresh requests when connected
  useEffect(() => {
    if (isConnected) {
      refreshRequests();
    }
  }, [isConnected, refreshRequests]);

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

  const handleViewDetails = (requestId: string) => {
    navigate(`/requests/${requestId}`);
  };

  const onSubmit = async (data: RequestFormData) => {
    await handleSubmission(data);
  };

  const handleSubmission = async (data: RequestFormData) => {
    // Get community a tag from environment variables
    const communityATag = getCommunityATagFromEnv();

    // Create NIP-72 kind 1111 event for community request
    const eventData = {
      kind: 1111, // NIP-72: Community Request
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
        // Add community a tag if available
        ...(communityATag ? [['a', communityATag]] : []),
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: userPublicKey || '', // Set the public key if authenticated, empty if not
    };

    // Add to event queue for later processing
    submitEvent(eventData);

    // This will submit to OpenBunker and handle authentication if needed
    submitToOpenBunker(data);

    // Close the form and refresh requests
    setShowNewRequestForm(false);
    refreshRequests();
  };

  const handleCancel = () => {
    setShowNewRequestForm(false);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getAuthorDisplay = (pubkey: string) => {
    return pubkey.slice(0, 8) + '...' + pubkey.slice(-8);
  };

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Community Requests
            </h1>
            <p className="text-gray-600 mt-1">
              Submit and manage community requests
            </p>
          </div>
          <ConnectionStatusBox
            onLogout={async () => {
              await logout();
              navigate('/login');
            }}
          />
        </div>

        {/* Event Queue Header */}
        <EventQueueHeader />

        {/* Action Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowNewRequestForm(!showNewRequestForm)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                {showNewRequestForm ? 'Cancel' : 'New Request'}
              </button>
              <div className="text-sm text-gray-600">
                {requests.length} request{requests.length !== 1 ? 's' : ''}
              </div>
            </div>
            <button
              onClick={refreshRequests}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* New Request Form */}
        {showNewRequestForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Submit New Request
            </h2>
            <RequestForm
              defaultValues={defaultValues}
              onSubmit={onSubmit}
              onCancel={handleCancel}
              isSubmitting={isOpenbunkerSubmitting}
            />
            {openbunkerError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p className="font-medium">Error:</p>
                <p>{openbunkerError}</p>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading requests...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && requests.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No requests yet
            </h3>
            <p className="text-gray-600 mb-4">
              Be the first to submit a community request!
            </p>
            <button
              onClick={() => setShowNewRequestForm(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Submit First Request
            </button>
          </div>
        )}

        {/* Requests List */}
        {!isLoading && requests.length > 0 && (
          <div className="space-y-2">
            {requests.map(request => (
              <div
                key={request.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewDetails(request.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate">
                        {request.subject}
                      </h3>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {getAuthorDisplay(request.author)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>From: {request.name}</span>
                      {request.email && <span>Email: {request.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right text-sm text-gray-500">
                      <div>{formatDate(request.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 hover:text-blue-800 text-sm">
                        View →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
