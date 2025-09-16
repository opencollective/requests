import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { openBunkerUrl } from '../api/openbunker';
import { OpenBunkerAuthButton } from './OpenBunkerAuthButton';

export const LoginOptions: React.FC = () => {
  const [showSecretKey, setShowSecretKey] = useState(false);

  const {
    configureBunkerConnectionWithNostrConnect,
    configureBunkerConnectionWithBunkerToken,
    popup,
  } = useNostr();
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
        <SecretKeyLogin />
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
        <button
          onClick={() => setShowSecretKey(true)}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-3"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 0 1121 9z"
            />
          </svg>
          <span>Authenticate with Secret Key</span>
        </button>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenBunker Popup URL
            </label>
            <input
              type="url"
              value={openBunkerUrl}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm cursor-not-allowed"
              placeholder="Configured via environment variable"
            />
            <p className="text-xs text-gray-500 mt-1">
              Configure via VITE_OPENBUNKER_POPUP_URL environment variable
            </p>
          </div>

          <OpenBunkerAuthButton
            onClick={async () => {
              await configureBunkerConnectionWithNostrConnect();
              navigate('/dashboard');
            }}
            disabled={!!popup}
            isLoading={!!popup}
            text="Authenticate with NostrConnect"
          />
          <OpenBunkerAuthButton
            onClick={async () => {
              await configureBunkerConnectionWithBunkerToken();
              navigate('/dashboard');
            }}
            disabled={!!popup}
            isLoading={!!popup}
            text="Authenticate with OB Bunker Token"
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
        <p className="text-sm text-gray-500">
          <strong>Secret Key:</strong> Use your existing Nostr secret key for
          direct authentication
        </p>
        <p className="text-sm text-gray-500 mt-1">
          <strong>OpenBunker:</strong> Use Discord OAuth to get a new Nostr key
        </p>
      </div>
    </div>
  );
};

// Simple secret key login component
const SecretKeyLogin: React.FC = () => {
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const { setLocalSecretKey } = useNostr();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey.trim()) {
      setError('Please enter a secret key');
      return;
    }

    try {
      // Convert hex string to Uint8Array
      const keyBytes = new Uint8Array(
        secretKey.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      );
      setLocalSecretKey(keyBytes);
      navigate('/dashboard');
    } catch {
      setError('Invalid secret key format');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nostr Secret Key
        </label>
        <input
          type="password"
          value={secretKey}
          onChange={e => setSecretKey(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Enter your Nostr secret key"
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      <button
        type="submit"
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Connect
      </button>
    </form>
  );
};
