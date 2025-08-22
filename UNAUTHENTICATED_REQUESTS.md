# Unauthenticated Requests System

This document describes the implementation of the unauthenticated request system that allows users to submit community requests without prior authentication.

## Overview

The system provides two paths for submitting requests:

1. **Authenticated Requests**: Users with existing Nostr identities can sign and publish requests directly
2. **Unauthenticated Requests**: Users without authentication can submit requests that are forwarded to OpenBunker for identity management

## Flow Diagram

See `REQUEST_FLOW_DIAGRAM.md` for a visual representation of the complete flow.

## Components

### 1. RequestChoicePage (`/request-choice`)

- Landing page that allows users to choose between authenticated and unauthenticated submission
- Provides clear information about both options
- Accessible from the dashboard and login page

### 2. UnauthenticatedRequestForm

- Form component specifically for unauthenticated users
- Collects name, email, subject, and message
- Shows informational note about OpenBunker integration
- Uses the same validation schema as authenticated requests

### 3. UnauthenticatedRequestPage (`/unauthenticated-request`)

- Page that hosts the unauthenticated form
- Handles form submission and success states
- Provides feedback about OpenBunker processing

### 4. useUnauthenticatedRequests Hook

- Manages the submission process to OpenBunker
- Handles loading states and error management
- Returns OpenBunker response data

## API Integration

### OpenBunker Endpoint

```
POST /api/openbunker/requests
```

**Request Body:**

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "subject": "Request Subject",
  "message": "Detailed request message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User account created successfully",
  "bunkerUrl": "https://openbunker.example.com/setup?token=abc123",
  "connectionToken": "abc123"
}
```

## User Experience

### For New Users

1. User visits `/request-choice`
2. Selects "Quick Request" option
3. Fills out the request form
4. Submits to OpenBunker
5. Receives confirmation and OpenBunker authentication details
6. Can complete authentication later to gain full access

### For Existing Users

1. User visits `/request-choice`
2. Selects "Quick Request" option
3. Fills out the request form
4. OpenBunker recognizes existing email
5. User is prompted to authenticate with existing account
6. Request is processed after authentication

## Development Setup

### Mock API

During development, the system uses a mock OpenBunker API that simulates different responses:

- **New User**: Email doesn't contain "existing" → Creates new account
- **Existing User**: Email contains "existing" → Prompts for authentication

### Environment Variables

```bash
# OpenBunker API endpoint (production)
VITE_OPENBUNKER_API_URL=https://api.openbunker.com

# OpenBunker popup URL for authentication
VITE_OPENBUNKER_POPUP_URL=https://openbunker.com/auth
```

## Security Considerations

1. **Email Validation**: All email addresses are validated before submission
2. **Rate Limiting**: Consider implementing rate limiting for unauthenticated submissions
3. **Spam Protection**: Implement CAPTCHA or similar anti-spam measures if needed
4. **Data Privacy**: Ensure user data is handled according to privacy policies

## Future Enhancements

1. **Email Notifications**: Send confirmation emails to users
2. **Request Tracking**: Allow users to track their request status
3. **Authentication Upgrade**: Seamless transition from unauthenticated to authenticated
4. **Multi-language Support**: Support for multiple languages in the form
5. **File Attachments**: Allow users to attach files to their requests

## Testing

### Manual Testing

1. Navigate to `/request-choice`
2. Test both authenticated and unauthenticated flows
3. Verify form validation works correctly
4. Test error handling and success states

### Automated Testing

- Unit tests for form validation
- Integration tests for API calls
- E2E tests for complete user flows

## Deployment

1. **API Endpoint**: Ensure the OpenBunker API endpoint is accessible
2. **CORS**: Configure CORS if the API is on a different domain
3. **Environment Variables**: Set production environment variables
4. **Monitoring**: Monitor API response times and error rates

## Troubleshooting

### Common Issues

1. **Form not submitting**: Check browser console for errors
2. **API errors**: Verify OpenBunker API endpoint is accessible
3. **Validation errors**: Ensure all required fields are filled correctly

### Debug Mode

Enable debug logging by setting `localStorage.debug = 'true'` in the browser console.
