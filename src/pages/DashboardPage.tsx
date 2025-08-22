import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, userProfile, userPublicKey, bunkerStatus, logout } =
    useNostr();
  const profileData = userProfile?.content
    ? JSON.parse(userProfile.content)
    : {};

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

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Welcome back!
                </h2>
                <p className="text-gray-600">
                  You're successfully authenticated and connected to Nostr
                  relays.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Profile
                </h3>
                <div className="space-y-2">
                  <p>
                    <strong>Name:</strong> {profileData.name || 'Not set'}
                  </p>
                  <p>
                    <strong>Public Key:</strong>{' '}
                    <code className="text-xs bg-gray-100 p-1 rounded">
                      {userPublicKey?.slice(0, 20)}...
                    </code>
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    <span
                      className={`px-2 py-1 rounded text-xs ${bunkerStatus === 'connected' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                    >
                      {bunkerStatus}
                    </span>
                  </p>
                </div>
              </div>

              <div className="text-center space-y-3">
                <button
                  onClick={() => navigate('/request')}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            </div>

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
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Submit Request
                  </button>
                  <button
                    onClick={() => navigate('/requests')}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    View All Requests
                  </button>
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Connection Status
                </h2>
                <p className="text-gray-600">Your Nostr relay connection</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-lg">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Nostr Connection:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bunker Status:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${bunkerStatus === 'connected' ? 'bg-green-100 text-green-800' : bunkerStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {bunkerStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Relays:</span>
                    <span className="text-sm text-gray-600">5 connected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
