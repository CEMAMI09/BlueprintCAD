import Link from 'next/link';
import { Folder } from '../types';
import { useState } from 'react';

interface FolderCardProps {
  folder: Folder;
  onDelete?: (id: number) => void;
  onMove?: (id: number) => void;
  onProjectDrop?: (projectId: number, folderId: number) => Promise<void>;
}

export default function FolderCard({ folder, onDelete, onMove, onProjectDrop }: FolderCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!onProjectDrop) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!onProjectDrop) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!onProjectDrop) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.projectId) {
        setIsProcessing(true);
        await onProjectDrop(data.projectId, folder.id);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Drop failed:', error);
      setIsProcessing(false);
    }
  };
  return (
    <Link href={`/folders/${folder.id}`}>
      <div 
        className={`bg-gray-900 border rounded-xl p-6 hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative ${
          isDragOver ? 'border-blue-500 border-2 bg-blue-500/10 scale-105' : 'border-gray-800 hover:border-gray-700'
        } ${
          isProcessing ? 'opacity-50 pointer-events-none' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-xl z-10">
            <div className="flex items-center gap-2 text-blue-400">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Moving...</span>
            </div>
          </div>
        )}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-500/5 rounded-xl pointer-events-none z-10">
            <div className="flex items-center gap-2 text-blue-400 font-medium">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Drop to move here</span>
            </div>
          </div>
        )}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: folder.color + '20' }}
            >
              {folder.is_team_folder ? (
                <svg className="w-6 h-6" style={{ color: folder.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" style={{ color: folder.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition">
                {folder.name}
              </h3>
              <p className="text-sm text-gray-400">by {folder.owner_username}</p>
            </div>
          </div>

          {folder.user_role === 'owner' && (onDelete || onMove) && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {onMove && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMove(folder.id);
                  }}
                  className="text-blue-400 hover:text-blue-300"
                  title="Move folder"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(folder.id);
                  }}
                  className="text-red-400 hover:text-red-300"
                  title="Delete folder"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {folder.description && (
          <p className="text-gray-400 text-sm mb-4 line-clamp-2">
            {folder.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4 text-gray-500">
            <span className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{folder.project_count || 0}</span>
            </span>
            {folder.is_team_folder && (
              <span className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>{folder.member_count || 0}</span>
              </span>
            )}
          </div>

          {folder.user_role && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
              {folder.user_role}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}