import { useState, useCallback } from 'react';
import type { Event, UnsignedEvent } from 'nostr-tools';
import type {
  EventQueueItem,
  EventQueueState,
  ProcessedEventQueueItem,
} from '../contexts/NostrContextTypes';

export function useEventQueue(
  sendEvent?: (event: UnsignedEvent) => Promise<Event>
): EventQueueState {
  const [queue, setQueue] = useState<EventQueueItem[]>([]);
  const [processedQueue, setProcessedQueue] = useState<
    ProcessedEventQueueItem[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addToQueue = useCallback((event: UnsignedEvent) => {
    const queueItem: EventQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event,
      timestamp: Date.now(),
      status: 'pending',
    };

    setQueue(prevQueue => [...prevQueue, queueItem]);
    return queueItem.id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prevQueue => prevQueue.filter(item => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue(prevQueue => prevQueue.filter(item => item.status === 'pending'));
  }, []);

  const getQueueItemById = useCallback(
    (id: string) => {
      const activeItem = queue.find(item => item.id === id);
      const processedItem = processedQueue.find(item => item.id === id);
      return activeItem || processedItem;
    },
    [queue, processedQueue]
  );

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
          const event = await sendEvent(item.event);

          // Mark as completed and move to processed queue
          const completedItem = {
            ...item,
            status: 'completed' as const,
            event,
          };

          setQueue(prevQueue =>
            prevQueue.filter(qItem => qItem.id !== item.id)
          );

          setProcessedQueue(prevProcessedQueue => [
            ...prevProcessedQueue,
            completedItem,
          ]);
        } catch (error) {
          // Mark as failed
          console.error(
            error instanceof Error ? error.message : 'Unknown error'
          );
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
    processedQueue,
    isProcessing,
    addToQueue,
    removeFromQueue,
    clearQueue,
    getQueueItemById,
    processQueue,
  };
}
