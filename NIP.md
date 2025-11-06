# NIP Standards Used and Created

This document describes which Nostr Implementation Possibilities (NIPs) the Community Requests app uses and which custom standards it has created.

## Existing NIP Standards Used

### Core Protocol Standards

#### NIP-01: Basic protocol flow

- **Usage**: Foundation for all Nostr events and communication
- **Implementation**: Used throughout the app for event creation, signing, and relay communication
- **Reference**: [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)

#### NIP-10: Conventions for clients' use of `e` and `p` tags

- **Usage**: Thread handling and reply structure
- **Implementation**:
  - Reply events use `e` tags to reference the root request and parent replies
  - Thread hierarchy is built following NIP-10 specifications
  - Located in `src/utils/nostrDataUtils.ts` (`processThreadEvents` function)
- **Reference**: [NIP-10](https://github.com/nostr-protocol/nips/blob/master/10.md)

#### NIP-19: bech32-encoded entities

- **Usage**: Decoding `nevent` references
- **Implementation**: Used in `src/pages/EventRawDataPage.tsx` for decoding event references
- **Reference**: [NIP-19](https://github.com/nostr-protocol/nips/blob/master/19.md)

#### NIP-23: Long-form content

- **Usage**: Previously used for storing requests (kind 30023)
- **Status**: Deprecated in favor of NIP-72 community requests (kind 1111)
- **Reference**: [NIP-23](https://github.com/nostr-protocol/nips/blob/master/23.md)

### Authentication & Security Standards

#### NIP-46: Nostr Remote Signing

- **Usage**: Remote signing through bunker servers (OpenBunker integration)
- **Implementation**:
  - Complete `BunkerSigner` implementation in `src/utils/nip46Utils.ts`
  - Supports both `bunker://` URL and `nostrconnect://` URI flows
  - Handles encrypted communication with remote signers
- **Reference**: [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md)

#### NIP-44: Encrypted Direct Message

- **Usage**: Encryption for NIP-46 communication
- **Implementation**: Used internally by NIP-46 implementation for secure communication between client and bunker
- **Reference**: [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md)

### Community Standards

#### NIP-72: Moderated Communities

- **Usage**: Core standard for community requests and community definitions
- **Implementation**:
  - **Community Definition Events** (kind 34550):
    - Fetched via `useCommunityEvent` hook
    - Contains community metadata (name, description, moderators, relays)
    - Located in `src/hooks/useCommunityEvent.ts`
  - **Community Request Events** (kind 1111):
    - Used for submitting community requests
    - Includes community `a` tag: `34550:community_id:community_identifier`
    - Located in `src/utils/communityRequest.ts`
  - **Community A Tags**: Created using `getCommunityATag` utility in `src/utils/communityUtils.ts`
- **Reference**: [NIP-72](https://github.com/nostr-protocol/nips/blob/master/72.md)

### Event Kinds Used

Based on NIP standards and custom implementations:

- **Kind 0**: User metadata (NIP-01)
- **Kind 1**: Text notes (replies) - standard text notes
- **Kind 5**: Event deletion (NIP-09) - referenced in codebase
- **Kind 1111**: Community requests (NIP-72) - main request events
- **Kind 34550**: Community definition (NIP-72) - community metadata
- **Kind 9078**: Status events (custom) - request status tracking

## Custom Standards Created

### Status Events (Kind 9078)

A custom event type for tracking the status of community requests independently from the request itself.

**Event Structure:**

```typescript
{
  kind: 9078,
  content: string, // Descriptive text (e.g., "Status updated to: approved")
  tags: [
    ['d', string],     // Event ID of the original request being referenced
    ['status', string], // Status value (new, in-progress, rejected, completed)
    ['a', string]      // Community reference (optional)
  ]
}
```

**Features:**

- Decoupled status tracking from request content
- Allows status history tracking
- Supports filtering by request ID (`d` tag) or status value
- Moderator-only status updates (enforced by application logic)

**Implementation:**

- Located in `src/utils/statusEventUtils.ts`
- Status values: `new`, `in-progress`, `rejected`, `completed`
- Utility functions for creation, filtering, and processing

**Benefits:**

- Status updates don't require editing the original request
- Complete audit trail of status changes
- Easy querying of current status for any request
- Extensible for additional metadata

### Edit Events (Replaceable Event Pattern)

While not a separate event kind, the app implements a custom editing pattern using the addressable event standard. The difference with an addressable event is that past events with the same kind, pubkey and `d` tag should not be discarded.

**Pattern:**

- Edited events use the **same kind, `d` tag, and pubkey** as the original event
- They reference the original event via an `e` tag
- The latest event (by `created_at`) with matching kind, `d` tag, and pubkey is considered the current version

**Event Structure:**

```typescript
{
  kind: 1111, // Same as original request/comment
  content: string, // New text content
  tags: [
    ['d', string], // Same d tag as original
    ['e', string, '', 'reply'], // Reference to original event ID
    ['a', string], // Community reference
    // ... other preserved tags
  ],
  pubkey: string, // Same pubkey as original
  created_at: number // Later timestamp than original
}
```

**Implementation:**

- Located in `src/utils/editEventUtils.ts`
- Functions: `createEditedEvent()`, `getLatestReplaceableEvent()`, `isReplacementEvent()`
- Handles both request edits and comment/reply edits

## Migration Notes

### From NIP-23 to NIP-72

The app previously used NIP-23 (kind 30023) for long-form content requests. This has been migrated to NIP-72 (kind 1111) for better community integration and standardization.

**Migration Benefits:**

- Better community integration via `a` tags
- Standardized community request format
- Improved filtering and querying
- Alignment with Nostr community standards

## References

### Official NIP Specifications

- [NIP Repository](https://github.com/nostr-protocol/nips)
- [NIP-01: Basic protocol flow](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-05: Mapping Nostr keys to DNS-based identifiers](https://github.com/nostr-protocol/nips/blob/master/05.md)
- [NIP-09: Event Deletion](https://github.com/nostr-protocol/nips/blob/master/09.md)
- [NIP-10: Conventions for clients' use of `e` and `p` tags](https://github.com/nostr-protocol/nips/blob/master/10.md)
- [NIP-19: bech32-encoded entities](https://github.com/nostr-protocol/nips/blob/master/19.md)
- [NIP-23: Long-form content](https://github.com/nostr-protocol/nips/blob/master/23.md)
- [NIP-44: Encrypted Direct Message](https://github.com/nostr-protocol/nips/blob/master/44.md)
- [NIP-46: Nostr Remote Signing](https://github.com/nostr-protocol/nips/blob/master/46.md)
- [NIP-72: Moderated Communities](https://github.com/nostr-protocol/nips/blob/master/72.md)

### Internal Documentation

- `REQUEST_DETAIL_README.md` - NIP-10 thread implementation details
- `STATUS_EVENTS.md` - Status event documentation (note: documents kind 30078, but implementation uses 9078)
- `EDIT_EVENTS.md` - Edit event documentation (note: documents kind 30079, but implementation uses replaceable event pattern)
- `NIP-72_IMPLEMENTATION.md` - NIP-72 community request implementation

## Future Considerations

### Potential Standardization

The following custom implementations could potentially be proposed as official NIPs:

1. **Status Events (Kind 9078)**: Could be generalized as a standard for tracking status of any Nostr event or resource
2. **Edit Event Pattern**: Already follows replaceable event conventions, but could be documented as a best practice pattern

### Areas for Enhancement

- **Status Event Transitions**: Define valid status transition rules
- **Role-based Permissions**: More granular permission system for status updates
- **Edit History**: More explicit edit history tracking
- **Event Relationships**: Enhanced tagging for complex request relationships
