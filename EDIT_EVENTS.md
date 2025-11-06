# Edit Events (Kind 30079)

This document describes the implementation of edit events with kind 30079, a new event type designed for tracking edits to requests and comments in the Nostr protocol.

## Overview

Edit events (kind 30079) are a new event type that allows for:

- **Content Edits**: Events contain the new text content for edited requests or comments
- **Request/Comment References**: Events reference the original request or comment via `d` tags
- **Community Integration**: Events can be associated with communities via `a` tags

## Event Structure

```typescript
interface EditEvent extends UnsignedEvent {
  kind: 30079;
  tags: Array<
    | ['d', string] // Event ID of the original request or comment being edited
    | ['a', string] // Community reference
  >;
  content: string; // New text content for the request or comment
}
```

## Required Tags

- **`d`**: Event ID of the original request or comment being edited (required)

## Optional Tags

- **`a`**: Community reference tag (optional but recommended)

## Content

The `content` field contains the **new text** for the request or comment. This replaces the original content when the edit is applied.

## Usage Examples

### Creating an Edit Event

```typescript
import { createEditEvent } from './utils/editEventUtils';

const editEvent = createEditEvent(
  'original-request-event-id-123', // originalEventId (used as d tag)
  'This is the updated text content', // newContent
  'user-public-key', // userPublicKey
  {
    communityATag: '34550:community-pubkey:community-identifier',
  }
);
```

### Filtering Edit Events

```typescript
import {
  createEditEventFilter,
  createEditEventByOriginalIdFilter,
} from './utils/editEventUtils';

// Filter by original event ID (d tag)
const editFilter = createEditEventFilter('original-request-event-id-123');

// Filter by original event ID specifically
const originalIdFilter = createEditEventByOriginalIdFilter(
  'original-request-event-id-123'
);

// Filter by author
const authorFilter = createEditEventFilter(undefined, ['author-pubkey']);
```

### Processing Edit Events

```typescript
import {
  processEditEvents,
  getLatestEditForEvent,
} from './utils/editEventUtils';

const processedEdits = processEditEvents(events);
// Returns array of processed edit event data with:
// - id, dTag (same as editedEventId), content (new text)
// - author, createdAt, timestamp, communityATag

// Get the latest edit for a specific request or comment
const latestEdit = getLatestEditForEvent(events, 'original-event-id');
```

## Utility Functions

### Creation Functions

- `createEditEvent()` - Creates a new edit event
- `createEditEventFilter()` - Creates filters for querying edit events
- `createEditEventByOriginalIdFilter()` - Creates filter for specific original event ID (d tag)

### Processing Functions

- `processEditEvents()` - Processes raw events into structured data
- `getLatestEditForEvent()` - Gets the latest edit for a specific request or comment
- `getEditsForEvent()` - Gets all edits for a specific request or comment

### Validation Functions

- `isValidEditEvent()` - Validates if an event is a proper edit event
- `extractEditEventOriginalId()` - Extracts the d tag (original event ID) from an event

## Integration with Community Requests

Edit events are designed to work alongside the existing community request system:

1. **Request Creation**: Users create community requests (kind 1111) or comments (kind 1111)
2. **Content Edits**: Users create edit events (kind 30079) to update the text content
3. **Edit Queries**: Applications can query edit events to get the current edited content
4. **History Tracking**: Multiple edit events can track the edit history of a request or comment

## How It Works

1. When a user wants to edit a request or comment:
   - They create an EditEvent with the new text in the `content` field
   - The `d` tag references the original request or comment event ID
   - The `a` tag (optional) references the community

2. When displaying content:
   - Applications should fetch the original event first
   - Then check for edit events referencing that event (via `d` tag)
   - If edit events exist, use the latest one's `content` as the current text
   - The original event's content can be shown with a strikethrough or hidden entirely

3. Edit history:
   - Multiple edit events can exist for the same original event
   - Applications can display the full edit history by fetching all edit events with the same `d` tag

## Benefits

- **Decoupled Editing**: Edit updates are separate from the original request/comment
- **Addressable**: Events can be referenced by their d tag for easy lookup
- **Extensible**: Additional tags can be added for more metadata (e.g., edit reason, moderation flags)
- **Community Integration**: Works with existing community structures
- **Edit History**: Provides a complete history of content changes

## Future Enhancements

- **Edit Timestamps**: Display when content was edited
- **Edit Authors**: Track who made each edit
- **Edit Reasons**: Optional tag for explaining why content was edited
- **Moderation Integration**: Link edits to moderation actions
- **Conflict Resolution**: Handle cases where multiple edits occur simultaneously
