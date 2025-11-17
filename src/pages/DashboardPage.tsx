import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { useCommunityById } from '../hooks/useCommunityById';
import { useRequests, type RequestData } from '../hooks/useRequests';
import { ConnectionStatusBox } from '../components/ConnectionStatusBox';
import {
  RequestFilterControls,
  type RequestFilter,
} from '../components/RequestFilterControls';
import { parseCommunityId } from '../utils/communityUtils';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { communityId } = useParams<{ communityId?: string }>();
  const {
    isConnected,
    pool,
    relays,
    communityInfo: envCommunityInfo,
  } = useNostr();

  // If communityId is in URL, use it; otherwise use environment-based community
  const {
    communityInfo: urlCommunityInfo,
    isLoading: isLoadingCommunity,
    error: communityError,
  } = useCommunityById(communityId, isConnected, pool, relays);

  // Use community from URL if available, otherwise fall back to environment
  const communityInfo = urlCommunityInfo || envCommunityInfo;
  const isLoadingCommunityData = communityId ? isLoadingCommunity : false;
  const hasCommunityError = communityId ? !!communityError : false;

  // Parse community ID to get community_id and identifier for requests
  const parsedCommunity = communityId ? parseCommunityId(communityId) : null;

  // Use community-specific requests hook with parsed community info
  const { requests, isLoading, error, refreshRequests } = useRequests(
    communityInfo?.moderators || [],
    parsedCommunity?.community_id,
    parsedCommunity?.community_identifier
  );
  const [activeFilter, setActiveFilter] = useState<RequestFilter>('all');

  const communityDisplayName =
    communityInfo?.name?.trim() || 'Unnamed Community';
  const communityIdentifier = communityInfo
    ? `${communityInfo.pubkey}:${communityInfo.identifier}`
    : null;

  const handleNavigateToCommunity = () => {
    if (communityId) {
      // If we have a communityId from URL, navigate to that community page
      navigate(`/community/${encodeURIComponent(communityId)}`);
    } else if (communityIdentifier) {
      // Otherwise use environment-based community
      navigate(`/community/${encodeURIComponent(communityIdentifier)}`);
    } else {
      navigate('/community');
    }
  };

  // Auto-refresh requests when connected and community is loaded (if using URL community)
  useEffect(() => {
    if (isConnected) {
      if (communityId) {
        // Wait for community to load before fetching requests
        if (communityInfo) {
          refreshRequests();
        }
      } else {
        // For environment-based community, fetch immediately
        refreshRequests();
      }
    }
  }, [isConnected, communityInfo, refreshRequests, communityId]);

  const handleViewDetails = (requestId: string) => {
    navigate(`/requests/${requestId}`);
  };

  const handleNewRequest = () => {
    if (communityId) {
      navigate(`/request?community=${encodeURIComponent(communityId)}`);
    } else {
      navigate('/request');
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
  if (isLoadingCommunityData) {
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
  if (hasCommunityError && !communityInfo) {
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
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-4 w-full">
              <h1 className="text-3xl font-bold text-gray-900">
                {communityInfo?.name
                  ? `${communityInfo.name} - Requests`
                  : 'Community Requests'}
              </h1>
              <button
                type="button"
                onClick={() => navigate('/communities')}
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors ml-auto"
              >
                <svg
                  className="w-4 h-4"
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
            <p className="text-gray-600">
              Submit and manage community requests
            </p>
            <button
              type="button"
              onClick={handleNavigateToCommunity}
              className="group inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <span className="text-gray-500">Community:</span>
              <span className="underline decoration-dotted decoration-1 underline-offset-4">
                {communityDisplayName}
              </span>
              {communityIdentifier && (
                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  {communityInfo?.identifier}
                </span>
              )}
              <svg
                className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
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
                {activeFilter !== 'all' &&
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
