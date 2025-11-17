import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { useCommunityById } from '../hooks/useCommunityById';
import { CommunityInfo } from '../components/CommunityInfo';

export const CommunityPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const { isConnected, pool, relays } = useNostr();
  const { communityInfo, isLoading, error, refreshCommunity } =
    useCommunityById(communityId, isConnected, pool, relays);

  if (!communityId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Community ID
          </h1>
          <p className="text-gray-600">No community ID provided in URL</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-4 w-full">
                <h1 className="text-3xl font-bold text-gray-900">
                  Community Information
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
                View community details and settings
              </p>
              {communityInfo && (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/community/${encodeURIComponent(communityId!)}/dashboard`
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    View Dashboard
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mt-4">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Community Info */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {isLoading ? (
            <div className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ) : communityInfo ? (
            <CommunityInfo
              communityInfo={communityInfo}
              refreshCommunity={refreshCommunity}
              communityId={communityId}
            />
          ) : (
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-gray-800 font-medium">No Community Found</h3>
              <p className="text-gray-600 text-sm mt-1">
                {error || 'Community information not available.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
