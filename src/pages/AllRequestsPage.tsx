import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { useRequests } from '../hooks/useRequests';
import { RequestCard } from '../components/RequestCard';

export const AllRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected } = useNostr();
  const { requests, isLoading, error, refreshRequests } = useRequests();

  const handleViewDetails = (requestId: string) => {
    navigate(`/requests/${requestId}`);
  };
  useEffect(() => {
    if (isConnected) {
      refreshRequests();
    }
  }, [isConnected, refreshRequests]);

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
            Community Requests
          </h1>
          <p className="text-lg text-gray-600">
            View all community requests and stay updated
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={() => navigate('/request')}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                + New Request
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {requests.length} request{requests.length !== 1 ? 's' : ''}{' '}
                found
              </div>
              <button
                onClick={refreshRequests}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm disabled:opacity-50"
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
              <p className="mt-4 text-gray-600">
                Fetching community requests...
              </p>
            </div>
          )}

          {/* Requests List */}
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
                No requests found
              </h3>
              <p className="text-gray-600 mb-4">
                Be the first to submit a community request!
              </p>
              <button
                onClick={() => navigate('/request')}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Submit First Request
              </button>
            </div>
          )}

          {/* Requests Grid */}
          {!isLoading && requests.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requests.map(request => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
