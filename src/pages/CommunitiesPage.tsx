import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommunities } from '../hooks/useCommunities';
import type { CommunityInfo } from '../utils/communityUtils';

export const CommunitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { communities, isLoading, error, refreshCommunities } =
    useCommunities();

  // Debug logging
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('CommunitiesPage render:', {
      communitiesCount: communities.length,
      isLoading,
      error,
      communities,
    });
  }, [communities, isLoading, error]);

  const formatDate = (timestamp: number) => {
    if (!timestamp) {
      return 'Unknown';
    }

    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewCommunity = (community: CommunityInfo) => {
    // Navigate to community page using community_id:identifier format
    const communityId = `${community.pubkey}:${community.identifier}`;
    navigate(`/community/${encodeURIComponent(communityId)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header - Always visible */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Communities</h1>
          <p className="text-gray-600 mt-1">
            Discover and join communities on Nostr
          </p>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mt-4">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600">
            {communities.length > 0
              ? `${communities.length} communit${
                  communities.length === 1 ? 'y' : 'ies'
                } found`
              : 'No communities yet'}
          </div>
          <button
            type="button"
            onClick={refreshCommunities}
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

        {isLoading && communities.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading communities...</p>
          </div>
        )}

        {/* Communities Grid */}
        {!isLoading && communities.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map(community => (
              <div
                key={community.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                onClick={() => handleViewCommunity(community)}
              >
                {/* Community Image */}
                {community.image && (
                  <div className="w-full h-48 overflow-hidden bg-gray-200">
                    <img
                      src={community.image}
                      alt={community.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Community Content */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {community.name || 'Unnamed Community'}
                    </h3>
                    {community.identifier && (
                      <span className="text-xs text-gray-400 font-mono">
                        {community.identifier}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {community.description || 'No description provided.'}
                  </p>

                  {/* Moderators */}
                  {community.moderators.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-gray-500 mb-1">
                        Moderators
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {community.moderators.slice(0, 3).map((mod, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-mono"
                          >
                            {mod.slice(0, 8)}...
                          </span>
                        ))}
                        {community.moderators.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{community.moderators.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Created {formatDate(community.createdAt)}
                    </div>
                    <div className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View
                      <svg
                        className="w-4 h-4 ml-1"
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
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State (if no communities) */}
        {!isLoading && communities.length === 0 && (
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No communities found
            </h3>
            <p className="text-gray-600">
              Check back later for new communities
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
