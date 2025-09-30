# Community Requests App

A React-based community request management system that uses OpenBunker for Nostr authentication.

## Features

- **OpenBunker Authentication**: Secure Nostr key management through OAuth providers
- **Nostr Integration**: All requests are stored and managed through Nostr relays
- **Request Form**: Comprehensive form for submitting community requests
- **Embeddable**: Can be embedded in other websites via iframe
- **Dashboard**: User dashboard to manage requests and profile

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Authentication

The app supports two authentication methods:

### 1. OpenBunker (Recommended)

- Uses Discord OAuth to generate new Nostr keys
- Secure remote signing through bunker servers
- No need to manage private keys locally

### 2. Direct Nostr Secret Key

- Use existing Nostr secret keys
- Direct connection to relays
- Full control over your keys

## Usage

### For Users

1. **Login**: Visit `/login` and choose your authentication method
2. **Dashboard**: After authentication, access your dashboard at `/dashboard`
3. **Submit Requests**: Use the "Create New Request" button to submit new requests
4. **Manage Profile**: Update your Nostr profile information

### For Developers

#### Embedding the Request Form

The request form can be embedded in other websites:

```html
<iframe
  src="http://localhost:5173/embed?showHeader=false&requestType=technical"
  width="100%"
  height="600px"
  frameborder="0"
>
</iframe>
```

#### URL Parameters

- `showHeader`: Show/hide the header (default: true)
- `requestType`: Pre-select request type
- `priority`: Pre-select priority level
- `title`: Pre-fill title
- `description`: Pre-fill description
- `redirectUrl`: URL to redirect after submission
- `cancelUrl`: URL to redirect on cancellation

#### PostMessage Events

The embedded form communicates with the parent window:

```javascript
window.addEventListener('message', event => {
  if (event.data.type === 'REQUEST_CREATED') {
    console.log('Request submitted:', event.data.data);
  } else if (event.data.type === 'REQUEST_ERROR') {
    console.error('Request error:', event.data.error);
  } else if (event.data.type === 'REQUEST_CANCELLED') {
    console.log('Request cancelled');
  }
});
```

## Architecture

### Components

- **NostrContext**: Manages Nostr connection and authentication state
- **RequestForm**: Reusable form component for submitting requests
- **LoginOptions**: Authentication method selection
- **DashboardPage**: User dashboard and navigation

### Data Flow

1. User authenticates via OpenBunker or direct key
2. Nostr connection established to relays
3. Requests submitted as Nostr events (kind 30023)
4. Events published to multiple relays for redundancy
5. Dashboard displays user's requests from relays

### Nostr Event Structure

Requests are stored as NIP-23 long-form content events:

```json
{
  "kind": 30023,
  "content": "{\"title\":\"...\",\"description\":\"...\",...}",
  "tags": [
    ["d", "request-1234567890"],
    ["title", "Request Title"],
    ["requestType", "technical"],
    ["priority", "high"],
    ["status", "pending"],
    ["t", "community-request"]
  ]
}
```

## Development

### Adding New Features

1. Create new components in `src/components/`
2. Add new pages in `src/pages/`
3. Update routing in `src/App.tsx`
4. Add new types in `src/types/`

### Styling

The app uses Tailwind CSS for styling. Custom styles can be added to `src/index.css`.

### Testing

```bash
# Run tests
pnpm test

# Run linting
pnpm lint
```

## Deployment

### Build

```bash
pnpm build
```

### Environment Variables

No environment variables are required for basic functionality. For production:

- Set up proper OpenBunker server endpoints
- Configure relay URLs
- Set up proper CORS policies for embedding

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

- Open an issue on GitHub
- Check the Nostr documentation
- Review OpenBunker documentation
