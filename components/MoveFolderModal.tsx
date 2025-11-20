import { useState, useEffect } from 'react';
import { Folder } from '../types';

interface MoveFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (targetFolderId: number | null) => Promise<void>;
  currentFolder: Folder;
  excludeFolderId: number;
}

export default function MoveFolderModal({
  isOpen,
  onClose,
  onSubmit,
  currentFolder,
  excludeFolderId
}: MoveFolderModalProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingFolders, setFetchingFolders] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen]);

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders/tree', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        // Filter out the current folder and its descendants
        const filtered = filterFolders(data, excludeFolderId);
        setFolders(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch folders:', err);
    } finally {
      setFetchingFolders(false);
    }
  };

  const filterFolders = (folderList: Folder[], excludeId: number): Folder[] => {
    return folderList
      .filter(f => f.id !== excludeId)
      .map(f => ({
        ...f,
        children: f.children ? filterFolders(f.children, excludeId) : []
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      await onSubmit(selectedFolderId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to move folder');
    } finally {
      setLoading(false);
    }
  };

  const renderFolderTree = (folderList: Folder[], depth: number = 0) => {
    return folderList.map(folder => (
      <div key={folder.id}>
        <button
          type="button"
          onClick={() => setSelectedFolderId(folder.id)}
          className={`w-full text-left px-4 py-2 rounded-lg transition flex items-center gap-2 ${
            selectedFolderId === folder.id
              ? 'bg-blue-600 text-white'
              : 'hover:bg-gray-800'
          }`}
          style={{ paddingLeft: `${depth * 20 + 16}px` }}
        >
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: folder.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="flex-1 truncate">{folder.name}</span>
          {folder.is_team_folder && (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
        {folder.children && folder.children.length > 0 && (
          <div>
            {renderFolderTree(folder.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold">Move Folder</h2>
          <p className="text-sm text-gray-400 mt-1">
            Moving: <span className="text-white font-medium">{currentFolder.name}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            {fetchingFolders ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(null)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                      selectedFolderId === null
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-800'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Root (Top Level)
                  </button>
                </div>

                {folders.length > 0 ? (
                  <div className="space-y-1">
                    {renderFolderTree(folders)}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No other folders available</p>
                )}
              </>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
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
              disabled={loading || fetchingFolders}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Moving...
                </>
              ) : (
                'Move Here'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
