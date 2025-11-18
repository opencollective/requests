import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useNostr } from '../hooks/useNostr';
import type { Event } from 'nostr-tools';

export const EventRawDataPage: React.FC = () => {
  const { nevent } = useParams<{ nevent: string }>();
  const navigate = useNavigate();
  const { pool, relays, isConnected } = useNostr();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decodedEventId, setDecodedEventId] = useState<string | null>(null);
  const [relayHints, setRelayHints] = useState<string[]>([]);

  useEffect(() => {
    if (!nevent || !isConnected || !pool || !relays) {
      if (!isConnected) {
        setIsLoading(false);
        return;
      }
      if (!nevent) {
        setError('Missing nevent parameter');
        setIsLoading(false);
        return;
      }
      return;
    }

    const fetchEvent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Decode URL encoding if present (React Router should handle this, but be safe)
        const decodedNevent = decodeURIComponent(nevent);

        // Decode the NIP-19 nevent reference
        if (!decodedNevent.startsWith('nevent')) {
          setError('Invalid nevent format: must start with "nevent"');
          setIsLoading(false);
          return;
        }

        const decoded = nip19.decode(decodedNevent);

        if (decoded.type !== 'nevent') {
          setError(
            `Invalid NIP-19 type: expected "nevent", got "${decoded.type}"`
          );
          setIsLoading(false);
          return;
        }

        const eventId = decoded.data.id;
        const hints = decoded.data.relays || [];

        setDecodedEventId(eventId);
        setRelayHints(hints);

        // Use relay hints if available, otherwise use default relays
        const relaysToUse = hints.length > 0 ? hints : relays;

        // Fetch the event
        const events = await pool.querySync(relaysToUse, {
          ids: [eventId],
          limit: 1,
        });

        if (events.length === 0) {
          setError(`Event not found. Tried relays: ${relaysToUse.join(', ')}`);
          setIsLoading(false);
          return;
        }

        setEvent(events[0]);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to decode or fetch event';
        setError(errorMessage);
        // eslint-disable-next-line no-console
        console.error('Error fetching event:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [nevent, isConnected, pool, relays]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Connecting to Nostr relays...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading event data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <h3 className="font-semibold mb-2">Error</h3>
              <p>{error}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/communities')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Communities
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Event not found
              </h3>
              <p className="text-gray-600 mb-4">
                The event could not be found on the relays.
              </p>
              <button
                type="button"
                onClick={() => navigate('/communities')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Back to Communities
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              type="button"
              onClick={() => navigate('/communities')}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              ← Back to Communities
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Event Raw Data</h1>
          </div>

          {/* Event Info Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Event Information
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-start">
                <span className="font-medium text-gray-700 w-32">
                  Event ID:
                </span>
                <span className="text-gray-600 break-all font-mono">
                  {event.id}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-medium text-gray-700 w-32">Kind:</span>
                <span className="text-gray-600">{event.kind}</span>
              </div>
              <div className="flex items-start">
                <span className="font-medium text-gray-700 w-32">Pubkey:</span>
                <span className="text-gray-600 break-all font-mono">
                  {event.pubkey}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-medium text-gray-700 w-32">
                  Created At:
                </span>
                <span className="text-gray-600">
                  {new Date(event.created_at * 1000).toLocaleString()}
                </span>
              </div>
              {decodedEventId && (
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 w-32">
                    Decoded ID:
                  </span>
                  <span className="text-gray-600 break-all font-mono">
                    {decodedEventId}
                  </span>
                </div>
              )}
              {relayHints.length > 0 && (
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 w-32">
                    Relay Hints:
                  </span>
                  <span className="text-gray-600">{relayHints.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Raw JSON */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Raw Event JSON
              </h2>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(event, null, 2));
                }}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                Copy JSON
              </button>
            </div>
            <pre className="bg-gray-50 rounded-md p-4 overflow-x-auto text-sm font-mono">
              {JSON.stringify(event, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
