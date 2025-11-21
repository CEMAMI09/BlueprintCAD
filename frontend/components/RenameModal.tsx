import { useState } from 'react';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newName: string) => Promise<void>;
  currentName: string;
  entityType: 'project' | 'folder';
  title?: string;
}

export default function RenameModal({
  isOpen,
  onClose,
  onSubmit,
  currentName,
  entityType,
  title
}: RenameModalProps) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    if (name.trim() === currentName) {
      onClose();
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit(name.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to rename');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          {title || `Rename ${entityType === 'project' ? 'File' : 'Folder'}`}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {entityType === 'project' ? 'File Name' : 'Folder Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              placeholder={`Enter ${entityType} name`}
              autoFocus
              disabled={loading}
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || name.trim() === currentName}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Renaming...
                </>
              ) : (
                'Rename'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
