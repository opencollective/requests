import React, { useMemo } from 'react';
import { Navigate, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { useCommunityById } from '../hooks/useCommunityById';
import { getCommunityATag, parseCommunityId } from '../utils/communityUtils';
import { CommunityContext } from '../hooks/useCommunityContext';

export type { CommunityContextValue } from '../hooks/useCommunityContext';

interface CommunityProviderProps {
  communityId: string;
}

const CommunityProvider: React.FC<CommunityProviderProps> = ({
  communityId,
}) => {
  const navigate = useNavigate();
  const { isConnected, pool, relays } = useNostr();

  const parsedCommunity = useMemo(
    () => parseCommunityId(communityId),
    [communityId]
  );

  const communityState = useCommunityById(
    communityId,
    isConnected,
    pool,
    relays
  );

  const contextValue = useMemo(() => {
    if (!parsedCommunity) {
      // Return a safe default when parsedCommunity is invalid
      return {
        communityId,
        communityPubkey: '',
        communityIdentifier: '',
        communityATag: '',
        communityInfo: null,
        isCommunityLoading: false,
        communityError: null,
        refreshCommunity: async () => {},
      };
    }

    return {
      communityId,
      communityPubkey: parsedCommunity.community_id,
      communityIdentifier: parsedCommunity.community_identifier,
      communityATag: getCommunityATag(
        parsedCommunity.community_id,
        parsedCommunity.community_identifier
      ),
      communityInfo: communityState.communityInfo,
      isCommunityLoading: communityState.isLoading,
      communityError: communityState.error,
      refreshCommunity: communityState.refreshCommunity,
    };
  }, [
    communityId,
    parsedCommunity,
    communityState.communityInfo,
    communityState.isLoading,
    communityState.error,
    communityState.refreshCommunity,
  ]);

  if (!parsedCommunity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Invalid community identifier
          </h1>
          <p className="text-gray-600">
            We couldn&apos;t parse the community id{' '}
            <span className="font-mono text-gray-800">{communityId}</span>.
            Please pick a community again.
          </p>
          <button
            type="button"
            onClick={() => navigate('/communities')}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Browse communities
          </button>
        </div>
      </div>
    );
  }

  return (
    <CommunityContext.Provider value={contextValue}>
      <Outlet />
    </CommunityContext.Provider>
  );
};

export const CommunityLayout: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();

  if (!communityId) {
    return <Navigate to="/communities" replace />;
  }

  return <CommunityProvider communityId={communityId} />;
};
