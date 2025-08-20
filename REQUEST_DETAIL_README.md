# Request Detail Screen

This document describes the request detail screen functionality that shows the note's content and the whole thread following NIP-10 specifications.

## Features

### 1. Request Display

- Shows the main request content (subject, message, author, timestamp)
- Displays metadata like request ID and author public key
- Handles both JSON-formatted community requests and plain text notes

### 2. Thread Management

- **NIP-10 Compliance**: Implements thread handling according to [NIP-10](https://github.com/nostr-protocol/nips/blob/master/10.md)
- **Event Tag Analysis**: Analyzes `#e` tags to determine reply relationships
- **Nested Replies**: Supports multiple levels of nested replies with proper indentation
- **Chronological Ordering**: Displays replies in chronological order

### 3. Reply Functionality

- **Reply Form**: Allows authenticated users to add replies to requests
- **Real-time Updates**: Automatically refreshes the thread when new replies are added
- **Proper Tagging**: Creates replies with correct NIP-10 event tags

## Technical Implementation

### Thread Building Logic

The thread building follows NIP-10 specifications:

1. **Root Event**: The main request is identified as the root (level 0)
2. **Direct Replies**: Events with `#e` tags referencing the root are level 1
3. **Nested Replies**: Events with multiple `#e` tags can be level 2+ for replies to replies

```typescript
// Example of how thread levels are determined
const eventTags = reply.tags.filter(tag => tag[0] === 'e');
let level = 1; // Default level for direct replies

if (eventTags.length > 1) {
  // Check if this is a reply to another reply
  const replyToEventId = eventTags[1]?.[1]; // Second 'e' tag
  if (replyToEventId && replyToEventId !== requestId) {
    level = 2; // This is a reply to another reply
  }
}
```

### Event Tag Structure

Replies are created with proper NIP-10 tags:

```typescript
const replyEvent: Event = {
  kind: 1, // Text note
  content: message,
  tags: [
    ['e', requestId, '', 'root'], // Reference to the root request
    ['p', userPublicKey], // Reference to the author
  ],
  // ... other fields
};
```

### Data Fetching

The component fetches events using multiple subscriptions:

1. **Main Request**: Fetches the specific request by ID
2. **Thread Events**: Fetches all events that reference the request
3. **Related Events**: Fetches events that the request references

## File Structure

```
src/
├── pages/
│   └── RequestDetailPage.tsx    # Main detail page component
├── components/
│   └── ReplyForm.tsx            # Reply form component
└── App.tsx                      # Routing configuration
```

## Routing

The request detail page is accessible at:

```
/requests/:requestId
```

Where `:requestId` is the Nostr event ID of the request.

## Usage

1. **Viewing Requests**: Click "View Details" on any request card
2. **Reading Threads**: Scroll through the thread to see all replies
3. **Adding Replies**: Use the reply form at the bottom of the page
4. **Navigation**: Use the back button to return to the requests list

## Dependencies

- **React Router**: For navigation and URL parameters
- **Nostr Tools**: For event handling and NIP-10 compliance
- **Tailwind CSS**: For styling and responsive design

## Future Enhancements

- **Real-time Updates**: WebSocket integration for live thread updates
- **Advanced Threading**: Support for deeper nested reply structures
- **Moderation Tools**: Admin controls for managing threads
- **Search & Filter**: Advanced search within threads
- **Media Support**: Support for images, videos, and other media in replies

## Troubleshooting

### Event Signing Errors

If you encounter the error `"invalid: unexpected id size"`, this typically means:

1. **Missing Event Signing**: Events must be properly signed before sending
2. **Bunker Connection**: Ensure your bunker connection is active
3. **Authentication**: Verify you're properly authenticated

The ReplyForm component now properly handles event signing using `bunkerSigner.signEvent()` to avoid this error.

### Reply Persistence Fix

The issue where creating a comment would erase all replies has been fixed by implementing a dual-event system:

1. **Local Event Cache**: New replies are immediately added to a local event cache for instant UI updates
2. **Subscription Persistence**: Active subscriptions continue to work without clearing existing events
3. **Deduplication**: Events from both sources are merged and deduplicated to prevent conflicts

```typescript
// Local events are combined with global events
const allEvents = [...events, ...localEvents];
const uniqueEvents = allEvents.filter(
  (event, index, arr) => arr.findIndex(e => e.id === event.id) === index
);
```

This ensures that users see their replies immediately while maintaining synchronization with the Nostr network.

### Common Issues

- **"Bunker connection is required"**: Reconnect your bunker through the login page
- **"Failed to send reply"**: Check your internet connection and bunker status
- **Thread not updating**: Try refreshing the page or clearing browser cache
- **Replies disappearing when adding new ones**: Fixed by implementing local event caching that immediately shows new replies while waiting for subscription updates
