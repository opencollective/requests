import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { useRequestDetails } from '../hooks/useRequestDetails';
import { useUserMetadataByPubkey } from '../hooks/useUserMetadataByPubkey';
import { ReplyForm } from '../components/ReplyForm';
import { QueueItemDisplay } from '../components/QueueItemDisplay';
import {
  createStatusEvent,
  STATUS_OPTIONS,
  getStatusColor,
  getStatusLabel,
  getStatusContainerColors,
  isModerator as checkIsModerator,
  type StatusOption,
} from '../utils/statusEventUtils.ts';
import { getCommunityATagFromEnv } from '../utils/communityUtils';
import { type Event } from 'nostr-tools';

export const RequestDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const {
    isConnected,
    pool,
    relays,
    userPublicKey,
    bunkerSigner,
    communityInfo,
  } = useNostr();
  const { request, thread, status, statusEvents, isLoading, error, refetch } =
    useRequestDetails(requestId, communityInfo?.moderators || []);
  const { getDisplayName, fetchMetadataForPubkey } = useUserMetadataByPubkey(
    isConnected,
    pool,
    relays
  );

  // Status dropdown state
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState(false);

  // Queue state for reply submissions
  const [queueItemId, setQueueItemId] = useState<string | null>(null);

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
          communityATag: getCommunityATagFromEnv(),
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

  const parseRequestContent = (request: Event) => {
    return {
      subject: request.tags.find(tag => tag[0] === 'title')?.[1] || '',
      message: request.content,
      name: getDisplayName(request.pubkey),
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
    const regularThreadEvents = thread
      .slice(1)
      .map((event: Event & { level: number; isRoot: boolean }) => ({
        ...event,
        type: 'reply' as const,
      }));

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
              onClick={() => navigate('/dashboard')}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Request Details
            </h1>
          </div>

          {/* Main Request */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {requestContent.subject || 'No Subject'}
                  </h2>
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
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  ID: {request.id.slice(0, 8)}...
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Author: {getAuthorDisplay(request.pubkey)}
                </div>
              </div>
            </div>

            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">
                {requestContent.message}
              </p>
            </div>

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
                  } else {
                    // Display regular reply
                    const content = parseContent(event.content);
                    const indentLevel = event.level;
                    const displayName = getDisplayName(event.pubkey);

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
                                {formatDate(event.created_at)}
                              </span>
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {content.message}
                        </p>
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
