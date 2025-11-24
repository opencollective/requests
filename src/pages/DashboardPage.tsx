import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { useRequests, type RequestData } from '../hooks/useRequests';
import { ConnectionStatusBox } from '../components/ConnectionStatusBox';
import {
  RequestFilterControls,
  type RequestFilter,
} from '../components/RequestFilterControls';
import { CommunityInfo } from '../components/CommunityInfo';
import { useCommunityContext } from '../hooks/useCommunityContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, metadata, userPublicKey } = useNostr();
  const communityContext = useCommunityContext();

  // Call all hooks unconditionally before any early returns
  const { requests, isLoading, error, refreshRequests } = useRequests({
    moderators: communityContext?.communityInfo?.moderators || [],
  });

  const [activeFilter, setActiveFilter] = useState<RequestFilter>('all');

  useEffect(() => {
    if (isConnected && communityContext) {
      refreshRequests();
    }
  }, [isConnected, refreshRequests, communityContext]);

  if (!communityContext) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Choose a community first
          </h1>
          <p className="text-gray-600">
            Visit the communities list and pick a community to manage requests.
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

  const { communityId, isCommunityLoading, communityError } = communityContext;

  const encodedCommunityId = communityId
    ? encodeURIComponent(communityId)
    : null;

  const handleViewDetails = (requestId: string) => {
    if (encodedCommunityId) {
      navigate(`/community/${encodedCommunityId}/requests/${requestId}`);
    }
  };

  const handleNewRequest = () => {
    if (encodedCommunityId) {
      navigate(`/community/${encodedCommunityId}/request`);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  // Filter requests based on active filter
  const visibleRequests = requests.filter((request: RequestData) => {
    if (activeFilter === 'all') {
      return true;
    }
    return request.status.toLowerCase() === activeFilter.toLowerCase();
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

  // Show loading state if we're waiting for community from URL
  if (isCommunityLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading community...</p>
        </div>
      </div>
    );
  }

  // Show error if community from URL couldn't be loaded
  if (communityError && !communityContext?.communityInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Community Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            {communityError || 'The requested community could not be loaded.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/communities')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Browse Communities
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Top Navigation Bar */}
        <div className="mb-3 px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/communities')}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Explore Communities
              </button>
            </div>
            <div className="flex items-center gap-2">
              {userPublicKey && (
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  {metadata?.display_name || metadata?.name || 'Profile'}
                </button>
              )}
              <ConnectionStatusBox />
            </div>
          </div>
        </div>

        {/* Community Header */}
        <CommunityInfo />
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
                {activeFilter !== 'all' &&
                  requests.length > visibleRequests.length && (
                    <span className="text-gray-400 ml-1">
                      (of {requests.length} total)
                    </span>
                  )}
              </div>
            </div>
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
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
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
              {requests.length === 0
                ? 'No requests yet'
                : `No ${activeFilter === 'all' ? '' : activeFilter + ' '}requests`}
            </h3>
            <p className="text-gray-600 mb-4">
              {requests.length === 0
                ? 'Be the first to submit a community request!'
                : `No requests with ${activeFilter === 'all' ? 'any' : activeFilter} status at the moment.`}
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-1 rounded border ${getStatusStyling(request.status)} shrink-0`}
                      >
                        {request.status}
                      </span>
                      <h3
                        className="flex-1 min-w-0 whitespace-normal text-base font-semibold text-gray-900 hover:text-blue-600 leading-snug line-clamp-2"
                        title={request.title}
                      >
                        {request.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="truncate">
                        {`#${request.dTag} ${
                          request.description.length > 100
                            ? `${request.description.substring(0, 100)}...`
                            : request.description
                        }`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm text-gray-500 sm:justify-end">
                    <div className="text-gray-500 sm:text-right">
                      {formatDate(request.createdAt)}
                    </div>
                    <span className="text-blue-600 hover:text-blue-800 text-sm whitespace-nowrap">
                      View →
                    </span>
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
