import { useState } from 'react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (username: string, role: string) => void;
}

export default function InviteMemberModal({ isOpen, onClose, onSubmit }: InviteMemberModalProps) {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('editor');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(username, role);
    setUsername('');
    setRole('editor');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold">Invite Team Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username *</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              <option value="viewer">Viewer - Can view files only</option>
              <option value="editor">Editor - Can upload and edit files</option>
              <option value="admin">Admin - Can manage members and settings</option>
            </select>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">Role Permissions</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• <strong>Viewer:</strong> View and download files</li>
              <li>• <strong>Editor:</strong> Upload, edit, and comment</li>
              <li>• <strong>Admin:</strong> Invite members and manage folder</li>
            </ul>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}