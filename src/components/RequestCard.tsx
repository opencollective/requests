import React from 'react';
import type { RequestData } from '../hooks/useRequests';

interface RequestCardProps {
  request: RequestData;
  onViewDetails: (requestId: string) => void;
}

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  onViewDetails,
}) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getAuthorDisplay = (pubkey: string) => {
    return pubkey.slice(0, 8) + '...' + pubkey.slice(-8);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {request.subject}
          </h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {formatDate(request.createdAt)}
          </span>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {truncateText(request.message, 150)}
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">From:</span>
            <span className="font-medium text-gray-900">{request.subject}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Author:</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              {getAuthorDisplay(request.author)}
            </code>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => onViewDetails(request.id)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};
