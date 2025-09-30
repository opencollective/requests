import React from 'react';
import { STATUS_OPTIONS } from '../utils/statusEventUtils';

// Extract status values from STATUS_OPTIONS
type StatusValue = (typeof STATUS_OPTIONS)[number]['value'];

export type RequestFilter = 'all' | StatusValue;

interface RequestFilterControlsProps {
  activeFilter: RequestFilter;
  // eslint-disable-next-line no-unused-vars
  onFilterChange: (filter: RequestFilter) => void;
}

// Build filter options dynamically from STATUS_OPTIONS
const FILTER_OPTIONS: { value: RequestFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...STATUS_OPTIONS.map(option => ({
    value: option.value as RequestFilter,
    label: option.label,
  })),
];

export const RequestFilterControls: React.FC<RequestFilterControlsProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <span className="text-sm text-gray-600 font-medium mr-2">Filter by:</span>
      {FILTER_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onFilterChange(option.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeFilter === option.value
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
