import React, { useState } from 'react';
import { useNostr } from '../hooks/useNostr';
import { type UnsignedEvent } from 'nostr-tools';
interface ReplyFormProps {
  requestId: string;
  onReplyAdded: (newEvent?: UnsignedEvent) => void;
}

export const ReplyForm: React.FC<ReplyFormProps> = ({
  requestId,
  onReplyAdded,
}) => {
  const { isAuthenticated, userPublicKey, submitEvent } = useNostr();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (!isAuthenticated || !userPublicKey) {
      setError('You must be authenticated to reply');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create and sign a reply event (kind 1 - text note)
      const replyEvent = {
        kind: 1,
        content: message,
        tags: [
          ['e', requestId, '', 'root'], // Reference to the root request
          ['p', userPublicKey], // Reference to the author
        ],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: userPublicKey,
      };

      // Use submitEvent to add to queue instead of sending immediately
      submitEvent(replyEvent);

      // Clear form and notify parent with the new event
      setMessage('');
      onReplyAdded(replyEvent);
    } catch {
      setError('Failed to send reply. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="text-lg font-medium text-gray-900 mb-3">Add a Reply</h4>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your reply..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              'Send Reply'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
