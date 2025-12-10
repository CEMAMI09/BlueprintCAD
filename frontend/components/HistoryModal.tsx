import { useState, useEffect } from 'react';

interface RenameHistory {
  id: number;
  action: string;
  old_name?: string;
  new_name?: string;
  old_folder_id?: number;
  new_folder_id?: number;
  old_parent_id?: number;
  new_parent_id?: number;
  username: string;
  created_at: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'project' | 'folder';
  entityId: number;
  entityName: string;
}

export default function HistoryModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName
}: HistoryModalProps) {
  const [history, setHistory] = useState<RenameHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, entityType, entityId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rename-move-history/${entityType}/${entityId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAction = (item: RenameHistory) => {
    switch (item.action) {
      case 'rename':
        return (
          <div>
            <span className="text-gray-400">Renamed from</span>{' '}
            <span className="text-red-400 line-through">{item.old_name}</span>{' '}
            <span className="text-gray-400">to</span>{' '}
            <span className="text-green-400 font-medium">{item.new_name}</span>
          </div>
        );
      case 'move':
        return (
          <div>
            <span className="text-gray-400">Moved from</span>{' '}
            <span className="text-blue-400">
              {item.old_parent_id ? `Folder #${item.old_parent_id}` : 'Root'}
            </span>{' '}
            <span className="text-gray-400">to</span>{' '}
            <span className="text-blue-400">
              {item.new_parent_id ? `Folder #${item.new_parent_id}` : 'Root'}
            </span>
          </div>
        );
      case 'rename_move':
        return (
          <div className="space-y-1">
            <div>
              <span className="text-gray-400">Renamed from</span>{' '}
              <span className="text-red-400 line-through">{item.old_name}</span>{' '}
              <span className="text-gray-400">to</span>{' '}
              <span className="text-green-400 font-medium">{item.new_name}</span>
            </div>
            <div>
              <span className="text-gray-400">and moved from</span>{' '}
              <span className="text-blue-400">
                {item.old_parent_id ? `Folder #${item.old_parent_id}` : 'Root'}
              </span>{' '}
              <span className="text-gray-400">to</span>{' '}
              <span className="text-blue-400">
                {item.new_parent_id ? `Folder #${item.new_parent_id}` : 'Root'}
              </span>
            </div>
          </div>
        );
      default:
        return item.action;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold mb-1">Change History</h2>
          <p className="text-sm text-gray-400">
            {entityName} - All rename and move operations
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {item.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{item.username}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.action === 'rename' ? 'bg-yellow-500/20 text-yellow-400' :
                      item.action === 'move' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {item.action.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm">
                    {formatAction(item)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">No history found</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
