import React, { useState } from 'react';

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newRole: string) => Promise<void>;
  currentRole: string;
  memberName: string;
  availableRoles: string[];
  isOwner: boolean;
}

export default function ChangeRoleModal({
  isOpen,
  onClose,
  onSubmit,
  currentRole,
  memberName,
  availableRoles,
  isOwner
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedRole === currentRole) {
      onClose();
      return;
    }

    if (selectedRole === 'owner' && isOwner) {
      setError('');
      // The warning is shown inline, user needs to click Save Changes to confirm
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit(selectedRole);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to change role');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'border-purple-500 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400';
      case 'admin':
        return 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400';
      case 'editor':
        return 'border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400';
      case 'viewer':
        return 'border-gray-500 bg-gray-500/10 hover:bg-gray-500/20 text-gray-400';
      default:
        return 'border-gray-500 bg-gray-500/10 hover:bg-gray-500/20 text-gray-400';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Full control including ownership transfer';
      case 'admin':
        return 'Manage members and content';
      case 'editor':
        return 'Create and edit content';
      case 'viewer':
        return 'View-only access';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Change Role</h2>
        
        <div className="mb-4">
          <p className="text-gray-400 text-sm">
            Change role for <span className="text-white font-semibold">{memberName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-3 mb-6">
            {availableRoles.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                  selectedRole === role
                    ? getRoleColor(role) + ' ring-2 ring-offset-2 ring-offset-gray-800'
                    : 'border-gray-700 bg-gray-900 hover:bg-gray-850 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold capitalize">{role}</span>
                  {selectedRole === role && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-gray-500">{getRoleDescription(role)}</p>
              </button>
            ))}
          </div>

          {selectedRole === 'owner' && isOwner && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
              <p className="font-semibold mb-1">⚠️ Transfer Ownership</p>
              <p>You will become an admin after transferring ownership.</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedRole === currentRole}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
