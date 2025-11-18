import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { nip19, type Event } from 'nostr-tools';
import { useNostr } from '../hooks/useNostr';
import { useRequestDetails } from '../hooks/useRequestDetails';
import { useUserMetadataByPubkey } from '../hooks/useUserMetadataByPubkey';
import { ReplyForm } from '../components/ReplyForm';
import { QueueItemDisplay } from '../components/QueueItemDisplay';
import { ReactionsDisplay } from '../components/ReactionButton';
import {
  createStatusEvent,
  STATUS_OPTIONS,
  getStatusColor,
  getStatusLabel,
  getStatusContainerColors,
  isModerator as checkIsModerator,
  type StatusOption,
} from '../utils/statusEventUtils.ts';
import {
  getLatestReplaceableEvent,
  hasBeenEdited,
  getDTag,
} from '../utils/editEventUtils';
import { EditForm } from '../components/EditForm';
import { useCommunityContext } from '../hooks/useCommunityContext';

export const RequestDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { isConnected, pool, relays, userPublicKey, bunkerSigner } = useNostr();
  const communityContext = useCommunityContext();
  const {
    request,
    thread,
    status,
    statusEvents,
    allEvents,
    isLoading,
    error,
    refetch,
  } = useRequestDetails(
    requestId!,
    communityContext?.communityInfo?.moderators || []
  );
  const { getDisplayName, fetchMetadataForPubkey } = useUserMetadataByPubkey(
    isConnected,
    pool,
    relays
  );

  const communityInfo = communityContext?.communityInfo;
  const communityATag = communityContext?.communityATag || null;
  const communityRouteId = communityContext?.communityId || null;
  const encodedCommunityId = communityRouteId
    ? encodeURIComponent(communityRouteId)
    : null;

  // Status dropdown state
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState(false);

  // Queue state for reply submissions
  const [queueItemId, setQueueItemId] = useState<string | null>(null);

  // Dropdown state for settings menu
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  // Edit state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Check if current user is a moderator
  const isModerator =
    userPublicKey && communityInfo?.moderators
      ? checkIsModerator(userPublicKey, communityInfo.moderators)
      : false;

  // Update selectedStatus when status prop changes
  useEffect(() => {
    setSelectedStatus(status);
  }, [status]);

  // Fetch metadata for all public keys in the request and thread
  useEffect(() => {
    if (!request) return;

    const allPubkeys = new Set<string>();

    // Add the request author's pubkey
    allPubkeys.add(request.pubkey);

    // Add all thread event pubkeys
    thread.forEach(event => {
      allPubkeys.add(event.pubkey);
    });

    // Add all status event pubkeys
    statusEvents.forEach(event => {
      allPubkeys.add(event.pubkey);
    });

    // Fetch metadata for all unique pubkeys
    allPubkeys.forEach(pubkey => {
      fetchMetadataForPubkey(pubkey);
    });
  }, [request, thread, statusEvents, fetchMetadataForPubkey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.settings-dropdown-container')) {
        setShowSettingsDropdown(false);
      }
    };

    if (showSettingsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSettingsDropdown]);

  // Encode the request event ID as a nevent for the raw data page
  const neventUrl = useMemo(() => {
    if (!request) return null;
    try {
      const nevent = nip19.neventEncode({
        id: request.id,
        relays: relays || [],
      });
      return `/event/${encodeURIComponent(nevent)}`;
    } catch {
      return null;
    }
  }, [request, relays]);

  if (!communityContext || !communityATag || !encodedCommunityId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Missing community context
          </h1>
          <p className="text-gray-600">
            Request details require a selected community. Please choose one from
            the communities list.
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

  const handleStatusChange = async (newStatus: string) => {
    if (!pool || !relays || !userPublicKey || !bunkerSigner) {
      setStatusError('Not connected to Nostr or missing bunker signer');
      return;
    }

    if (!isModerator) {
      setStatusError('Only moderators can change request status');
      return;
    }

    if (newStatus === status) {
      return; // No change needed
    }

    setIsUpdatingStatus(true);
    setStatusError(null);
    setStatusSuccess(false);

    try {
      // Create the unsigned status event
      const unsignedEvent = createStatusEvent(
        requestId!,
        newStatus,
        userPublicKey,
        {
          communityATag,
        }
      );

      // Sign the event using the bunker signer
      const signedEvent = await bunkerSigner.signEvent(unsignedEvent);

      // Publish the signed status event
      await pool.publish(relays, signedEvent);

      // Show success message
      setStatusSuccess(true);

      // Notify parent component to refetch data
      refetch();

      // Reset success message after a short delay
      setTimeout(() => {
        setStatusSuccess(false);
      }, 2000);
    } catch {
      setStatusError('Failed to update status. Please try again.');
      // Revert the selection on error
      setSelectedStatus(status);
    } finally {
      setIsUpdatingStatus(false);
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

  const getAuthorDisplay = (pubkey: string) => {
    return getDisplayName(pubkey);
  };

  const getStatusStyling = (status: string) => {
    return getStatusColor(status);
  };

  // Helper function to get the latest version of an event (original or edited)
  const getLatestEvent = (originalEvent: Event): Event => {
    if (!allEvents) return originalEvent;
    return getLatestReplaceableEvent(allEvents, originalEvent);
  };

  const parseRequestContent = (request: Event) => {
    // Get the latest version of the event (may be edited)
    const latestEvent = getLatestEvent(request);
    return {
      subject: latestEvent.tags.find(tag => tag[0] === 'title')?.[1] || '',
      message: latestEvent.content,
      name: getDisplayName(latestEvent.pubkey),
      email: '',
    };
  };

  const parseContent = (content: string) => {
    try {
      // Try to parse as JSON first (for community requests)
      const parsed = JSON.parse(content);
      return {
        subject: parsed.subject || '',
        message: parsed.message || content,
        name: parsed.name || 'Anonymous',
        email: parsed.email || '',
      };
    } catch {
      // If not JSON, treat as plain text
      return {
        subject: '',
        message: content,
        name: 'Anonymous',
        email: '',
      };
    }
  };

  // Helper function to get display content (original or edited)
  const getDisplayContent = (event: Event): string => {
    const latestEvent = getLatestEvent(event);
    return latestEvent.content;
  };

  // Helper function to check if user can edit an event
  const canEditEvent = (event: Event): boolean => {
    return userPublicKey !== null && event.pubkey === userPublicKey;
  };

  // Merge status events with thread events for chronological display
  const getMergedThreadEvents = () => {
    // Convert status events to a format compatible with thread display
    const statusThreadEvents = statusEvents.map((event: Event) => ({
      ...event,
      level: 0, // Status events are always at root level
      isRoot: false,
      type: 'status' as const,
    }));

    // Convert regular thread events
    const regularThreadEvents = thread.slice(1).map(event => {
      const eventWithEdit = event as unknown as Event & { isEdit: boolean };
      return {
        ...event,
        type: eventWithEdit.isEdit ? ('edit' as const) : ('reply' as const),
      };
    });

    // Merge and sort by creation time
    const allEvents = [...statusThreadEvents, ...regularThreadEvents].sort(
      (a, b) => a.created_at - b.created_at
    );

    return allEvents;
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading request details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Request not found
            </h3>
            <p className="text-gray-600 mb-4">
              The request you're looking for could not be found.
            </p>
            <button
              type="button"
              onClick={() =>
                navigate(`/community/${encodedCommunityId}/dashboard`)
              }
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const requestContent = parseRequestContent(request);
  const requestDTag = request ? getDTag(request) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              type="button"
              onClick={() =>
                navigate(`/community/${encodedCommunityId}/dashboard`)
              }
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Request Details
            </h1>
            {neventUrl && (
              <div className="settings-dropdown-container relative">
                <button
                  type="button"
                  onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Settings"
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
                </button>
                {showSettingsDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSettingsDropdown(false);
                          navigate(neventUrl);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        View raw event data
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Request */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {requestContent.subject || 'No Subject'}
                  </h2>
                  {requestDTag && (
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      #{requestDTag}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStatus}
                      onChange={e => {
                        setSelectedStatus(e.target.value);
                        handleStatusChange(e.target.value);
                      }}
                      disabled={isUpdatingStatus || !isModerator}
                      className={`text-sm px-3 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getStatusStyling(selectedStatus)}`}
                    >
                      {STATUS_OPTIONS.map((option: StatusOption) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {isUpdatingStatus && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                    {!isModerator && (
                      <div className="group relative">
                        <svg
                          className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                          Only moderators may change request state
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>From: {requestContent.name}</span>
                  {requestContent.email && (
                    <span>Email: {requestContent.email}</span>
                  )}
                  <span>Posted: {formatDate(request.created_at)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">
                  Author: {getAuthorDisplay(request.pubkey)}
                </div>
              </div>
            </div>

            <div className="prose max-w-none">
              {editingEventId === request.id ? (
                <EditForm
                  originalContent={getDisplayContent(request)}
                  originalEvent={getLatestEvent(request)}
                  originalTitle={requestContent.subject}
                  onEditSubmitted={() => {
                    setEditingEventId(null);
                    refetch();
                  }}
                  onCancel={() => setEditingEventId(null)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <p className="text-gray-700 whitespace-pre-wrap flex-1">
                      {getDisplayContent(request)}
                    </p>
                    {canEditEvent(request) && (
                      <button
                        type="button"
                        onClick={() => setEditingEventId(request.id)}
                        className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit request"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  {allEvents && hasBeenEdited(allEvents, request) && (
                    <p className="text-xs text-gray-500 mt-2 italic">
                      (Edited)
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Reactions */}
            {request && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <ReactionsDisplay
                  requestId={request.id}
                  requestPubkey={request.pubkey}
                  allEvents={allEvents}
                  userPublicKey={userPublicKey}
                  onReactionAdded={refetch}
                />
              </div>
            )}

            {/* Status Messages */}
            {statusError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                {statusError}
              </div>
            )}

            {statusSuccess && (
              <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-md text-sm">
                Status updated successfully!
              </div>
            )}
          </div>

          {/* Thread */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Activity ({getMergedThreadEvents().length} events)
            </h3>

            {getMergedThreadEvents().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No activity yet. Be the first to respond!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getMergedThreadEvents().map(event => {
                  if (event.type === 'status') {
                    // Display status event
                    const statusTag =
                      event.tags.find(
                        (tag: string[]) => tag[0] === 'status'
                      )?.[1] || '';
                    const statusStyling = getStatusColor(statusTag);
                    const statusLabel = getStatusLabel(statusTag);

                    return (
                      <div
                        key={event.id}
                        className={getStatusContainerColors(statusTag)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                Status Update by {getDisplayName(event.pubkey)}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded border ${statusStyling}`}
                              >
                                {statusLabel}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatDate(event.created_at)}
                              </span>
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm">
                          Request status changed to{' '}
                          <strong>{statusLabel}</strong>
                        </p>
                      </div>
                    );
                  } else if (event.type === 'edit') {
                    // Display edit indicator (only showing that there is an edit)
                    return (
                      <div
                        key={event.id}
                        className="border-l-4 border-gray-300 pl-4 py-2 bg-gray-50 rounded"
                      >
                        <div className="flex items-center gap-2 text-sm text-gray-600">
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          <span>
                            Request edited by {getDisplayName(event.pubkey)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(event.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  } else {
                    // Display regular reply
                    const latestEvent = getLatestEvent(event);
                    const displayContent = getDisplayContent(event);
                    const parsedContent = parseContent(displayContent);
                    const indentLevel = event.level;
                    const displayName = getDisplayName(event.pubkey);
                    const isBeingEdited = editingEventId === event.id;
                    const hasEdit =
                      allEvents && hasBeenEdited(allEvents, event);

                    return (
                      <div
                        key={event.id}
                        className="border-l-4 border-blue-200 pl-4 py-3"
                        style={{ marginLeft: `${indentLevel * 16}px` }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {displayName}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatDate(latestEvent.created_at)}
                              </span>
                              {hasEdit && (
                                <span className="text-xs text-gray-400 italic">
                                  (Edited)
                                </span>
                              )}
                            </span>
                          </div>
                          {canEditEvent(event) && !isBeingEdited && (
                            <button
                              type="button"
                              onClick={() => setEditingEventId(event.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Edit reply"
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
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                        {isBeingEdited ? (
                          <EditForm
                            originalContent={getDisplayContent(event)}
                            originalEvent={latestEvent}
                            onEditSubmitted={() => {
                              setEditingEventId(null);
                              refetch();
                            }}
                            onCancel={() => setEditingEventId(null)}
                          />
                        ) : (
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {parsedContent.message}
                          </p>
                        )}
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>

          {/* Queue Item Display for Reply Submissions */}
          {queueItemId && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <QueueItemDisplay
                queueItemId={queueItemId}
                onCompleted={() => {
                  // Hide the queue display and refetch to show the new reply
                  setQueueItemId(null);
                  refetch();
                }}
                onFailed={() => {
                  // Hide the queue display on failure
                  setQueueItemId(null);
                }}
              />
            </div>
          )}

          {/* Reply Form */}
          <ReplyForm
            requestId={requestId!}
            requestPubkey={request.pubkey}
            onReplyAdded={() => refetch()}
            onQueueItemSet={setQueueItemId}
          />
        </div>
      </div>
    </div>
  );
};
