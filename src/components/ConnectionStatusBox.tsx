import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';

export const ConnectionStatusBox: React.FC = () => {
  const navigate = useNavigate();
  // Get all the state from the Nostr context
  const { bunkerStatus, logout } = useNostr();

  return (
    <div className="flex items-center gap-2">
      {bunkerStatus === 'connected' ? (
        <>
          {/* Logout Button */}
          <button
            onClick={async () => await logout()}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
          >
            Log Out
          </button>
        </>
      ) : (
        <button
          onClick={() => navigate('/login')}
          className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-all duration-200"
        >
          Log In
        </button>
      )}
    </div>
  );
};
