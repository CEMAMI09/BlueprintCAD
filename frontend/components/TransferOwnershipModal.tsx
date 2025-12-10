import React, { useState } from 'react';

interface TransferOwnershipModalProps {
  entityType: 'project' | 'folder';
  entityId: number;
  entityName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferOwnershipModal({
  entityType,
  entityId,
  entityName,
  onClose,
  onSuccess,
}: TransferOwnershipModalProps) {
  const [toUsername, setToUsername] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ownership-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          to_username: toUsername,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send transfer request');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Transfer Ownership</h2>

        {!showConfirmation ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {entityType === 'project' ? 'Project' : 'Folder'}: {entityName}
              </label>
              <p className="text-sm text-gray-400">
                {entityType === 'folder' && 
                  '⚠️ This will transfer ownership of this folder and all nested content (subfolders and projects).'}
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                Transfer to (username) *
              </label>
              <input
                type="text"
                id="username"
                value={toUsername}
                onChange={(e) => setToUsername(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium mb-2">
                Message (optional)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a message for the recipient..."
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !toUsername.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="mb-6 p-4 bg-yellow-500 bg-opacity-20 border border-yellow-500 rounded-md">
              <p className="font-semibold mb-2">⚠️ Confirm Transfer</p>
              <p className="text-sm">
                You are about to transfer ownership of <strong>{entityName}</strong> to{' '}
                <strong>@{toUsername}</strong>.
              </p>
              {entityType === 'folder' && (
                <p className="text-sm mt-2">
                  This includes all nested folders and projects inside this folder.
                </p>
              )}
              <p className="text-sm mt-2">
                You will lose owner privileges. This action requires the recipient to accept.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
