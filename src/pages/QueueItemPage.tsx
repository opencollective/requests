import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import type { ProcessedEventQueueItem } from '../contexts/NostrContextTypes';

const QueueItemPage: React.FC = () => {
  const { queueItemId } = useParams<{ queueItemId: string }>();
  const navigate = useNavigate();
  const { getQueueItemById } = useNostr();

  useEffect(() => {
    if (!queueItemId) {
      navigate('/dashboard');
      return;
    }

    const queueItem = getQueueItemById(queueItemId);
    console.log('Queue item:', queueItem);
    if (!queueItem) {
      // Queue item not found, redirect to dashboard
      navigate('/dashboard');
      return;
    }

    // If the item is completed, redirect to the requests page
    if (queueItem.status === 'completed') {
      console.log('Queue item completed:', queueItem);
      navigate(`/requests/${(queueItem as ProcessedEventQueueItem).event.id}`);
      return;
    }

    // If the item failed, show error and redirect after a delay
    if (queueItem.status === 'failed') {
      console.log('Queue item failed:', queueItem);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
      return;
    }
  }, [queueItemId, getQueueItemById, navigate]);

  if (!queueItemId) {
    return null;
  }

  const queueItem = getQueueItemById(queueItemId);

  if (!queueItem) {
    return null;
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">
                {getStatusIcon(queueItem.status)}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Request Status
            </h1>

            <div className="mb-6">
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                  queueItem.status
                )}`}
              >
                {queueItem.status}
              </span>
            </div>

            <p className="text-lg text-gray-600 mb-6">
              {getStatusMessage(queueItem.status)}
            </p>

            {queueItem.status === 'processing' && (
              <div className="mb-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            )}

            {queueItem.status === 'failed' && queueItem.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <p className="text-sm text-red-700">Error: {queueItem.error}</p>
              </div>
            )}

            <div className="text-sm text-gray-500 mb-6">
              <p>
                Submitted at: {new Date(queueItem.timestamp).toLocaleString()}
              </p>
              <p>Queue ID: {queueItem.id}</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Back to Dashboard
              </button>

              {queueItem.status === 'completed' && (
                <button
                  onClick={() => navigate('/requests')}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  View All Requests
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueItemPage;
