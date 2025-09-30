import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';

export const ConnectionStatusBox: React.FC = () => {
  const navigate = useNavigate();
  // Get all the state from the Nostr context
  const { bunkerStatus, logout } = useNostr();

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        {bunkerStatus === 'connected' ? (
          <button
            onClick={async () => await logout()}
            className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-all duration-200"
          >
            Log Out
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-all duration-200"
          >
            Log In
          </button>
        )}
      </div>
    </div>
  );
};
