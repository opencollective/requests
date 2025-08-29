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
    userPublicKey,
    bunkerStatus,
    bunkerPublicKey,
    localSecretKey,
    isAuthenticated,
    isSubmitting: isOpenBunkerSubmitting,
    error: openBunkerError,
    lastResponse: lastOpenBunkerResponse,
    nostrStatus,
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
    <div className="bg-gray-50 rounded-lg p-2 shadow-sm border border-gray-200 inline-block">
      {/* Header with collapse/expand button */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-700">
          Connection Status
        </h2>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            nostrStatus === 'connected'
              ? 'bg-green-100 text-green-800'
              : nostrStatus === 'connecting'
                ? 'bg-yellow-100 text-yellow-800'
                : nostrStatus === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-red-100 text-red-800'
          }`}
        >
          {nostrStatus === 'connected'
            ? 'Connected'
            : nostrStatus === 'connecting'
              ? 'Connecting'
              : nostrStatus === 'error'
                ? 'Error'
                : 'Disconnected'}
        </span>
        <div className="flex items-center space-x-2">
          {/* Collapse/Expand Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-4 h-4 transform transition-transform ${
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
              className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-all duration-200"
            >
              Log Out
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-all duration-200"
            >
              Log In
            </button>
          )}
        </div>
      </div>

      {/* Expanded State - Conditionally Visible */}
      {isExpanded && (
        <>
          {/* Connection Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {/* Main Connection Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Auth Method:
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {authMethod}
                </span>
              </div>

              {activePublicKey && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Key:
                  </span>
                  <code className="text-xs bg-gray-100 p-1 rounded font-mono max-w-32 truncate">
                    {activePublicKey}
                  </code>
                </div>
              )}
            </div>

            {/* Authentication Details Sub-box */}
            <div className="bg-gray-50 rounded p-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {isUsingBunker ? 'Bunker Info' : 'Local Key Info'}
              </h3>

              {isUsingBunker ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Status:</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
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
                    <span className="text-xs text-gray-600">Key:</span>
                    <code className="text-xs bg-gray-200 p-0.5 rounded font-mono max-w-24 truncate">
                      {bunkerPublicKey?.slice(0, 12)}...
                    </code>
                  </div>
                </div>
              ) : isUsingLocalKey ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Status:</span>
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Type:</span>
                    <span className="text-xs text-gray-600">Secret</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-gray-500">No auth configured</p>
                  <button
                    onClick={() => navigate('/login')}
                    className="mt-1 text-xs text-indigo-600 hover:text-indigo-700 underline"
                  >
                    Configure Auth
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Login Button for unauthenticated users when showLoginButton is true */}
          {showLoginButton && !userPublicKey && (
            <div className="pt-3 border-t border-gray-200">
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 text-white py-1.5 px-3 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium"
              >
                Login to Submit Authenticated Request
              </button>
              <p className="text-xs text-gray-500 mt-1 text-center">
                Or submit anonymously below
              </p>
            </div>
          )}

          {/* OpenBunker State Information */}
          {(isOpenBunkerSubmitting ||
            openBunkerError ||
            lastOpenBunkerResponse) && (
            <div className="pt-3 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                OpenBunker Status
              </h3>

              {isOpenBunkerSubmitting && (
                <div className="flex items-center space-x-2 mb-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span className="text-xs text-gray-600">
                    Submitting to OpenBunker...
                  </span>
                </div>
              )}

              {openBunkerError && (
                <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                  <p className="text-xs text-red-700">
                    <span className="font-medium">Error:</span>{' '}
                    {openBunkerError}
                  </p>
                </div>
              )}

              {lastOpenBunkerResponse && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <p className="text-xs text-blue-700">
                    <span className="font-medium">Response:</span>{' '}
                    {lastOpenBunkerResponse.message || 'Request submitted'}
                  </p>
                  {lastOpenBunkerResponse.bunkerUrl && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      URL: {lastOpenBunkerResponse.bunkerUrl}
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
