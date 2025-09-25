import { useNostr } from '../hooks/useNostr';
import { getCommunityATagFromEnv } from '../utils/communityUtils';

/**
 * Example component demonstrating how to use the community event hook
 * This component displays information about the configured Nostr community
 */
export function CommunityInfo() {
  const { communityInfo, isLoading, error, fetchCommunity, refreshCommunity } =
    useNostr();

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <h3 className="text-red-800 font-medium">Community Error</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          type="button"
          onClick={fetchCommunity}
          className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!communityInfo) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-gray-800 font-medium">No Community Found</h3>
        <p className="text-gray-600 text-sm mt-1">
          No community information available. Check your environment variables.
        </p>
        <button
          type="button"
          onClick={fetchCommunity}
          className="mt-2 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
        >
          Load Community
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">
          {communityInfo.name}
        </h3>
        <button
          type="button"
          onClick={refreshCommunity}
          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
        >
          Refresh
        </button>
      </div>

      {communityInfo.image && (
        <img
          src={communityInfo.image}
          alt={communityInfo.name}
          className="w-16 h-16 object-cover rounded mb-3"
        />
      )}

      <p className="text-gray-700 text-sm mb-3">{communityInfo.description}</p>

      {/* Chorus Community Link */}
      {getCommunityATagFromEnv() && (
        <div className="mb-3">
          <a
            href={`https://chorus.community/group/${encodeURIComponent(getCommunityATagFromEnv())}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors text-sm font-medium"
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
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            View on Chorus
          </a>
        </div>
      )}

      <div className="space-y-2">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Moderators</h4>
          <div className="flex flex-wrap gap-1">
            {communityInfo.moderators.map(
              (moderator: string, index: number) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                >
                  {moderator.slice(0, 8)}...
                </span>
              )
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Relays</h4>
          <div className="space-y-1">
            {communityInfo.relays.author && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Author:</span>{' '}
                {communityInfo.relays.author}
              </div>
            )}
            {communityInfo.relays.requests && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Requests:</span>{' '}
                {communityInfo.relays.requests}
              </div>
            )}
            {communityInfo.relays.approvals && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Approvals:</span>{' '}
                {communityInfo.relays.approvals}
              </div>
            )}
            {communityInfo.relays.general &&
              communityInfo.relays.general.length > 0 && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">General:</span>{' '}
                  {communityInfo.relays.general.join(', ')}
                </div>
              )}
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Created:{' '}
          {new Date(communityInfo.createdAt * 1000).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
