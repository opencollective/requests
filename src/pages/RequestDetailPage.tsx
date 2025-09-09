import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import type { Event } from 'nostr-tools';
import { ReplyForm } from '../components/ReplyForm';

interface ThreadEvent extends Event {
  level: number;
  isRoot: boolean;
}

export const RequestDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { isConnected, subscribeToEvents, events, clearEvents } = useNostr();

  const [request, setRequest] = useState<Event | null>(null);
  const [thread, setThread] = useState<ThreadEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the main request and build the thread
  useEffect(() => {
    if (!requestId) return;

    setIsLoading(true);
    setError(null);
    clearEvents();

    try {
      // First, fetch the main request
      subscribeToEvents({
        ids: [requestId],
        limit: 1,
      });

      // Then fetch the thread (replies and related events)
      subscribeToEvents({
        kinds: [1, 30023], // Text notes and community requests
        '#e': [requestId], // Events that reference this request
        limit: 100,
      });

      // Also fetch events that this request references (for building the thread)
      subscribeToEvents({
        kinds: [1, 30023],
        '#e': [requestId],
        limit: 100,
      });
    } catch {
      setError('Failed to fetch request details');
      setIsLoading(false);
    }
  }, [requestId, subscribeToEvents, clearEvents]);

  // Process events into request and thread
  useEffect(() => {
    console.log('events', events);
    const uniqueEvents = events.filter(
      (event, index, arr) => arr.findIndex(e => e.id === event.id) === index
    );

    if (uniqueEvents.length === 0) return;

    // Find the main request
    const mainRequest = uniqueEvents.find(event => event.id === requestId);
    if (mainRequest) {
      setRequest(mainRequest);
    }

    // Build the thread following NIP-10
    const threadEvents: ThreadEvent[] = [];

    // Add the main request as root
    if (mainRequest) {
      threadEvents.push({
        ...mainRequest,
        level: 0,
        isRoot: true,
      });
    }

    // Process all events that reference this request
    const allReplies = uniqueEvents.filter(
      event =>
        event.id !== requestId &&
        event.kind === 1 && // Text notes (replies)
        event.tags.some(tag => tag[0] === 'e' && tag[1] === requestId) &&
        !threadEvents.some(threadEvent => threadEvent.id === event.id)
    );

    // Sort replies by timestamp
    allReplies.sort((a, b) => a.created_at - b.created_at);

    // Build thread hierarchy using NIP-10 logic
    const processedReplies = allReplies.map(reply => {
      // Analyze the 'e' tags to determine reply level
      const eventTags = reply.tags.filter(tag => tag[0] === 'e');
      let level = 1; // Default level for direct replies

      if (eventTags.length > 1) {
        // Check if this is a reply to another reply
        const replyToEventId = eventTags[1]?.[1]; // Second 'e' tag
        if (replyToEventId && replyToEventId !== requestId) {
          // This is a reply to another reply
          level = 2;
        }
      }

      return {
        ...reply,
        level,
        isRoot: false,
      };
    });

    // Add processed replies to thread
    threadEvents.push(...processedReplies);

    setThread(threadEvents);
    setIsLoading(false);
  }, [events, requestId]);

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
    return pubkey.slice(0, 8) + '...' + pubkey.slice(-8);
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

  const requestContent = parseContent(request.content);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
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
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {requestContent.subject || 'No Subject'}
                </h2>
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
          </div>

          {/* Thread */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Thread ({thread.length - 1} replies)
            </h3>

            {thread.length === 1 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No replies yet. Be the first to respond!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {thread.slice(1).map(event => {
                  const content = parseContent(event.content);
                  const indentLevel = event.level;

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
                              {content.name}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(event.created_at)}
                            </span>
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {getAuthorDisplay(event.pubkey)}
                        </div>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {content.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reply Form */}
          <ReplyForm requestId={requestId!} onReplyAdded={() => {}} />
        </div>
      </div>
    </div>
  );
};
