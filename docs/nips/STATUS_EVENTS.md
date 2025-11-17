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
