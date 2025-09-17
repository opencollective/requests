import React, { useState } from 'react';
import { useNostr } from '../hooks/useNostr';
import { type UnsignedEvent } from 'nostr-tools';
import type { RequestFormData } from '../types/RequestFormSchema';
import { useNavigate } from 'react-router-dom';

interface ReplyFormProps {
  requestId: string;
  onReplyAdded: (newEvent?: UnsignedEvent) => void;
}

export const ReplyForm: React.FC<ReplyFormProps> = ({
  requestId,
  onReplyAdded,
}) => {
  const {
    userPublicKey,
    submitEvent,
    submitToOpenBunker,
    isOBAPISubmitting,
    error: openbunkerError,
  } = useNostr();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    console.log('userPublicKey', userPublicKey);
    try {
      if (userPublicKey) {
        // User is authenticated, proceed with normal flow
        const replyEvent: UnsignedEvent = {
          kind: 1,
          content: message,
          tags: [
            ['e', requestId, '', 'root'], // Reference to the root request
            // ['p', ], // Reference to the author
          ],
          created_at: Math.floor(Date.now() / 1000),
          pubkey: userPublicKey,
        };
        // Use submitEvent to add to queue instead of sending immediately
        submitEvent(replyEvent);

        // Clear form and notify parent with the new event
        setMessage('');
        onReplyAdded(replyEvent);
      } else {
        // User is not authenticated, need to collect email and submit to OpenBunker
        if (!showEmailForm) {
          setShowEmailForm(true);
          setIsSubmitting(false);
          return;
        }

        if (!email.trim()) {
          setError('Please enter your email address');
          setIsSubmitting(false);
          return;
        }

        // Create reply data for OpenBunker submission
        const replyData: RequestFormData = {
          name: email.trim(),
          email: email.trim(),
          subject: `Reply to request ${requestId}`,
          message: message.trim(),
        };

        const replyEvent: UnsignedEvent = {
          kind: 1,
          content: message,
          tags: [
            ['e', requestId, '', 'root'], // Reference to the root request
            // FIXME need to get those pubkeys
            // ['p', userPublicKey], // Reference to the author
          ],
          created_at: Math.floor(Date.now() / 1000),
          pubkey: userPublicKey || '',
        };

        // Add to event queue for later processing
        const newQueueItemId = submitEvent(replyEvent);

        // This will submit to OpenBunker and handle authentication if needed
        submitToOpenBunker(replyData);
        console.log('navigating to queue item page');
        await navigate(`/queue/${newQueueItemId}?backOnCompleted=true`);
        // Clear form
        setMessage('');
        setEmail('');
        setShowEmailForm(false);
        onReplyAdded(replyEvent); // Notify parent with the new event
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to send reply. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="text-lg font-medium text-gray-900 mb-3">Add a Reply</h4>

      {/* Main reply form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your reply..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            disabled={isSubmitting || isOBAPISubmitting}
          />
        </div>

        {/* Email form for unauthenticated users */}
        {showEmailForm && !userPublicKey && (
          <div className="mb-3 space-y-3">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting || isOBAPISubmitting}
                required
              />
            </div>
          </div>
        )}

        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
        {openbunkerError && (
          <div className="mb-3 text-red-600 text-sm">{openbunkerError}</div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || isOBAPISubmitting || !message.trim()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || isOBAPISubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isOBAPISubmitting ? 'Submitting...' : 'Sending...'}
              </>
            ) : showEmailForm && !userPublicKey ? (
              'Submit Reply'
            ) : (
              'Send Reply'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
