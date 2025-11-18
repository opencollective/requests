import { createContext, useContext } from 'react';
import type { CommunityInfo } from '../utils/communityUtils';

export interface CommunityContextValue {
  communityId: string;
  communityPubkey: string;
  communityIdentifier: string;
  communityATag: string;
  communityInfo: CommunityInfo | null;
  isCommunityLoading: boolean;
  communityError: string | null;
  refreshCommunity: () => Promise<void>;
}

export const CommunityContext = createContext<CommunityContextValue | null>(
  null
);

export const useCommunityContext = () => useContext(CommunityContext);
