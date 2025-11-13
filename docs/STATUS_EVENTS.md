# Status Events (Kind 30078)

This document describes the implementation of status events with kind 30078, a new event type designed for tracking request status in the Nostr protocol.

## Overview

Status events (kind 30078) are a new event type that allows for:

- **Status Tracking**: Events include a `status` tag for tracking request states
- **Request References**: Events reference original requests via `d` tags
- **Community Integration**: Events can be associated with communities via `a` tags

## Event Structure

```typescript
interface StatusEvent extends UnsignedEvent {
  kind: 30078;
  tags: Array<
    | ['d', string] // Event ID of the original request being referenced
    | ['status', string] // Status of the referenced request
    | ['a', string] // Community reference (optional)
  >;
}
```

## Required Tags

- **`d`**: Event ID of the original request being referenced (required)
- **`status`**: Current status of the referenced request (required)

## Optional Tags

- **`a`**: Community reference tag (optional)

## Status Values

The `status` tag can contain various values depending on the use case:

- `pending` - Request is waiting for review
- `approved` - Request has been approved
- `rejected` - Request has been rejected
- `in-progress` - Request is being processed
- `completed` - Request has been completed
- `cancelled` - Request has been cancelled

## Usage Examples

### Creating a Status Event

```typescript
import { createStatusEvent } from './utils/statusEventUtils';

const statusEvent = createStatusEvent(
  'request-event-id-123', // requestId (used as d tag)
  'approved', // status
  'user-public-key', // userPublicKey
  {
    communityATag: '34550:community-pubkey:community-identifier',
  }
);
```

### Filtering Status Events

```typescript
import {
  createStatusEventFilter,
  createStatusEventByRequestIdFilter,
} from './utils/statusEventUtils';

// Filter by request ID (d tag)
const requestFilter = createStatusEventFilter('request-event-id-123');

// Filter by status
const statusFilter = createStatusEventFilter(undefined, 'approved');

// Filter by request ID specifically
const requestIdFilter = createStatusEventByRequestIdFilter(
  'request-event-id-123'
);
```

### Processing Status Events

```typescript
import { processStatusEvents } from './utils/statusEventUtils';

const processedEvents = processStatusEvents(events);
// Returns array of processed status event data with:
// - id, dTag (same as requestId), status
// - author, createdAt, timestamp, communityATag
```

## Utility Functions

### Creation Functions

- `createStatusEvent()` - Creates a new status event
- `createStatusEventFilter()` - Creates filters for querying status events
- `createStatusEventByRequestIdFilter()` - Creates filter for specific request ID (d tag)

### Processing Functions

- `processStatusEvents()` - Processes raw events into structured data
- `getLatestRequestStatus()` - Gets the latest status for a specific request
- `getStatusEventsForRequest()` - Gets all status events for a specific request

### Validation Functions

- `isValidStatusEvent()` - Validates if an event is a proper status event
- `extractStatusEventRequestId()` - Extracts the d tag (request ID) from an event
- `extractStatusEventStatus()` - Extracts the status from an event

## Integration with Community Requests

Status events are designed to work alongside the existing community request system:

1. **Request Creation**: Users create community requests (kind 1111)
2. **Status Updates**: Moderators or system create status events (kind 30078) to track status
3. **Status Queries**: Applications can query status events to get current request status
4. **History Tracking**: Multiple status events can track the status history of a request

## Benefits

- **Decoupled Status Tracking**: Status updates are separate from the original request
- **Addressable**: Events can be referenced by their d tag for easy lookup
- **Extensible**: Additional tags can be added for more metadata
- **Community Integration**: Works with existing community structures
- **Audit Trail**: Provides a complete history of status changes

## Future Enhancements

- **Status Transitions**: Define valid status transition rules
- **Role-based Updates**: Restrict who can create status updates
- **Automated Status Updates**: System-generated status changes
- **Rich Metadata**: Additional tags for more detailed tracking
