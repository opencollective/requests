import React, { useState, useMemo } from 'react';
import { useCommunityContext } from '../hooks/useCommunityContext';
import { useNostr } from '../hooks/useNostr';
import { useModeratorRequests } from '../hooks/useModeratorRequests';
import {
  getCommunityATag,
  parseCommunityId,
  createUpdatedCommunityDefinitionWithoutModerator,
} from '../utils/communityUtils';
import { isModerator } from '../utils/statusEventUtils';
import { createModeratorRequestEvent } from '../utils/moderatorRequestUtils';
import { ModeratorRequestsSection } from './ModeratorRequestsSection';
import { SimplePool } from 'nostr-tools';

export const CommunityInfo: React.FC = () => {
  const communityContext = useCommunityContext();
  const { userPublicKey, pool, relays, signAndSendEvent, isConnected } =
    useNostr();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmittingModeratorRequest, setIsSubmittingModeratorRequest] =
    useState(false);
  const [moderatorRequestError, setModeratorRequestError] = useState<
    string | null
  >(null);
  const [moderatorRequestMessage, setModeratorRequestMessage] = useState('');
  const [showModeratorRequestForm, setShowModeratorRequestForm] =
    useState(false);
  const [removingModerator, setRemovingModerator] = useState<string | null>(
    null
  );
  const [removeModeratorError, setRemoveModeratorError] = useState<
    string | null
  >(null);

  const { communityInfo, communityPubkey, communityIdentifier } =
    communityContext || {};

  const isLoggedIn = Boolean(userPublicKey);
  const userIsModerator =
    userPublicKey && communityInfo
      ? isModerator(userPublicKey, communityInfo.moderators)
      : false;
  const userIsOwner =
    userPublicKey && communityInfo
      ? userPublicKey === communityInfo.pubkey
      : false;

  const {
    requests: moderatorRequests,
    isLoading: isLoadingModeratorRequests,
    hasUserRequested,
    refreshRequests: refreshModeratorRequests,
  } = useModeratorRequests(
    communityPubkey,
    communityIdentifier,
    userPublicKey || null,
    isConnected,
    pool,
    relays
  );

  // Filter out requests from users who are already moderators
  // This gives us the count of "new" or "pending" requests
  const pendingModeratorRequestsCount = useMemo(() => {
    if (
      !communityInfo?.moderators ||
      communityInfo.moderators.length === 0 ||
      moderatorRequests.length === 0
    ) {
      return moderatorRequests.length;
    }

    const moderatorSet = new Set(communityInfo.moderators);
    return moderatorRequests.filter(
      request => !moderatorSet.has(request.pubkey)
    ).length;
  }, [moderatorRequests, communityInfo?.moderators]);

  const communityATag = communityInfo
    ? getCommunityATag(communityInfo.pubkey, communityInfo.identifier)
    : null;
  const chorusUrl = communityATag
    ? `https://chorus.community/group/${encodeURIComponent(communityATag)}`
    : null;

  const handleRequestModerator = async () => {
    if (!communityPubkey) {
      setModeratorRequestError(
        'Community pubkey is missing. Please refresh the page.'
      );
      return;
    }
    if (!communityIdentifier) {
      setModeratorRequestError(
        'Community identifier is missing. Please refresh the page.'
      );
      return;
    }
    if (!signAndSendEvent) {
      setModeratorRequestError(
        'Event submission not available. Please refresh the page.'
      );
      return;
    }

    setIsSubmittingModeratorRequest(true);
    setModeratorRequestError(null);

    try {
      // Create the moderator request event
      const requestEvent = createModeratorRequestEvent(
        communityPubkey,
        communityIdentifier,
        userPublicKey || '', // Will be set when signed
        moderatorRequestMessage ||
          'I would like to join this community as a moderator.'
      );

      // Add to event queue for later processing (same pattern as RequestPage)
      await signAndSendEvent(requestEvent);

      // Clear the message, hide the form, and refresh requests
      setModeratorRequestMessage('');
      setShowModeratorRequestForm(false);
      await refreshModeratorRequests();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to submit moderator request';
      setModeratorRequestError(errorMessage);
    } finally {
      setIsSubmittingModeratorRequest(false);
    }
  };

  const handleRemoveModerator = async (moderatorPubkey: string) => {
    if (!userPublicKey || !pool || !relays || !signAndSendEvent) {
      setRemoveModeratorError('Not authenticated or not connected');
      return;
    }

    if (moderatorPubkey === userPublicKey) {
      setRemoveModeratorError('You cannot remove yourself as a moderator');
      return;
    }

    if (!communityPubkey || !communityIdentifier) {
      setRemoveModeratorError(
        'Community information is missing. Please refresh the page.'
      );
      return;
    }

    // Check if trying to remove the owner
    if (moderatorPubkey === communityInfo?.pubkey) {
      setRemoveModeratorError('The owner cannot be removed');
      return;
    }

    setRemovingModerator(moderatorPubkey);
    setRemoveModeratorError(null);

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

      // Check if the current user is the owner
      if (currentEvent.pubkey !== userPublicKey) {
        throw new Error('Only the owner can remove moderators');
      }

      // Check if trying to remove the owner
      if (moderatorPubkey === currentEvent.pubkey) {
        throw new Error('The owner cannot be removed');
      }

      // Check if the moderator to remove exists
      const moderators = currentEvent.tags
        .filter(tag => tag[0] === 'p' && tag[3] === 'moderator')
        .map(tag => tag[1]);

      if (!moderators.includes(moderatorPubkey)) {
        throw new Error('Moderator not found in community');
      }

      // Create updated community definition event without the moderator
      const updatedEvent = createUpdatedCommunityDefinitionWithoutModerator(
        currentEvent,
        moderatorPubkey
      );

      // Sign and send the updated event
      await signAndSendEvent(updatedEvent);

      // Refresh the community info
      await communityContext?.refreshCommunity();

      setRemovingModerator(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to remove moderator';
      setRemoveModeratorError(errorMessage);
      setRemovingModerator(null);
    }
  };

  if (!communityInfo) {
    return null;
  }
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {communityInfo?.image && (
              <img
                src={communityInfo.image}
                alt={communityInfo.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {communityInfo?.name || 'Community Requests'}
                </h1>
                {userIsModerator &&
                  pendingModeratorRequestsCount > 0 &&
                  !isLoadingModeratorRequests && (
                    <div
                      className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-red-500 text-white text-xs font-semibold rounded-full"
                      title={`${pendingModeratorRequestsCount} pending moderator request${pendingModeratorRequestsCount !== 1 ? 's' : ''}`}
                    >
                      {pendingModeratorRequestsCount}
                    </div>
                  )}
                {chorusUrl && (
                  <a
                    href={chorusUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    title="View on Chorus"
                    onClick={e => e.stopPropagation()}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </a>
                )}
              </div>
              {communityInfo?.description && (
                <p className="text-gray-600 text-sm mb-2">
                  {communityInfo.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {communityInfo?.moderators &&
                  communityInfo.moderators.length > 0 && (
                    <span>
                      {communityInfo.moderators.length} moderator
                      {communityInfo.moderators.length !== 1 ? 's' : ''}
                    </span>
                  )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 text-gray-400 pointer-events-none">
              <svg
                className={`w-5 h-5 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Expanded Community Info */}
        {isExpanded && communityInfo && (
          <div
            className="mt-4 pt-4 border-t border-gray-200 space-y-4"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          >
            <div className="text-xs text-gray-500">
              Created:{' '}
              {new Date(communityInfo.createdAt * 1000).toLocaleDateString()}
            </div>
            {communityInfo.moderators.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Moderators ({communityInfo.moderators.length})
                </h2>
                {removeModeratorError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
                    {removeModeratorError}
                  </div>
                )}
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                          Moderator
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {communityInfo.moderators.map(
                        (moderator: string, index: number) => {
                          const isCurrentUser = moderator === userPublicKey;
                          const isOwner = moderator === communityInfo.pubkey;
                          const canRemove =
                            userIsOwner && !isOwner && !removingModerator;
                          return (
                            <tr
                              key={index}
                              className={
                                isCurrentUser
                                  ? 'bg-purple-50'
                                  : 'bg-white hover:bg-gray-50'
                              }
                            >
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-mono text-xs ${
                                      isCurrentUser
                                        ? 'text-purple-700'
                                        : 'text-gray-900'
                                    }`}
                                  >
                                    {moderator.slice(0, 8)}...
                                    {moderator.slice(-4)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {isCurrentUser && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-semibold text-purple-700">
                                        Me
                                      </span>
                                    </div>
                                  )}
                                  {isOwner && (
                                    <div className="flex items-center gap-1">
                                      <svg
                                        className="w-3 h-3 text-yellow-600"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                      <span className="text-xs font-semibold text-yellow-700">
                                        Owner
                                      </span>
                                    </div>
                                  )}
                                  {canRemove && (
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleRemoveModerator(moderator);
                                      }}
                                      disabled={removingModerator === moderator}
                                      className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Remove moderator"
                                    >
                                      {removingModerator === moderator ? (
                                        <div className="flex items-center gap-1">
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                          <span>Removing...</span>
                                        </div>
                                      ) : (
                                        'Remove moderator'
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Members Section */}
            <div>
              <div className="space-y-4">
                {/* Moderator Requests Section - Only visible to owner */}
                {userIsOwner && (
                  <div>
                    <ModeratorRequestsSection
                      requests={moderatorRequests}
                      isLoading={isLoadingModeratorRequests}
                      onRefresh={refreshModeratorRequests}
                    />
                  </div>
                )}

                {/* Request to be Moderator Section - Only visible to non-moderators who are logged in */}
                {isLoggedIn && !userIsModerator && (
                  <div>
                    {hasUserRequested ? (
                      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
                        <p className="text-sm">
                          You have requested to become a moderator. Please wait
                          for a moderator to review your request.
                        </p>
                      </div>
                    ) : showModeratorRequestForm ? (
                      <div className="space-y-4">
                        <div>
                          <label
                            htmlFor="moderator-request-message"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            Message (optional)
                          </label>
                          <textarea
                            id="moderator-request-message"
                            value={moderatorRequestMessage}
                            onChange={e =>
                              setModeratorRequestMessage(e.target.value)
                            }
                            onClick={e => e.stopPropagation()}
                            onFocus={e => e.stopPropagation()}
                            onKeyDown={e => e.stopPropagation()}
                            placeholder="I would like to join this community as a moderator..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            rows={3}
                          />
                        </div>
                        {moderatorRequestError && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                            {moderatorRequestError}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleRequestModerator();
                            }}
                            disabled={isSubmittingModeratorRequest}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmittingModeratorRequest ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Submitting...
                              </>
                            ) : (
                              'Send Request'
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setShowModeratorRequestForm(false);
                              setModeratorRequestMessage('');
                              setModeratorRequestError(null);
                            }}
                            disabled={isSubmittingModeratorRequest}
                            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : !hasUserRequested ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setShowModeratorRequestForm(true);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmittingModeratorRequest}
                      >
                        {isSubmittingModeratorRequest ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Submitting...
                          </>
                        ) : (
                          'Request to be Moderator'
                        )}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {(communityInfo.relays.author ||
              communityInfo.relays.requests ||
              communityInfo.relays.approvals ||
              (communityInfo.relays.general &&
                communityInfo.relays.general.length > 0)) && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Relays
                </h4>
                <div className="space-y-1 text-xs text-gray-600">
                  {communityInfo.relays.author && (
                    <div>
                      <span className="font-medium">Author:</span>{' '}
                      {communityInfo.relays.author}
                    </div>
                  )}
                  {communityInfo.relays.requests && (
                    <div>
                      <span className="font-medium">Requests:</span>{' '}
                      {communityInfo.relays.requests}
                    </div>
                  )}
                  {communityInfo.relays.approvals && (
                    <div>
                      <span className="font-medium">Approvals:</span>{' '}
                      {communityInfo.relays.approvals}
                    </div>
                  )}
                  {communityInfo.relays.general &&
                    communityInfo.relays.general.length > 0 && (
                      <div>
                        <span className="font-medium">General:</span>{' '}
                        {communityInfo.relays.general.join(', ')}
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
