# All Requests Page

## Overview

The All Requests page (`/requests`) displays all community requests submitted through the Nostr network. This page provides a comprehensive view of all community requests, allowing users to browse, search, and interact with requests.

## Features

### Request Display

- **Grid Layout**: Requests are displayed in a responsive grid layout (1 column on mobile, 2 on tablet, 3 on desktop)
- **Request Cards**: Each request is shown in a clean, organized card format
- **Real-time Updates**: Requests are fetched from Nostr relays in real-time
- **Sorting**: Requests are automatically sorted by creation date (newest first)

### Request Information

Each request card displays:

- **Subject**: The main title/description of the request
- **Message Preview**: Truncated message content (first 150 characters)
- **Author Information**: Name and Nostr public key
- **Timestamp**: When the request was created
- **View Details Button**: For future implementation of detailed view

### Navigation & Actions

- **Back to Dashboard**: Returns to the main dashboard
- **New Request**: Quick access to submit a new request
- **Refresh Button**: Manually refresh the requests list
- **Request Count**: Shows total number of requests found

### Authentication

- **Protected Route**: Only accessible to authenticated users
- **Automatic Redirect**: Unauthenticated users are redirected to login
- **Nostr Integration**: Uses Nostr context for authentication and data fetching

## Technical Implementation

### Components

- **AllRequestsPage**: Main page component with routing and layout
- **RequestCard**: Reusable component for displaying individual requests
- **useRequests Hook**: Custom hook for managing request state and data fetching

### Data Flow

1. **Authentication Check**: Verifies user is connected to Nostr
2. **Event Subscription**: Subscribes to Nostr events with kind 30023 and topic 'community-request'
3. **Data Processing**: Parses Nostr events into structured request data
4. **State Management**: Manages loading, error, and data states
5. **UI Rendering**: Displays processed requests in the grid layout

### Nostr Integration

- **Event Kind**: Uses NIP-23 Long-form Content (kind 30023)
- **Topic Tag**: Filters events with topic tag 'community-request'
- **Content Parsing**: Extracts request data from JSON content
- **Real-time Updates**: Automatically receives new events from relays

### Styling

- **Tailwind CSS**: Responsive design with Tailwind utility classes
- **Custom CSS**: Line-clamp utilities for text truncation
- **Responsive Grid**: Adapts to different screen sizes
- **Hover Effects**: Interactive elements with smooth transitions

## Future Enhancements

### Planned Features

- **Request Details View**: Full request information in a modal or separate page
- **Search & Filtering**: Search by text, filter by date, author, etc.
- **Pagination**: Handle large numbers of requests efficiently
- **Request Categories**: Organize requests by type or topic
- **Comment System**: Allow users to comment on requests
- **Status Tracking**: Track request status (pending, approved, completed)

### Technical Improvements

- **Caching**: Implement request caching for better performance
- **Offline Support**: Cache requests for offline viewing
- **Real-time Comments**: WebSocket integration for live comments
- **Request Analytics**: Track request metrics and trends

## Usage

### Accessing the Page

1. Navigate to `/requests` in the application
2. Ensure you're authenticated with Nostr
3. View all community requests in the grid layout

### Navigation

- Use the "Back to Dashboard" button to return to the main dashboard
- Click "New Request" to submit a new community request
- Use the refresh button to manually update the requests list

### Request Interaction

- Click "View Details" on any request card (currently logs to console)
- Browse through requests using the responsive grid layout
- Monitor real-time updates as new requests are submitted

## Dependencies

- React 19.1.1
- React Router DOM 7.8.1
- Nostr Tools 2.16.2
- Tailwind CSS 3.4.0
- TypeScript 5.8.3

## File Structure

```
src/
├── pages/
│   └── AllRequestsPage.tsx          # Main page component
├── components/
│   └── RequestCard.tsx              # Request display component
├── hooks/
│   └── useRequests.ts               # Request management hook
└── App.tsx                          # Routing configuration
```
