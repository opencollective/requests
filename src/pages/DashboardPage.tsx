import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { EventQueueHeader } from '../components/EventQueueHeader';
import { ConnectionStatusBox } from '../components/ConnectionStatusBox';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useNostr();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Community Requests
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage your community requests and stay connected with Nostr
          </p>
        </div>

        {/* Event Queue Header */}
        <EventQueueHeader />

        <div className="max-w-6xl mx-auto">
          {/* Connection Status Section - Top Priority */}
          <div className="mb-8">
            <ConnectionStatusBox
              onLogout={async () => {
                await logout();
                navigate('/login');
              }}
            />
          </div>

          {/* Quick Actions Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Quick Actions
                </h2>
                <p className="text-gray-600">Common tasks and shortcuts</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-lg">
                <div className="space-y-4">
                  <button
                    onClick={() => navigate('/request')}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium"
                  >
                    Submit Request
                  </button>
                  <button
                    onClick={() => navigate('/requests')}
                    className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    View All Requests
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
