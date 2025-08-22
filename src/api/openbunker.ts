// OpenBunker API integration
// This file provides a bridge between the community-requests frontend and the OpenBunker backend

import { OPENBUNKER_CONFIG, buildApiUrl } from '../config/openbunker';

export interface OpenBunkerResponse {
  success: boolean;
  message: string;
  bunkerUrl?: string;
  bunkerConnectionToken?: string | null;
  error?: string;
}

export const openBunkerApi = {
  async submitRequest(requestData: {
    name: string;
    email: string;
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
};
