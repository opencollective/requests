import { useState, useCallback } from 'react';
import type { Event as NostrEvent } from 'nostr-tools';
import type {
  EventQueueItem,
  EventQueueState,
} from '../contexts/NostrContextTypes';

export function useEventQueue(
  sendEvent?: (event: NostrEvent) => Promise<void>
): EventQueueState {
  const [queue, setQueue] = useState<EventQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addToQueue = useCallback((event: NostrEvent) => {
    const queueItem: EventQueueItem = {
      id: `${event.id || Date.now()}-${Math.random()}`,
      event,
      timestamp: Date.now(),
      status: 'pending',
    };

    setQueue(prevQueue => [...prevQueue, queueItem]);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prevQueue => prevQueue.filter(item => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue(prevQueue => prevQueue.filter(item => item.status === 'pending'));
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessing || queue.length === 0 || !sendEvent) return;

    setIsProcessing(true);

    try {
      // Process all pending items in the queue
      const pendingItems = queue.filter(item => item.status === 'pending');

      for (const item of pendingItems) {
        // Mark as processing
        setQueue(prevQueue =>
          prevQueue.map(qItem =>
            qItem.id === item.id ? { ...qItem, status: 'processing' } : qItem
          )
        );

        try {
          // Actually send the event
          await sendEvent(item.event);

          // Mark as completed
          setQueue(prevQueue =>
            prevQueue.map(qItem =>
              qItem.id === item.id ? { ...qItem, status: 'completed' } : qItem
            )
          );
        } catch (error) {
          // Mark as failed
          setQueue(prevQueue =>
            prevQueue.map(qItem =>
              qItem.id === item.id
                ? {
                    ...qItem,
                    status: 'failed',
                    error:
                      error instanceof Error ? error.message : 'Unknown error',
                  }
                : qItem
            )
          );
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, queue, sendEvent]);

  return {
    queue,
    isProcessing,
    addToQueue,
    removeFromQueue,
    clearQueue,
    processQueue,
  };
}
