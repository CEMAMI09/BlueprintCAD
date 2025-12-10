'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface BreadcrumbFolder {
  id: number;
  name: string;
  color: string;
}

interface FolderBreadcrumbProps {
  folderId: number;
  onProjectMove?: (projectId: number, targetFolderId: number | null) => Promise<void>;
}

export default function FolderBreadcrumb({ folderId, onProjectMove }: FolderBreadcrumbProps) {
  const router = useRouter();
  const [path, setPath] = useState<BreadcrumbFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOverId, setDragOverId] = useState<number | null | 'root'>(null);

  useEffect(() => {
    fetchBreadcrumb();
  }, [folderId]);

  const fetchBreadcrumb = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/folders/${folderId}/breadcrumb`);
      if (res.ok) {
        const data = await res.json();
        setPath(data);
      }
    } catch (error) {
      console.error('Failed to fetch breadcrumb:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="w-16 h-4 bg-gray-800 rounded animate-pulse"></div>
      </div>
    );
  }

  const handleDrop = async (e: React.DragEvent, targetFolderId: number | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);

    if (!onProjectMove) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.projectId) {
        await onProjectMove(data.projectId, targetFolderId);
      }
    } catch (error) {
      console.error('Drop failed:', error);
    }
  };

  return (
    <nav className="flex items-center gap-2 text-sm overflow-x-auto">
      {/* Home/Root - Drop Zone */}
      <button
        onClick={() => router.push('/folders')}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverId('root');
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOverId(null);
        }}
        onDrop={(e) => handleDrop(e, null)}
        className={`flex items-center gap-1 px-2 py-1 rounded transition flex-shrink-0 ${
          dragOverId === 'root' 
            ? 'bg-blue-500/20 border-2 border-blue-500 scale-105' 
            : 'hover:bg-gray-800 border-2 border-transparent'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span>Folders</span>
        {dragOverId === 'root' && (
          <span className="text-xs text-blue-400 ml-1">📥</span>
        )}
      </button>

      {path.map((folder, index) => (
        <div key={folder.id} className="flex items-center gap-2 flex-shrink-0">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          
          <button
            onClick={() => router.push(`/folders/${folder.id}`)}
            onDragOver={(e) => {
              if (index !== path.length - 1) { // Don't allow dropping on current folder
                e.preventDefault();
                e.stopPropagation();
                setDragOverId(folder.id);
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOverId(null);
            }}
            onDrop={(e) => {
              if (index !== path.length - 1) {
                handleDrop(e, folder.id);
              }
            }}
            className={`
              flex items-center gap-2 px-2 py-1 rounded transition
              ${index === path.length - 1 ? 'font-medium border-2 border-transparent' : dragOverId === folder.id ? 'bg-blue-500/20 border-2 border-blue-500 scale-105' : 'hover:bg-gray-800 border-2 border-transparent'}
            `}
          >
            <div
              className="w-3 h-3 rounded flex-shrink-0"
              style={{ backgroundColor: folder.color }}
            />
            <span className="truncate max-w-[150px]">{folder.name}</span>
            {dragOverId === folder.id && index !== path.length - 1 && (
              <span className="text-xs text-blue-400">📥</span>
            )}
          </button>
        </div>
      ))}
    </nav>
  );
}
