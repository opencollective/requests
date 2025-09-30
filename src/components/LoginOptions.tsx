import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { OpenBunkerAuthButton } from './OpenBunkerAuthButton';

export const LoginOptions: React.FC = () => {
  const [showSecretKey, setShowSecretKey] = useState(false);

  const { configureBunkerConnectionWithNostrConnect, popup } = useNostr();
  const navigate = useNavigate();

  if (showSecretKey) {
    return (
      <div>
        <button
          onClick={() => setShowSecretKey(false)}
          className="mb-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center"
        >
          ← Back to options
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Choose Authentication Method
        </h2>
        <p className="text-gray-600">
          Select how you'd like to authenticate with OpenBunker
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <OpenBunkerAuthButton
            onClick={async () => {
              await configureBunkerConnectionWithNostrConnect();
              navigate('/dashboard');
            }}
            disabled={!!popup}
            isLoading={!!popup}
            text="Authenticate with NostrConnect"
          />
        </div>
      </div>

      {popup && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            A new window has opened for OpenBunker authentication.
          </p>
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-gray-500 mt-1">
          <strong>NostrConnect:</strong> Use NostrConnect and OpenBunker to get
          your Nostr key
        </p>
      </div>
    </div>
  );
};
