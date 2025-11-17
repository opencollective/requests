# Request Flow Diagram

This diagram shows the flow for handling requests in the community requests system, including both authenticated and unauthenticated user scenarios.

```mermaid
flowchart TD
    A[User Submits Request] --> B{User Authenticated?}

    B -->|Yes| C[Sign & Publish Events]
    C --> D[Request Stored in Database]
    D --> E[Request Visible in System]

    B -->|No| F[Collect Email Address]
    F --> G[Send Request to OpenBunker]
    G --> H{Identity Exists with Email?}

    H -->|Yes| I[Ask User to Authenticate]
    I --> J[User Authenticates via OpenBunker]
    J --> K[Return to Community Requests]
    K --> L[User Signs & Publishes Events]
    L --> D

    H -->|No| M[Create New User in OpenBunker]
    M --> N[Generate New Key Pair]
    N --> O[Create Bunker Connection]
    O --> P[Return Bunker Connection Details]
    P --> Q[User Completes Authentication]
    Q --> R[User Signs & Publishes Events]
    R --> D

    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#e8f5e8
    style D fill:#e8f5e8
    style E fill:#e8f5e8
    style F fill:#fff3e0
    style G fill:#fff3e0
    style H fill:#fff3e0
    style I fill:#fff3e0
    style J fill:#e8f5e8
    style K fill:#e8f5e8
    style L fill:#e8f5e8
    style M fill:#fff3e0
    style N fill:#fff3e0
    style O fill:#fff3e0
    style P fill:#e8f5e8
    style Q fill:#e8f5e8
    style R fill:#e8f5e8
```

## Flow Description

### Authenticated User Path

1. **User Submits Request** → User is already authenticated
2. **Sign & Publish Events** → User signs the request with their Nostr key
3. **Request Stored** → Request is stored in the database
4. **Request Visible** → Request becomes visible in the community requests system

### Unauthenticated User Path

1. **User Submits Request** → User is not authenticated
2. **Collect Email** → System collects user's email address
3. **Send to OpenBunker** → Request is forwarded to OpenBunker service
4. **Check Identity** → OpenBunker checks if an identity exists for that email

#### If Identity Exists:

5. **Ask to Authenticate** → Prompt user to authenticate with existing account
6. **User Authenticates** → User completes authentication via OpenBunker
7. **Return to System** → User is redirected back to community requests
8. **Sign & Publish** → User can now sign and publish their request

#### If No Identity Exists:

5. **Create New User** → OpenBunker creates a new user account
6. **Generate Key Pair** → New Nostr key pair is generated
7. **Create Bunker Connection** → Bunker connection is established
8. **Return Connection Details** → Connection details are provided to user
9. **Complete Authentication** → User completes the authentication process
10. **Sign & Publish** → User can now sign and publish their request

## Key Benefits

- **Seamless UX**: Users can submit requests even without prior authentication
- **Identity Management**: OpenBunker handles user creation and key management
- **Security**: All requests are still cryptographically signed
- **Flexibility**: Supports both existing and new users
