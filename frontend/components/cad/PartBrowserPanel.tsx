'use client';

import { useState, useEffect } from 'react';

interface PartFile {
  id: number;
  filename: string;
  filepath: string;
  thumbnail?: string;
  version: number;
  folderId?: number;
}

interface PartBrowserProps {
  darkMode: boolean;
  onInsertPart: (fileId: number, filename: string) => void;
  canEdit: boolean;
}

export default function PartBrowserPanel({
  darkMode,
  onInsertPart,
  canEdit
}: PartBrowserProps) {
  const [parts, setParts] = useState<PartFile[]>([]);
  const [filteredParts, setFilteredParts] = useState<PartFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);

  useEffect(() => {
    loadParts();
  }, [currentFolderId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredParts(parts);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredParts(
        parts.filter(part =>
          part.filename.toLowerCase().includes(query) ||
          part.filepath.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, parts]);

  const loadParts = async () => {
    setLoading(true);
    setError(null);

    try {
      const folderQuery = currentFolderId ? `?folderId=${currentFolderId}` : '';
      const response = await fetch(`/api/cad/files${folderQuery}`);
      
      if (!response.ok) {
        throw new Error('Failed to load parts');
      }

      const data = await response.json();
      setParts(data.files || []);
      setFilteredParts(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setParts([]);
      setFilteredParts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInsertPart = (part: PartFile) => {
    if (!canEdit) {
      alert('You do not have permission to edit this assembly');
      return;
    }
    onInsertPart(part.id, part.filename);
    setSelectedPartId(part.id);
  };

  const handleDragStart = (e: React.DragEvent, part: PartFile) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'part',
      fileId: part.id,
      filename: part.filename
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`p-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        <h3 className="font-bold text-lg">Part Browser</h3>
      </div>

      {/* Search Bar */}
      <div className="p-3">
        <input
          type="text"
          placeholder="Search parts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full px-3 py-2 rounded border ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
      </div>

      {/* Folder Navigation */}
      {currentFolderId && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setCurrentFolderId(undefined)}
            className={`text-sm px-2 py-1 rounded ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            ⬅️ Back to Root
          </button>
        </div>
      )}

      {/* Parts List */}
      <div className="flex-1 overflow-y-auto px-3">
        {loading && (
          <div className="text-center py-8 text-gray-400">
            Loading parts...
          </div>
        )}

        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-2">
            {error}
          </div>
        )}

        {!loading && !error && filteredParts.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            {searchQuery ? 'No parts match your search' : 'No parts available'}
          </div>
        )}

        {!loading && !error && filteredParts.length > 0 && (
          <div className="space-y-2 pb-3">
            {filteredParts.map(part => (
              <div
                key={part.id}
                draggable={canEdit}
                onDragStart={(e) => handleDragStart(e, part)}
                onClick={() => handleInsertPart(part)}
                className={`p-3 rounded border cursor-pointer transition-colors ${
                  selectedPartId === part.id
                    ? darkMode
                      ? 'bg-blue-700 border-blue-600'
                      : 'bg-blue-100 border-blue-400'
                    : darkMode
                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {/* Thumbnail */}
                {part.thumbnail && (
                  <img
                    src={part.thumbnail}
                    alt={part.filename}
                    className="w-full h-32 object-contain mb-2 rounded bg-gray-200"
                  />
                )}

                {/* Filename */}
                <div className="font-medium text-sm truncate" title={part.filename}>
                  {part.filename}
                </div>

                {/* File Path */}
                <div className="text-xs text-gray-400 truncate mt-1" title={part.filepath}>
                  {part.filepath}
                </div>

                {/* Version */}
                <div className="text-xs text-gray-500 mt-1">
                  v{part.version}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`p-3 border-t text-xs text-gray-400 ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        {filteredParts.length} part{filteredParts.length !== 1 ? 's' : ''} available
        {canEdit && (
          <div className="mt-1">
            💡 Click or drag parts to insert
          </div>
        )}
      </div>
    </div>
  );
}
