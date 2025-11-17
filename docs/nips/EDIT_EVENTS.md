# Edit Events (Kind 30079)

While not a separate event kind, the app implements a custom editing pattern mimicking the addressable event standard. The difference with an addressable event is that past events with the same kind, pubkey and `d` tag should not be discarded.

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
