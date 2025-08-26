import React, { useState } from 'react';
import type { EventQueueItem } from '../contexts/NostrContextTypes';
import { useNostr } from '../hooks/useNostr';

export const EventQueueHeader: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get all the queue state from the Nostr context
  const { queue, processedQueue, isProcessing, removeFromQueue, clearQueue } =
    useNostr();

  if (queue.length === 0 && processedQueue.length === 0) {
    return null;
  }

  const pendingCount = queue.filter(item => item.status === 'pending').length;
  const processingCount = queue.filter(
    item => item.status === 'processing'
  ).length;
  const completedCount = processedQueue.filter(
    item => item.status === 'completed'
  ).length;
  const failedCount = queue.filter(item => item.status === 'failed').length;

  const getStatusColor = (status: EventQueueItem['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: EventQueueItem['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const handleClearQueue = () => {
    // Only clear completed and failed items, keep pending ones
    clearQueue();
  };

  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">📋</span>
            <span className="font-semibold text-gray-900">Event Queue</span>
          </div>

          {/* Status badges */}
          {pendingCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
              {pendingCount} pending
            </span>
          )}
          {processingCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {processingCount} processing
            </span>
          )}
          {completedCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              {completedCount} completed
            </span>
          )}
          {failedCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
              {failedCount} failed
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isProcessing && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          {(completedCount > 0 || failedCount > 0) && (
            <button
              className="text-gray-500 hover:text-gray-700 transition-colors"
              onClick={e => {
                e.stopPropagation();
                handleClearQueue();
              }}
              title="Clear completed and failed events"
            >
              🗑️
            </button>
          )}
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${
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

      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          <div className="space-y-3">
            {queue.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-lg">{getStatusIcon(item.status)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 mt-1 truncate">
                      {item.event.content
                        ? typeof item.event.content === 'string'
                          ? item.event.content.substring(0, 100) +
                            (item.event.content.length > 100 ? '...' : '')
                          : JSON.stringify(item.event.content).substring(
                              0,
                              100
                            ) + '...'
                        : `Event ${item.id.substring(0, 8)}...`}
                    </div>
                    {item.error && (
                      <div className="text-xs text-red-600 mt-1">
                        Error: {item.error}
                      </div>
                    )}
                  </div>
                </div>

                {item.status === 'pending' && (
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    className="text-red-500 hover:text-red-700 transition-colors p-1"
                    title="Remove from queue"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {queue.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Active events: {queue.length} | Pending: {pendingCount} |
                Processing: {processingCount} | Failed: {failedCount}
              </div>
            </div>
          )}

          {processedQueue.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Processed events: {processedQueue.length} | Completed:{' '}
                {completedCount}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
