import React, { useEffect } from 'react';
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

  useEffect(() => {
    if (!queueItemId) {
      navigate('/dashboard');
      return;
    }

    const queueItem = getQueueItemById(queueItemId);
    if (!queueItem) {
      // Queue item not found, redirect to dashboard
      navigate('/dashboard');
      return;
    }
  }, [queueItemId, getQueueItemById, navigate]);

  if (!queueItemId) {
    return null;
  }

  const queueItem = getQueueItemById(queueItemId);

  if (!queueItem) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <QueueItemDisplay
            queueItemId={queueItemId}
            onCompleted={eventId =>
              backOnCompleted ? navigate(-1) : navigate(`/requests/${eventId}`)
            }
            onFailed={() => navigate('/dashboard')}
          />
        </div>
      </div>
    </div>
  );
};

export default QueueItemPage;
