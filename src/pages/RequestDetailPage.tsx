import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { useRequestDetails } from '../hooks/useRequestDetails';
import { ReplyForm } from '../components/ReplyForm';
import { type Event } from 'nostr-tools';

export const RequestDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { isConnected } = useNostr();
  const { request, thread, isLoading, error, refetch } =
    useRequestDetails(requestId);

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

  const parseRequestContent = (request: Event) => {
    return {
      subject: request.tags.find(tag => tag[0] === 'title')?.[1] || '',
      message: request.content,
      name: request.pubkey,
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

  const requestContent = parseRequestContent(request);

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
          <ReplyForm
            requestId={requestId!}
            requestPubkey={request.pubkey}
            onReplyAdded={() => refetch()}
          />
        </div>
      </div>
    </div>
  );
};
