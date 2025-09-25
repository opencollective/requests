import React from 'react';

interface RequestFilterControlsProps {
  showAllRequests: boolean;
  onToggleShowAll: () => void;
}

export const RequestFilterControls: React.FC<RequestFilterControlsProps> = ({
  showAllRequests,
  onToggleShowAll,
}) => {
  return (
    <div className="flex items-center justify-end mb-4">
      <button
        type="button"
        onClick={onToggleShowAll}
        className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
          />
        </svg>
        {showAllRequests ? 'Show Active Only' : 'Show All Requests'}
      </button>
    </div>
  );
};
