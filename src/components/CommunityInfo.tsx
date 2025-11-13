import { getCommunityATag, parseCommunityId } from '../utils/communityUtils';
import type { CommunityInfo as CommunityInfoType } from '../utils/communityUtils';

interface CommunityInfoProps {
  communityInfo: CommunityInfoType;
  refreshCommunity?: () => void | Promise<void>;
  communityId?: string; // Optional communityId from URL for generating a tag
}

/**
 * Component displaying information about a Nostr community
 */
export function CommunityInfo({
  communityInfo,
  refreshCommunity,
  communityId,
}: CommunityInfoProps) {
  // Generate community a tag from URL or use communityInfo
  const getCommunityATagForDisplay = () => {
    if (communityId) {
      const parsed = parseCommunityId(communityId);
      if (parsed) {
        return getCommunityATag(
          parsed.community_id,
          parsed.community_identifier
        );
      }
    }
    // Fallback: try to construct from communityInfo
    if (communityInfo.pubkey && communityInfo.identifier) {
      return getCommunityATag(communityInfo.pubkey, communityInfo.identifier);
    }
    return null;
  };

  const communityATag = getCommunityATagForDisplay();

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">
          {communityInfo.name}
        </h3>
        {refreshCommunity && (
          <button
            type="button"
            onClick={refreshCommunity}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Refresh
          </button>
        )}
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
      {communityATag && (
        <div className="mb-3">
          <a
            href={`https://chorus.community/group/${encodeURIComponent(communityATag)}`}
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
