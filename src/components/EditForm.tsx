import React, { useState } from 'react';
import { useNostr } from '../hooks/useNostr';
import { type Event } from 'nostr-tools';

interface EditFormProps {
  originalContent: string;
  originalEvent: Event;
  originalTitle?: string; // Optional title for request events
  onEditSubmitted: () => void;
  onCancel: () => void;
}

export const EditForm: React.FC<EditFormProps> = ({
  originalContent,
  originalEvent,
  originalTitle,
  onEditSubmitted,
  onCancel,
}) => {
  const { pool, relays, bunkerSigner } = useNostr();
  const [editedContent, setEditedContent] = useState(originalContent);
  const [editedTitle, setEditedTitle] = useState(originalTitle || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if this is a request event (kind 1111) that should have a title
  const isRequestEvent = originalEvent.kind === 1111;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editedContent.trim()) {
      setError('Content cannot be empty');
      return;
    }

    const contentChanged = editedContent.trim() !== originalContent.trim();
    const titleChanged =
      isRequestEvent && editedTitle.trim() !== (originalTitle || '').trim();

    if (!contentChanged && !titleChanged) {
      setError('No changes made');
      return;
    }

    if (!pool || !relays || !bunkerSigner) {
      setError('Not connected to Nostr or missing bunker signer');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { createEditedEvent } = await import('../utils/editEventUtils');
      const { getCommunityATagFromEnv } = await import(
        '../utils/communityUtils'
      );

      // Create the edited event (replaceable event with same kind, d tag, pubkey)
      const unsignedEvent = createEditedEvent(
        originalEvent,
        editedContent.trim(),
        {
          communityATag: getCommunityATagFromEnv(),
          preserveTags: true,
          newTitle:
            isRequestEvent && titleChanged ? editedTitle.trim() : undefined,
        }
      );

      // Sign the event using the bunker signer
      const signedEvent = await bunkerSigner.signEvent(unsignedEvent);

      // Publish the signed edited event
      await pool.publish(relays, signedEvent);

      // Notify parent component
      onEditSubmitted();
    } catch (err) {
      console.error('Error creating edited event:', err);
      setError('Failed to save edit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      {isRequestEvent && (
        <div className="mb-4">
          <label
            htmlFor="edit-title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title
          </label>
          <input
            id="edit-title"
            type="text"
            value={editedTitle}
            onChange={e => setEditedTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Edit title..."
            disabled={isSubmitting}
          />
        </div>
      )}
      <div className="mb-4">
        <label
          htmlFor="edit-content"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Content
        </label>
        <textarea
          id="edit-content"
          value={editedContent}
          onChange={e => setEditedContent(e.target.value)}
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Edit content..."
          disabled={isSubmitting}
        />
      </div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || !editedContent.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Edit'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
