import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { useRequests, type RequestData } from '../hooks/useRequests';
import { ConnectionStatusBox } from '../components/ConnectionStatusBox';
import { RequestFilterControls } from '../components/RequestFilterControls';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected } = useNostr();
  const { requests, isLoading, error, refreshRequests } = useRequests();
  const [showAllRequests, setShowAllRequests] = useState(false);

  // Auto-refresh requests when connected
  useEffect(() => {
    if (isConnected) {
      refreshRequests();
    }
  }, [isConnected, refreshRequests]);

  const handleViewDetails = (requestId: string) => {
    navigate(`/requests/${requestId}`);
  };

  const handleNewRequest = () => {
    navigate('/request');
  };

  const formatDate = (dateString: number) => {
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

  const getStatusStyling = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter requests based on showAllRequests state
  const visibleRequests = requests.filter((request: RequestData) => {
    if (!showAllRequests) {
      // Show only new and in-progress requests
      return (
        request.status.toLowerCase() === 'new' ||
        request.status.toLowerCase() === 'in-progress'
      );
    }
    // Show all requests
    return true;
  });

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
          <ConnectionStatusBox />
        </div>
        {/* Action Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleNewRequest}
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
                New Request
              </button>
              <div className="text-sm text-gray-600">
                {visibleRequests.length} request
                {visibleRequests.length !== 1 ? 's' : ''}
                {!showAllRequests &&
                  requests.length > visibleRequests.length && (
                    <span className="text-gray-400 ml-1">
                      (of {requests.length} total)
                    </span>
                  )}
              </div>
            </div>
            <button
              type="button"
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

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Filter Controls */}
        {!isLoading && requests.length > 0 && (
          <RequestFilterControls
            showAllRequests={showAllRequests}
            onToggleShowAll={() => setShowAllRequests(!showAllRequests)}
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading requests...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && visibleRequests.length === 0 && (
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
              {requests.length === 0 ? 'No requests yet' : 'No active requests'}
            </h3>
            <p className="text-gray-600 mb-4">
              {requests.length === 0
                ? 'Be the first to submit a community request!'
                : 'No new or in-progress requests at the moment.'}
            </p>
            <button
              type="button"
              onClick={handleNewRequest}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Submit First Request
            </button>
          </div>
        )}

        {/* Requests List */}
        {!isLoading && visibleRequests.length > 0 && (
          <div className="space-y-2">
            {visibleRequests.map((request: RequestData) => (
              <div
                key={request.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewDetails(request.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate">
                        {request.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded border ${getStatusStyling(request.status)}`}
                      >
                        {request.status}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {getAuthorDisplay(request.author)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>From: {request.author}</span>
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
