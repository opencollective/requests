import React from 'react';

export const OpenBunkerLoginPopup: React.FC = () => {
  const handleOpenBunkerLogin = () => {
    // In a real implementation, this would redirect to OpenBunker
    // For now, we'll simulate the process
    const mockToken = 'bunker://mock-token-' + Date.now();

    // Send message to parent window
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'openbunker-auth-success',
          secretKey: mockToken,
        },
        '*'
      );
      window.close();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            OpenBunker Authentication
          </h1>
          <p className="text-gray-600">
            Connect your Nostr account via OpenBunker
          </p>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              This is a demo implementation. In production, this would redirect
              to OpenBunker for OAuth authentication.
            </p>

            <button
              onClick={handleOpenBunkerLogin}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
            >
              Simulate OpenBunker Login
            </button>
          </div>

          <div className="border-t pt-6">
            <p className="text-xs text-gray-400 text-center">
              OpenBunker provides secure Nostr key management through OAuth
              providers like Discord.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
