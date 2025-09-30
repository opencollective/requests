import React from 'react';
import { UserProfile } from '../components/UserProfile';

export const ProfilePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
          <p className="text-gray-600 mt-1">
            Manage your profile and authentication settings
          </p>
        </div>

        {/* User Profile */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <UserProfile />
        </div>
      </div>
    </div>
  );
};
