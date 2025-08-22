// OpenBunker API Configuration
export const OPENBUNKER_CONFIG = {
  // Base URL for the OpenBunker API
  API_URL: import.meta.env.VITE_OPENBUNKER_API_URL || 'http://localhost:3000',

  // API endpoints
  ENDPOINTS: {
    UNAUTHENTICATED_TOKEN: '/api/openbunker-unauthenticated-token',
  },

  // Token configuration
  TOKEN: {
    SIZE: 16,
    TTL: 600000, // 10 minutes in milliseconds
  },
} as const;

// Helper function to build API URLs
export const buildApiUrl = (
  endpoint: string,
  params?: Record<string, string>
): string => {
  let url = `${OPENBUNKER_CONFIG.API_URL}${endpoint}`;

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value);
    });
  }

  return url;
};
