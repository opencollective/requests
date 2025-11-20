import React, { useState, useMemo } from 'react';
import type { ModeratorRequestData } from '../utils/moderatorRequestUtils';
import { useNostr } from '../hooks/useNostr';
import { useCommunityContext } from '../hooks/useCommunityContext';
import {
  createUpdatedCommunityDefinitionWithModerator,
  parseCommunityId,
} from '../utils/communityUtils';
import type { SimplePool } from 'nostr-tools';

interface ModeratorRequestsSectionProps {
  requests: ModeratorRequestData[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

export const ModeratorRequestsSection: React.FC<
  ModeratorRequestsSectionProps
> = ({ requests, isLoading, onRefresh }) => {
  const { userPublicKey, pool, relays, signAndSendEvent } = useNostr();
  const communityContext = useCommunityContext();
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Filter out requests from users who are already moderators
  // This hook must be called before any early returns
  const filteredRequests = useMemo(() => {
    if (
      !communityContext?.communityInfo?.moderators ||
      communityContext.communityInfo.moderators.length === 0
    ) {
      return requests;
    }

    const moderatorSet = new Set(communityContext.communityInfo.moderators);
    return requests.filter(request => !moderatorSet.has(request.pubkey));
  }, [requests, communityContext?.communityInfo?.moderators]);

  if (!communityContext) {
    return null;
  }

  const { communityPubkey, communityIdentifier } = communityContext;

  const handleAcceptRequest = async (request: ModeratorRequestData) => {
    if (!userPublicKey || !pool || !relays || !signAndSendEvent) {
      setError('Not authenticated or not connected');
      return;
    }

    setProcessingRequestId(request.id);
    setError(null);

    try {
      // Fetch the current community definition event
      const parsed = parseCommunityId(
        `${communityPubkey}:${communityIdentifier}`
      );
      if (!parsed) {
        throw new Error('Invalid community ID');
      }

      const communityEvents = await (pool as SimplePool).querySync(relays, {
        kinds: [34550],
        authors: [parsed.community_id],
        '#d': [parsed.community_identifier],
        limit: 1,
      });

      if (communityEvents.length === 0) {
        throw new Error('Community definition event not found');
      }

      const currentEvent = communityEvents[0];

      // Check if the current user is a moderator
      const moderators = currentEvent.tags
        .filter(tag => tag[0] === 'p' && tag[3] === 'moderator')
        .map(tag => tag[1]);

      if (!moderators.includes(userPublicKey)) {
        throw new Error('Only moderators can accept requests');
      }

      // Check if the requesting user is already a moderator
      if (moderators.includes(request.pubkey)) {
        throw new Error('User is already a moderator');
      }

      // Create updated community definition event with new moderator
      const updatedEvent = createUpdatedCommunityDefinitionWithModerator(
        currentEvent,
        request.pubkey
      );

      // Sign and send the updated event
      await signAndSendEvent(updatedEvent);

      // Refresh the community info and requests
      await Promise.all([communityContext.refreshCommunity(), onRefresh()]);

      setProcessingRequestId(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to accept request';
      setError(errorMessage);
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (request: ModeratorRequestData) => {
    // For now, rejection just means not accepting
    // In the future, we could create a rejection event
    setProcessingRequestId(request.id);
    setError(null);

    try {
      // Just refresh to remove it from the list if needed
      // In a real implementation, you might want to create a rejection event
      await onRefresh();
      setProcessingRequestId(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reject request';
      setError(errorMessage);
      setProcessingRequestId(null);
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Moderator Requests
        </h2>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 text-sm">Loading requests...</p>
        </div>
      </div>
    );
  }

  if (filteredRequests.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Moderator Requests
        </h2>
        <p className="text-gray-500 text-sm">No pending moderator requests.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Moderator Requests ({filteredRequests.length})
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {filteredRequests.map(request => {
          const isProcessing = processingRequestId === request.id;

          return (
            <div
              key={request.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-gray-500">
                      {request.pubkey.slice(0, 8)}...{request.pubkey.slice(-4)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(request.createdAt)}
                    </span>
                  </div>
                  {request.content && (
                    <p className="text-sm text-gray-700 mb-2">
                      {request.content}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAcceptRequest(request)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : 'Accept'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectRequest(request)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
