import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useNostr } from '../hooks/useNostr';
import { buildApiUrl, OPENBUNKER_CONFIG } from '../config/openbunker';

interface VerificationResponse {
  success: boolean;
  message: string;
  bunkerConnectionToken?: string;
  tokenId?: string;
  error?: string;
}

export const LoginOptions: React.FC = () => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [bunkerToken, setBunkerToken] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [nsecInput, setNsecInput] = useState('');
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [advancedMessage, setAdvancedMessage] = useState('');

  // Get scope from environment variable
  const scope = import.meta.env.VITE_OPENBUNKER_SCOPE || 'community-requests';

  const { handleBunkerConnectionToken, setLocalSecretKey } = useNostr();
  const navigate = useNavigate();

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(
        buildApiUrl(OPENBUNKER_CONFIG.ENDPOINTS.UNAUTHENTICATED_TOKEN),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            scope,
          }),
        }
      );

      const data: VerificationResponse = await response.json();

      if (data.success) {
        setBunkerToken(data.bunkerConnectionToken || '');
        setMessage(data.message);
        setStep('verify');

        // Store the bunker connection token for verification
        if (data.bunkerConnectionToken) {
          setBunkerToken(data.bunkerConnectionToken);
        }
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNsecLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdvancedLoading(true);
    setAdvancedMessage('');

    try {
      const trimmed = nsecInput.trim();

      if (!trimmed) {
        throw new Error('Please enter your nsec secret key');
      }

      if (!trimmed.startsWith('nsec1')) {
        throw new Error('Secret key must start with "nsec1"');
      }

      const decoded = nip19.decode(trimmed);

      if (decoded.type !== 'nsec') {
        throw new Error(`Invalid NIP-19 type: ${decoded.type}`);
      }

      const secretKeyArray =
        decoded.data instanceof Uint8Array
          ? decoded.data
          : new Uint8Array(decoded.data as number[]);

      await setLocalSecretKey(secretKeyArray);

      setAdvancedMessage('Secret key saved! Redirecting...');
      setNsecInput('');

      setTimeout(() => {
        navigate('/communities');
      }, 1000);
    } catch (err) {
      setAdvancedMessage(
        `nsec login failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setAdvancedLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!bunkerToken) {
        throw new Error('No bunker connection token available');
      }

      // Build the bunker connection URL with the verification code as secret
      const url = new URL(bunkerToken);
      url.searchParams.set('secret', verificationCode);
      const bunkerConnectionTokenWithSecret = url.toString();

      // Generate a local secret key and handle the bunker connection
      const { generateSecretKey } = await import('nostr-tools');
      const localSecretKey = generateSecretKey();

      // Use the NostrProvider to handle the bunker connection
      await handleBunkerConnectionToken(
        bunkerConnectionTokenWithSecret,
        localSecretKey
      );

      setMessage('Authentication successful! Redirecting...');

      // Redirect after successful authentication
      setTimeout(() => {
        navigate('/communities');
      }, 1500);
    } catch (authError) {
      setMessage(
        `Authentication failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setVerificationCode('');
    setStep('request');
    setMessage('');
    setBunkerToken('');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Email Authentication
        </h2>
        <p className="text-gray-600">
          Authenticate using your email address and receive a verification code
        </p>
        <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
          Community: {scope}
        </div>
      </div>

      {step === 'request' ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
              placeholder="Enter your email address"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Sending Code...</span>
              </>
            ) : (
              <>
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
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span>Send Verification Code</span>
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-400 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-green-800 font-medium">
                Code sent to {email}
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="verificationCode"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              6-Digit Verification Code
            </label>
            <input
              type="text"
              id="verificationCode"
              value={verificationCode}
              onChange={e =>
                setVerificationCode(
                  e.target.value.replace(/\D/g, '').slice(0, 6)
                )
              }
              required
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-2xl font-mono tracking-widest text-gray-900 bg-white"
              placeholder="123456"
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
            >
              Start Over
            </button>
            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Verify Code</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.includes('Error') || message.includes('error')
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-start">
            <svg
              className={`w-5 h-5 mr-2 mt-0.5 ${
                message.includes('Error') || message.includes('error')
                  ? 'text-red-400'
                  : 'text-blue-400'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  message.includes('Error') || message.includes('error')
                    ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    : 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                }
              />
            </svg>
            <div>
              <p className="font-medium">{message}</p>
              {bunkerToken && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">
                    View Bunker Connection Token
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded border max-w-full">
                    <code className="text-xs break-all whitespace-normal font-mono text-gray-700 block">
                      {bunkerToken}
                    </code>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(prev => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span>Advanced options</span>
          <svg
            className={`w-5 h-5 transform transition-transform text-gray-500 ${
              showAdvanced ? 'rotate-180' : ''
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

        {showAdvanced && (
          <div className="pt-2 px-3 pb-3 space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Sign in with nsec
              </h3>
              <p className="text-xs text-gray-500">
                Paste your Nostr secret key (nsec) to sign in locally. Keep this
                key private.
              </p>
            </div>

            <form onSubmit={handleNsecLogin} className="space-y-3">
              <div>
                <label
                  htmlFor="nsec"
                  className="block text-sm font-medium text-gray-600 mb-2"
                >
                  Nostr Secret Key (nsec)
                </label>
                <textarea
                  id="nsec"
                  value={nsecInput}
                  onChange={e => setNsecInput(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white font-mono text-sm"
                  placeholder="nsec1..."
                />
              </div>

              <button
                type="submit"
                disabled={advancedLoading || !nsecInput.trim()}
                className="w-full bg-gray-900 text-white py-2.5 px-4 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {advancedLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
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
                        d="M5 12h14m-7-7l7 7-7 7"
                      />
                    </svg>
                    <span>Use nsec</span>
                  </>
                )}
              </button>
            </form>

            {advancedMessage && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  advancedMessage.toLowerCase().includes('failed')
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-green-50 text-green-800 border border-green-200'
                }`}
              >
                {advancedMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
