import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { QueueItemDisplay } from '../components/QueueItemDisplay';

const QueueItemPage: React.FC = () => {
  const { queueItemId } = useParams<{ queueItemId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Extract backOnCompleted from URL query parameters
  const backOnCompleted = searchParams.get('backOnCompleted') === 'true';
  const { getQueueItemById } = useNostr();

  // Call all hooks unconditionally before any early returns
  const queueItem = queueItemId ? getQueueItemById(queueItemId) : undefined;
  const communityBasePath = useMemo(() => {
    if (!queueItem) {
      return null;
    }
    const tags = queueItem.event?.tags ?? [];
    const communityTag =
      tags.find(tag => tag[0] === 'A' || tag[0] === 'a')?.[1] || '';
    const [, communityPubkey, communityIdentifier] = communityTag.split(':');
    if (!communityPubkey || !communityIdentifier) {
      return null;
    }
    const communityId = `${communityPubkey}:${communityIdentifier}`;
    return `/community/${encodeURIComponent(communityId)}`;
  }, [queueItem]);

  useEffect(() => {
    if (!queueItemId) {
      navigate('/communities');
      return;
    }

    if (!queueItem) {
      // Queue item not found, redirect to dashboard
      navigate('/communities');
      return;
    }
  }, [queueItemId, queueItem, navigate]);

  if (!queueItemId || !queueItem) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <QueueItemDisplay
            queueItemId={queueItemId}
            onCompleted={eventId =>
              backOnCompleted
                ? navigate(-1)
                : communityBasePath
                  ? navigate(`${communityBasePath}/requests/${eventId}`)
                  : navigate('/communities')
            }
            onFailed={() =>
              communityBasePath
                ? navigate(`${communityBasePath}/dashboard`)
                : navigate('/communities')
            }
          />
        </div>
      </div>
    </div>
  );
};

export default QueueItemPage;
