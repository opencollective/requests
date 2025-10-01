import React, { useEffect, useState, useRef } from 'react';
import { useNostr } from '../hooks/useNostr';
import type { ProcessedEventQueueItem } from '../hooks/useEventQueue';

interface QueueItemDisplayProps {
  queueItemId: string;
  // eslint-disable-next-line no-unused-vars
  onCompleted?: (eventId: string) => void;
  onFailed?: () => void;
}

export const QueueItemDisplay: React.FC<QueueItemDisplayProps> = ({
  queueItemId,
  onCompleted,
  onFailed,
}) => {
  const {
    getQueueItemById,
    confirmBunkerConnection,
    isWaitingForConfirmation,
    isOBAPISubmitting,
    error,
    email,
  } = useNostr();
  const [confirmationCode, setConfirmationCode] = useState<string>('');
  const confirmationCodeRef = useRef<HTMLDivElement>(null);

  // Handle confirmation code input with validation
  const handleConfirmationCodeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    // Only allow digits and limit to 6 characters
    if (/^\d*$/.test(value) && value.length <= 6) {
      setConfirmationCode(value);
    }
  };

  // Handle confirmation code submission
  const handleConfirmConnection = async () => {
    if (confirmationCode.length === 6 && email) {
      try {
        await confirmBunkerConnection(confirmationCode);
        // Success - the bunker connection will be established
      } catch {
        // Error handling is managed by the OpenBunker state
      }
    }
  };

  // Scroll to confirmation code when it appears
  useEffect(() => {
    if (isWaitingForConfirmation && confirmationCodeRef.current) {
      setTimeout(() => {
        confirmationCodeRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 150);
    }
  }, [isWaitingForConfirmation]);

  const queueItem = getQueueItemById(queueItemId);

  useEffect(() => {
    if (!queueItem) {
      return;
    }

    // If the item is completed, call onCompleted callback
    if (queueItem.status === 'completed' && onCompleted) {
      const eventId = (queueItem as ProcessedEventQueueItem).event.id;
      onCompleted(eventId);

      return;
    }

    // If the item failed, call onFailed callback
    if (queueItem.status === 'failed' && onFailed) {
      setTimeout(() => {
        onFailed();
      }, 3000);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueItem?.status, onCompleted, onFailed]);

  if (!queueItem) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <p className="text-gray-600">Queue item not found</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
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

  const getStatusColor = (status: string) => {
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

  const getStatusMessage = (status: string) => {
    if (isWaitingForConfirmation) {
      return 'Please enter the confirmation code sent to your email to complete the connection.';
    }

    switch (status) {
      case 'pending':
        return 'Your request is waiting to be processed...';
      case 'processing':
        return 'Your request is currently being processed...';
      case 'completed':
        return 'Your request has been successfully processed!';
      case 'failed':
        return 'Your request failed to process. Please try again.';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
          <span className="text-2xl">{getStatusIcon(queueItem.status)}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Request Status
          </h3>
          <span
            className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
              queueItem.status
            )}`}
          >
            {queueItem.status}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {getStatusMessage(queueItem.status)}
      </p>

      {/* Show confirmation code input if waiting for confirmation */}
      {isWaitingForConfirmation && (
        <div ref={confirmationCodeRef} className="mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="text-xs font-medium text-blue-800 mb-2">
              Confirmation Code
            </h4>
            <p className="text-xs text-blue-700 mb-2">
              Enter the 6-digit code sent to you:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={confirmationCode}
                onChange={handleConfirmationCodeChange}
                placeholder="000000"
                maxLength={6}
                className="flex-1 text-center text-xl font-mono font-bold text-blue-900 tracking-wider border border-blue-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {confirmationCode.length === 6 && (
                <button
                  onClick={handleConfirmConnection}
                  disabled={isOBAPISubmitting}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isOBAPISubmitting ? 'Confirming...' : 'Confirm'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {queueItem.status === 'processing' && (
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      {queueItem.status === 'failed' && queueItem.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-xs text-red-700">Error: {queueItem.error}</p>
        </div>
      )}

      {/* Show OpenBunker confirmation error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-xs text-red-700">Error: {error}</p>
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>Submitted: {new Date(queueItem.timestamp).toLocaleString()}</p>
        <p>Queue ID: {queueItem.id}</p>
      </div>
    </div>
  );
};
