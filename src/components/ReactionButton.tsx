import React, { useState, useEffect, useRef } from 'react';
import { useNostr } from '../hooks/useNostr';
import {
  createReactionEvent,
  createDeletionEvent,
  REACTION_EMOJIS,
  type ReactionEmoji,
  hasUserReacted,
  getReactionsForRequest,
  getUserReactionEvent,
} from '../utils/reactionUtils';
import type { Event } from 'nostr-tools';

interface ReactionButtonProps {
  emoji: ReactionEmoji;
  count: number;
  requestId: string;
  requestPubkey: string;
  allEvents: Event[]; // All events including deletion events (kind 5)
  userPublicKey: string | null;
  onReactionAdded: () => void;
}

export const ReactionButton: React.FC<ReactionButtonProps> = ({
  emoji,
  count,
  requestId,
  requestPubkey,
  allEvents,
  userPublicKey,
  onReactionAdded,
}) => {
  const { bunkerSigner, pool, relays } = useNostr();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use allEvents to properly check if user has reacted (accounting for deletions)
  const userHasReacted = userPublicKey
    ? hasUserReacted(allEvents, requestId, userPublicKey, emoji)
    : false;

  const handleClick = async () => {
    if (!userPublicKey || !bunkerSigner || !pool || !relays) {
      setError('Please log in to react');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Check if user already reacted with this emoji (use allEvents to account for deletions)
      const existingReaction = getUserReactionEvent(
        allEvents,
        requestId,
        userPublicKey,
        emoji
      );

      if (existingReaction) {
        // User already reacted with this emoji - delete the reaction
        const deletionEvent = createDeletionEvent(
          existingReaction.id,
          userPublicKey
        );

        // Sign the deletion event using the bunker signer
        const signedDeletionEvent = await bunkerSigner.signEvent(deletionEvent);

        // Publish the signed deletion event
        await Promise.all(pool.publish(relays, signedDeletionEvent));
      } else {
        // User hasn't reacted with this emoji - create a new reaction
        const unsignedEvent = createReactionEvent(
          requestId,
          requestPubkey,
          emoji,
          userPublicKey
        );

        // Sign the event using the bunker signer
        const signedEvent = await bunkerSigner.signEvent(unsignedEvent);

        // Publish the signed reaction event
        await pool.publish(relays, signedEvent);
      }

      // Notify parent to refetch
      onReactionAdded();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to toggle reaction'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSubmitting || !userPublicKey}
      className={`
        flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors
        ${
          userHasReacted
            ? 'bg-blue-100 border-blue-300 text-blue-700'
            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
        }
        ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${!userPublicKey ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      title={
        !userPublicKey
          ? 'Log in to react'
          : userHasReacted
            ? `You reacted with ${emoji}`
            : `React with ${emoji}`
      }
    >
      <span className="text-lg">{emoji}</span>
      <span className="text-sm font-medium">{count}</span>
      {error && (
        <span className="text-xs text-red-600 ml-1" title={error}>
          ⚠️
        </span>
      )}
    </button>
  );
};

interface ReactionsDisplayProps {
  requestId: string;
  requestPubkey: string;
  allEvents: Event[]; // All events including deletion events (kind 5)
  userPublicKey: string | null;
  onReactionAdded: () => void;
}

export const ReactionsDisplay: React.FC<ReactionsDisplayProps> = ({
  requestId,
  requestPubkey,
  allEvents,
  userPublicKey,
  onReactionAdded,
}) => {
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const { bunkerSigner, pool, relays } = useNostr();

  // Use allEvents to properly filter out deleted reactions
  const reactionData = getReactionsForRequest(allEvents, requestId);

  // Filter to only show reactions that have existing reactions (count > 0)
  const existingReactions = reactionData.filter(r => r.count > 0);

  // All available emoji options
  const allEmojis: ReactionEmoji[] = [
    REACTION_EMOJIS.HEART,
    REACTION_EMOJIS.LIKE,
    REACTION_EMOJIS.CROSS,
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (selectorRef.current && !selectorRef.current.contains(target)) {
        setShowEmojiSelector(false);
      }
    };

    if (showEmojiSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showEmojiSelector]);

  const handleEmojiSelect = async (emoji: ReactionEmoji) => {
    setShowEmojiSelector(false);
    if (!userPublicKey || !bunkerSigner || !pool || !relays) return;

    try {
      const existingReaction = getUserReactionEvent(
        allEvents,
        requestId,
        userPublicKey,
        emoji
      );

      if (existingReaction) {
        const deletionEvent = createDeletionEvent(
          existingReaction.id,
          userPublicKey
        );
        const signedDeletionEvent = await bunkerSigner.signEvent(deletionEvent);
        await Promise.all(pool.publish(relays, signedDeletionEvent));
      } else {
        const unsignedEvent = createReactionEvent(
          requestId,
          requestPubkey,
          emoji,
          userPublicKey
        );
        const signedEvent = await bunkerSigner.signEvent(unsignedEvent);
        await pool.publish(relays, signedEvent);
      }

      onReactionAdded();
    } catch {
      // Error handling - could show a toast notification here
      // For now, silently fail and let the UI update on next refetch
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Show existing reaction buttons (only if count > 0) */}
      {existingReactions.map(reaction => {
        // Ensure emoji is a valid ReactionEmoji
        const emoji = reaction.emoji as ReactionEmoji;
        if (
          emoji !== REACTION_EMOJIS.HEART &&
          emoji !== REACTION_EMOJIS.LIKE &&
          emoji !== REACTION_EMOJIS.CROSS
        ) {
          return null;
        }
        return (
          <ReactionButton
            key={emoji}
            emoji={emoji}
            count={reaction.count}
            requestId={requestId}
            requestPubkey={requestPubkey}
            allEvents={allEvents}
            userPublicKey={userPublicKey}
            onReactionAdded={onReactionAdded}
          />
        );
      })}

      {/* React button with emoji selector dropdown */}
      {userPublicKey && (
        <div className="relative reaction-selector-container" ref={selectorRef}>
          <button
            type="button"
            onClick={() => setShowEmojiSelector(!showEmojiSelector)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
            title="Add reaction"
          >
            <span className="text-lg">😊</span>
            <span className="text-sm font-medium">React</span>
          </button>

          {showEmojiSelector && (
            <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-20 flex gap-2">
              {allEmojis.map(emoji => {
                const userHasReacted = hasUserReacted(
                  allEvents,
                  requestId,
                  userPublicKey,
                  emoji
                );
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiSelect(emoji)}
                    className={`
                      text-2xl p-2 rounded hover:bg-gray-100 transition-colors
                      ${userHasReacted ? 'bg-blue-50' : ''}
                    `}
                    title={
                      userHasReacted
                        ? `Remove ${emoji} reaction`
                        : `React with ${emoji}`
                    }
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
