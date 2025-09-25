import { useState } from 'react';
import { useNostr } from '../hooks/useNostr';

/**
 * Component for displaying and editing user profile information
 * Shows user metadata from Nostr profile events (kind 0)
 */
export function UserProfile() {
  const {
    userPublicKey,
    metadata,
    isLoading,
    error,
    fetchMetadata,
    refreshMetadata,
    updateMetadata,
  } = useNostr();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAbout, setEditAbout] = useState('');

  const handleEdit = () => {
    setEditName(metadata?.name || metadata?.display_name || '');
    setEditAbout(metadata?.about || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (editName.trim()) {
      const newMetadata = {
        name: editName.trim(),
        about: editAbout.trim() || undefined,
      };

      await updateMetadata(newMetadata);
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName('');
    setEditAbout('');
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <h3 className="text-red-800 font-medium">Profile Error</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          type="button"
          onClick={fetchMetadata}
          className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!userPublicKey) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-gray-800 font-medium">No User Key</h3>
        <p className="text-gray-600 text-sm mt-1">
          Please connect to view your profile.
        </p>
      </div>
    );
  }

  const displayName =
    metadata?.name || metadata?.display_name || 'Anonymous User';
  const about = metadata?.about || '';

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Your Profile</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refreshMetadata}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={isEditing ? handleCancel : handleEdit}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Profile Picture */}
      {metadata?.picture && (
        <div className="mb-3">
          <img
            src={metadata.picture}
            alt={displayName}
            className="w-16 h-16 object-cover rounded-full"
          />
        </div>
      )}

      {/* User Public Key */}
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-900 mb-1">Public Key</h4>
        <p className="text-xs text-gray-600 font-mono break-all">
          {userPublicKey}
        </p>
      </div>

      {/* Name */}
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-900 mb-1">Name</h4>
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <p className="text-sm text-gray-700">{displayName}</p>
        )}
      </div>

      {/* About */}
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-900 mb-1">About</h4>
        {isEditing ? (
          <textarea
            value={editAbout}
            onChange={e => setEditAbout(e.target.value)}
            placeholder="Tell us about yourself"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <p className="text-sm text-gray-700">
            {about || 'No description provided'}
          </p>
        )}
      </div>

      {/* Additional Info */}
      {(metadata?.website || metadata?.nip05 || metadata?.lud16) && (
        <div className="space-y-2">
          {metadata.website && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                Website
              </h4>
              <a
                href={
                  metadata.website.startsWith('http')
                    ? metadata.website
                    : `https://${metadata.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {metadata.website}
              </a>
            </div>
          )}
          {metadata.nip05 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">NIP-05</h4>
              <p className="text-sm text-gray-700 font-mono">
                {metadata.nip05}
              </p>
            </div>
          )}
          {metadata.lud16 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                Lightning Address
              </h4>
              <p className="text-sm text-gray-700 font-mono">
                {metadata.lud16}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Save Button for Edit Mode */}
      {isEditing && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSave}
            disabled={!editName.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Save Changes
          </button>
        </div>
      )}

      {/* No Profile State */}
      {!metadata && !isLoading && !error && (
        <div className="text-center py-4">
          <p className="text-gray-600 text-sm mb-3">
            No profile information found. You can create one by editing your
            profile.
          </p>
          <button
            type="button"
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Create Profile
          </button>
        </div>
      )}
    </div>
  );
}
