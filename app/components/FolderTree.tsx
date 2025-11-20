'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Folder {
  id: number;
  name: string;
  color: string;
  parent_id: number | null;
  is_team_folder: boolean;
  project_count: number;
  member_count: number;
  user_role?: string;
  children?: Folder[];
}

interface FolderTreeProps {
  onFolderSelect?: (folderId: number | null) => void;
  selectedFolderId?: number | null;
  showMoveTarget?: boolean;
  excludeFolderId?: number; // For move operations - exclude this folder and descendants
}

export default function FolderTree({ 
  onFolderSelect, 
  selectedFolderId,
  showMoveTarget = false,
  excludeFolderId
}: FolderTreeProps) {
  const router = useRouter();
  const [tree, setTree] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFolderTree();
  }, []);

  const fetchFolderTree = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/folders/tree', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setTree(data);
        
        // Auto-expand to selected folder
        if (selectedFolderId) {
          expandToFolder(selectedFolderId, data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch folder tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const expandToFolder = (folderId: number, folders: Folder[]) => {
    const newExpanded = new Set(expandedFolders);
    
    const findAndExpand = (folders: Folder[], targetId: number): boolean => {
      for (const folder of folders) {
        if (folder.id === targetId) {
          return true;
        }
        if (folder.children && folder.children.length > 0) {
          if (findAndExpand(folder.children, targetId)) {
            newExpanded.add(folder.id);
            return true;
          }
        }
      }
      return false;
    };
    
    findAndExpand(folders, folderId);
    setExpandedFolders(newExpanded);
  };

  const toggleExpand = (folderId: number) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFolderClick = (folder: Folder) => {
    if (showMoveTarget && onFolderSelect) {
      onFolderSelect(folder.id);
    } else {
      router.push(`/folders/${folder.id}`);
    }
  };

  const shouldExcludeFolder = (folder: Folder): boolean => {
    if (!excludeFolderId) return false;
    
    // Check if this is the excluded folder
    if (folder.id === excludeFolderId) return true;
    
    // Check if any children should be excluded (recursive)
    if (folder.children && folder.children.length > 0) {
      return folder.children.some(child => shouldExcludeFolder(child));
    }
    
    return false;
  };

  const renderFolder = (folder: Folder, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    const isSelected = selectedFolderId === folder.id;
    const isExcluded = shouldExcludeFolder(folder);
    
    if (isExcluded && showMoveTarget) {
      return null; // Don't render excluded folders in move mode
    }

    return (
      <div key={folder.id}>
        <div
          className={`
            flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition
            ${isSelected ? 'bg-blue-600/20 border-l-2 border-blue-500' : 'hover:bg-gray-800'}
            ${isExcluded ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => !isExcluded && handleFolderClick(folder)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center hover:bg-gray-700 rounded transition"
            >
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          
          {!hasChildren && <div className="w-5" />}
          
          <div
            className="w-5 h-5 rounded flex-shrink-0"
            style={{ backgroundColor: folder.color }}
          />
          
          <span className="flex-1 text-sm truncate">{folder.name}</span>
          
          {folder.is_team_folder && (
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )}
          
          <span className="text-xs text-gray-500 flex-shrink-0">
            {folder.project_count}
          </span>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {folder.children!.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="inline-block w-6 h-6 border-3 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Root level option for move target */}
      {showMoveTarget && (
        <div
          className={`
            flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition
            ${selectedFolderId === null ? 'bg-blue-600/20 border-l-2 border-blue-500' : 'hover:bg-gray-800'}
          `}
          onClick={() => onFolderSelect && onFolderSelect(null)}
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-sm">Root Level</span>
        </div>
      )}
      
      {tree.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No folders yet
        </div>
      ) : (
        tree.map(folder => renderFolder(folder))
      )}
    </div>
  );
}
