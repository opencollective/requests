import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { EventQueueHeader } from '../components/EventQueueHeader';
import { ConnectionStatusBox } from '../components/ConnectionStatusBox';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useNostr();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-16">
        {/* ConnectionStatusBox - Top Right Corner */}
        <div className="flex justify-end mb-6">
          <ConnectionStatusBox
            onLogout={async () => {
              await logout();
              navigate('/login');
            }}
          />
        </div>

        {/* Title Section - Centered */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Community Requests
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Getting in touch with your community
          </p>
        </div>

        {/* Event Queue Header */}
        <EventQueueHeader />

        <div className="max-w-6xl mx-auto">
          {/* Quick Actions Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-gray-800 mb-2">
              Quick Actions
            </h2>
            <p className="text-gray-600">Common tasks and shortcuts</p>
          </div>

          {/* Action Tiles - Single Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Submit Request Tile */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Submit Request
                </h3>
                <p className="text-gray-600 mb-6">
                  Create a new community request
                </p>
                <button
                  onClick={() => navigate('/request')}
                  className="w-full bg-gradient-to-r from-blue-500/90 to-indigo-500/90 text-white py-3 px-6 rounded-lg hover:from-blue-600/90 hover:to-indigo-600/90 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                >
                  Submit Request
                </button>
              </div>
            </div>

            {/* View All Requests Tile */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  View All Requests
                </h3>
                <p className="text-gray-600 mb-6">Browse community requests</p>
                <button
                  onClick={() => navigate('/requests')}
                  className="w-full bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white py-3 px-6 rounded-lg hover:from-purple-600/90 hover:to-pink-600/90 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                >
                  View All Requests
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
