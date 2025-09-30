import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';

export const ConnectionStatusBox: React.FC = () => {
  const navigate = useNavigate();
  // Get all the state from the Nostr context
  const { bunkerStatus, logout, metadata } = useNostr();

  // Get the user's display name or name
  const userName = metadata?.display_name || metadata?.name || 'Anonymous';

  return (
    <div className="flex items-center justify-between mb-6">
      {bunkerStatus === 'connected' ? (
        <>
          {/* Profile Section */}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            title="View Profile"
          >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
              {metadata?.picture ? (
                <img
                  src={metadata.picture}
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-8 h-8 text-gray-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
            {/* Username */}
            <div className="flex flex-col items-start">
              <span className="text-base font-semibold text-gray-900">
                {userName}
              </span>
            </div>
          </button>

          {/* Logout Button */}
          <button
            onClick={async () => await logout()}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Log Out
          </button>
        </>
      ) : (
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
        >
          Log In
        </button>
      )}
    </div>
  );
};
