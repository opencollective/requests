# Event Queue System

This document describes the new queue-based event submission system implemented in the community-requests application.

## Overview

Instead of immediately sending events to the Nostr network, events are now added to a queue and processed when a signer becomes available (either through a bunker connection or local secret key).

## Key Changes

### 1. New `submitEvent` Method

- **Before**: Events were sent immediately using `sendEvent(event)`
- **After**: Events are queued using `submitEvent(event)`

```typescript
// Old way
await sendEvent(requestEvent);

// New way
submitEvent(requestEvent);
```

### 2. Event Queue State

The queue tracks events with the following statuses:

- **pending**: Event is waiting to be processed
- **processing**: Event is currently being sent
- **completed**: Event was successfully sent
- **failed**: Event failed to send (with error details)

### 3. Queue Header Component

A collapsible header (`EventQueueHeader`) displays:

- Current queue status with color-coded badges
- Expandable list of all queued events
- Individual event details and status
- Clear button to remove completed/failed events
- Remove button for pending events

## How It Works

1. **Event Submission**: When `submitEvent(event)` is called, the event is added to the queue with "pending" status
2. **Queue Processing**: The queue automatically processes pending events when:
   - A user becomes authenticated (bunker connects or secret key is available)
   - The `processQueue()` method is called manually
3. **Event Sending**: Pending events are sent using the available signer (bunker or local)
4. **Status Updates**: Event status is updated based on success/failure

## Benefits

- **Offline Support**: Events can be queued when offline and sent when connection is restored
- **Better UX**: Users see immediate feedback that their event is queued
- **Error Handling**: Failed events remain visible with error details
- **Batch Processing**: Multiple events can be processed efficiently
- **Authentication Flexibility**: Events wait for authentication instead of failing immediately

## Components Updated

- `RequestPage.tsx`: Now uses `submitEvent` for community requests
- `ReplyForm.tsx`: Now uses `submitEvent` for replies
- `NostrProvider.tsx`: Integrates queue system with authentication
- `EventQueueHeader.tsx`: New component for queue visualization

## Queue Management

### Adding Events

```typescript
submitEvent(event); // Adds to queue
```

### Processing Queue

```typescript
await processQueue(); // Processes all pending events
```

### Clearing Queue

```typescript
clearQueue(); // Removes completed/failed events
removeFromQueue(id); // Removes specific pending event
```

## Configuration

The queue system is automatically enabled and requires no additional configuration. It integrates seamlessly with the existing authentication system.

## Future Enhancements

- Persistent queue storage (localStorage/IndexedDB)
- Retry mechanism for failed events
- Priority-based queue ordering
- Queue size limits and cleanup policies
