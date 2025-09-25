import React from 'react';
import { CommunityInfo } from '../components/CommunityInfo';
import { TabNavigation } from '../components/TabNavigation';

export const CommunityPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <TabNavigation />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Community Information
          </h1>
          <p className="text-gray-600 mt-1">
            View community details and settings
          </p>
        </div>

        {/* Community Info */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <CommunityInfo />
        </div>
      </div>
    </div>
  );
};
