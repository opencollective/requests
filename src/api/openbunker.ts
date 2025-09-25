// OpenBunker API integration
// This file provides a bridge between the community-requests frontend and the OpenBunker backend

import { OPENBUNKER_CONFIG, buildApiUrl } from '../config/openbunker';

export const openBunkerUrl =
  import.meta.env.VITE_OPENBUNKER_POPUP_URL || '/openbunker-login-popup';
export interface OpenBunkerResponse {
  success: boolean;
  message: string;
  bunkerUrl?: string;
  bunkerConnectionToken?: string | null;
  error?: string;
}

export interface OpenBunkerAuthSuccessEvent {
  type: 'openbunker-auth-success';
  connectionMode: 'bunker' | 'nostrconnect';
  secretKey: string;
}

export const openBunkerApi = {
  async submitRequest(requestData: {
    name: string;
    email: string;
    scope: string;
    subject: string;
    message: string;
    timestamp: string;
  }): Promise<OpenBunkerResponse> {
    try {
      // First, check if user exists and get authentication token
      const authResponse = await fetch(
        buildApiUrl(OPENBUNKER_CONFIG.ENDPOINTS.UNAUTHENTICATED_TOKEN),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: requestData.email,
            name: requestData.name,
            scope: requestData.scope,
          }),
        }
      );

      if (!authResponse.ok) {
        throw new Error(
          `HTTP ${authResponse.status}: ${authResponse.statusText}`
        );
      }

      const authData = await authResponse.json();
      return authData;
    } catch (error) {
      console.error('Error submitting request to OpenBunker:', error);
      throw error;
    }
  },

  buildBunkerConnectionUrl(result: OpenBunkerResponse, secret: string) {
    // Create a new bunker connection token with the secret
    if (!result.bunkerConnectionToken) {
      throw new Error('No bunker connection token available');
    }
    const url = new URL(result.bunkerConnectionToken);

    // FIXME this is a hack to get the secret and email into the bunker connection token
    const craftedSecret = secret;
    url.searchParams.set('secret', craftedSecret);
    return url.toString();
  },

  async openBunkerPopupNostrConnect(
    connectionUri: string,
    setPopup: (_window: Window | null) => void
  ): Promise<void> {
    // Get the OpenBunker URL from environment or use default
    const baseUrl =
      import.meta.env.VITE_OPENBUNKER_POPUP_URL || '/openbunker-login-popup';

    // Add query parameters for nostrconnect mode and token
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set('connectionMode', 'nostrconnect');
    url.searchParams.set('connectionToken', connectionUri);

    // Create a promise that resolves when the popup closes
    const popupPromise = new Promise<void>(resolve => {
      const popupWindow = window.open(
        url.toString(),
        'openbunker-login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popupWindow) {
        resolve();
        return;
      }
      setPopup(popupWindow);

      // Check if popup is closed
      const checkClosed = setInterval(() => {
        if (popupWindow.closed) {
          clearInterval(checkClosed);
          setPopup(null);
          resolve();
        }
      }, 1000);
    });
    return await popupPromise;
  },

  async openBunkerPopupOpen(
    setPopup: (_window: Window | null) => void,
    openBunkerEventHandler?: (
      _event: MessageEvent<OpenBunkerAuthSuccessEvent>
    ) => Promise<void>
  ): Promise<void> {
    // Create a popup with the configured OpenBunker URL
    const popupWindow = window.open(
      openBunkerUrl,
      'openbunker-login',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    // Create a promise that resolves when the popup closes
    const popupPromise = new Promise<void>(resolve => {
      if (!popupWindow) {
        resolve();
        return;
      }
      setPopup(popupWindow);

      // Set up event handler if provided
      let messageHandler:
        | ((event: MessageEvent<OpenBunkerAuthSuccessEvent>) => void)
        | null = null;
      if (openBunkerEventHandler) {
        messageHandler = (event: MessageEvent) => {
          console.log('OpenBunker event:', event);
          // Handle messages from OpenBunker popup (cross-origin)
          if (event.data?.type === 'openbunker-auth-success') {
            openBunkerEventHandler(event);
          }
        };
        window.addEventListener('message', messageHandler);
      }

      // Check if popup is closed
      const checkClosed = setInterval(() => {
        if (popupWindow.closed) {
          clearInterval(checkClosed);
          setPopup(null);
          // Clean up event handler when popup closes
          if (messageHandler) {
            window.removeEventListener('message', messageHandler);
          }
          resolve();
        }
      }, 1000);
    });
    return await popupPromise;
  },
};
