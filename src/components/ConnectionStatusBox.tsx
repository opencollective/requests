import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';

interface ConnectionStatusBoxProps {
  onLogout?: () => void;
  showLoginButton?: boolean;
}

export const ConnectionStatusBox: React.FC<ConnectionStatusBoxProps> = ({
  onLogout,
  showLoginButton = false,
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get all the state from the Nostr context
  const {
    isConnected,
    userPublicKey,
    bunkerStatus,
    bunkerPublicKey,
    localSecretKey,
    isAuthenticated,
    isSubmitting: isOpenBunkerSubmitting,
    error: openBunkerError,
    lastResponse: lastOpenBunkerResponse,
  } = useNostr();

  // Determine authentication method and status
  const hasBunkerData = bunkerPublicKey;
  const isUsingBunker = hasBunkerData && localSecretKey;
  const isUsingLocalKey = localSecretKey && !hasBunkerData;
  const authMethod = isUsingBunker
    ? 'Bunker'
    : isUsingLocalKey
      ? 'Local Key'
      : 'None';

  // Get the active public key
  const activePublicKey = isUsingBunker ? bunkerPublicKey : userPublicKey;

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      {/* Header with collapse/expand button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">
          Connection Status
        </h2>
        <div className="flex items-center space-x-3">
          {/* Collapse/Expand Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Login/Logout Button */}
          {isAuthenticated && onLogout ? (
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all duration-200"
            >
              Log Out
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200"
            >
              Log In
            </button>
          )}
        </div>
      </div>

      {/* Collapsed State - Always Visible */}
      <div className="space-y-3 mb-4">
        {/* Nostr Connection Status */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">Nostr Connection:</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isConnected
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Authentication Status with Info Tooltip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-700">Authentication:</span>
            <div className="relative group">
              <svg
                className="w-4 h-4 text-gray-400 cursor-help"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                You need to authenticate to claim your requests
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {userPublicKey ? 'Authenticated' : 'Not Authenticated'}
          </span>
        </div>
      </div>

      {/* Expanded State - Conditionally Visible */}
      {isExpanded && (
        <>
          {/* Connection Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Main Connection Status */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">
                  Authentication Method:
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {authMethod}
                </span>
              </div>

              {activePublicKey && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Public Key:</span>
                  <code className="text-xs bg-gray-100 p-2 rounded font-mono max-w-48 truncate">
                    {activePublicKey}
                  </code>
                </div>
              )}
            </div>

            {/* Authentication Details Sub-box */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {isUsingBunker ? 'Bunker Information' : 'Local Key Information'}
              </h3>

              {isUsingBunker ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Bunker Status:
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        bunkerStatus === 'connected'
                          ? 'bg-green-100 text-green-800'
                          : bunkerStatus === 'connecting'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {bunkerStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Bunker Public Key:
                    </span>
                    <code className="text-xs bg-gray-200 p-1 rounded font-mono max-w-32 truncate">
                      {bunkerPublicKey?.slice(0, 16)}...
                    </code>
                  </div>
                </div>
              ) : isUsingLocalKey ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Local Key Status:
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Key Type:</span>
                    <span className="text-xs text-gray-600">Secret Key</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    No authentication configured
                  </p>
                  <button
                    onClick={() => navigate('/login')}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 underline"
                  >
                    Configure Authentication
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Login Button for unauthenticated users when showLoginButton is true */}
          {showLoginButton && !userPublicKey && (
            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium"
              >
                Login to Submit Authenticated Request
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Or submit anonymously below
              </p>
            </div>
          )}

          {/* OpenBunker State Information */}
          {(isOpenBunkerSubmitting ||
            openBunkerError ||
            lastOpenBunkerResponse) && (
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                OpenBunker Status
              </h3>

              {isOpenBunkerSubmitting && (
                <div className="flex items-center space-x-2 mb-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">
                    Submitting to OpenBunker...
                  </span>
                </div>
              )}

              {openBunkerError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                  <p className="text-sm text-red-700">
                    <span className="font-medium">OpenBunker Error:</span>{' '}
                    {openBunkerError}
                  </p>
                </div>
              )}

              {lastOpenBunkerResponse && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Last Response:</span>{' '}
                    {lastOpenBunkerResponse.message || 'Request submitted'}
                  </p>
                  {lastOpenBunkerResponse.bunkerUrl && (
                    <p className="text-xs text-blue-600 mt-1">
                      Bunker URL: {lastOpenBunkerResponse.bunkerUrl}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
