/**
 * Folders Page - GitHub/Notion Hybrid
 * File management with tree navigation and version control
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CreateFolderModal from '@/components/CreateFolderModal';
import Link from 'next/link';
import {
  ThreePanelLayout,
  LeftPanel,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, SearchBar, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import {
  Folder,
  File,
  FileText,
  Plus,
  MoreVertical,
  Star,
  Download,
  Share2,
  Users,
  Clock,
  GitBranch,
  User,
  Calendar,
  Eye,
  Lock,
  Globe,
} from 'lucide-react';

interface FolderItem {
  id: string | number;
  name: string;
  type: 'folder' | 'file';
  size?: string;
  modified: string;
  owner: string;
  starred: boolean;
  visibility: 'private' | 'public';
  versions?: number;
  collaborators?: number;
  color?: string;
  is_team_folder?: boolean;
  project_count?: number;
  member_count?: number;
}

export default function FoldersPage() {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<FolderItem | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>(['My Projects']);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [items, setItems] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentParentId] = useState<number | null>(null);

  useEffect(() => {
    fetchFolders();
  }, [currentParentId]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = currentParentId 
        ? `/api/folders?parent_id=${currentParentId}`
        : '/api/folders';
      
      const res = await fetch(url, { headers });
      if (res.ok) {
        const folders = await res.json();
        // Transform API response to FolderItem format
        const transformedItems: FolderItem[] = folders.map((folder: any) => ({
          id: folder.id,
          name: folder.name,
          type: 'folder' as const,
          modified: folder.updated_at 
            ? formatTimeAgo(folder.updated_at) 
            : folder.created_at 
            ? formatTimeAgo(folder.created_at) 
            : 'Recently',
          owner: folder.owner_username || 'Unknown',
          starred: false,
          visibility: folder.is_team_folder ? 'public' : 'private',
          collaborators: folder.member_count || 0,
          color: folder.color || '#3b82f6',
          is_team_folder: folder.is_team_folder === 1,
          project_count: folder.project_count || 0,
          member_count: folder.member_count || 0,
        }));
        setItems(transformedItems);
      } else {
        console.error('Failed to fetch folders');
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    return date.toLocaleDateString();
  };

  const handleNewFolder = () => {
    setShowNewFolderModal(true);
  };

  const handleCreateFolder = async (folderData: any) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(folderData)
      });
      if (res.ok) {
        const newFolder = await res.json();
        // Refresh folders list
        await fetchFolders();
        // Close modal
        setShowNewFolderModal(false);
        // Optionally select the new folder
        setSelectedItem({
          id: newFolder.id,
          name: newFolder.name,
          type: 'folder',
          modified: 'Just now',
          owner: newFolder.owner_username || 'You',
          starred: false,
          visibility: newFolder.is_team_folder ? 'public' : 'private',
          collaborators: 0,
          color: newFolder.color,
          is_team_folder: newFolder.is_team_folder === 1,
        });
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder. Please try again.');
    }
  };

  const handleUploadFile = () => {
    // Navigate to upload page
    window.location.href = '/upload';
  };

  const handleFolderClick = (folder: FolderItem) => {
    // Navigate to folder detail page
    router.push(`/folders/${folder.id}`);
  };

  const handleBreadcrumbClick = (index: number) => {
    // Navigate back to folders page
    if (index === 0) {
      router.push('/folders');
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentActivity: any[] = [];

  const versions: any[] = [];

  return (
    <>
    <ThreePanelLayout
      leftPanel={<LeftPanel><GlobalNavSidebar /></LeftPanel>}
      centerPanel={
        <CenterPanel>
          <PanelHeader
            title="My Folders"
            actions={
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon={<Plus size={16} />} onClick={handleNewFolder}>
                  New Folder
                </Button>
                <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={handleUploadFile}>
                  Upload File
                </Button>
              </div>
            }
          />
          <PanelContent>
            <div className="max-w-7xl mx-auto px-6 py-6">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: DS.colors.text.secondary }}>
              {currentPath.map((part, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && <span>/</span>}
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className="hover:text-blue-400 transition"
                    style={{ color: index === currentPath.length - 1 ? DS.colors.text.primary : DS.colors.text.secondary }}
                  >
                    {part}
                  </button>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="mb-6">
              <SearchBar
                placeholder="Search files and folders..."
                onSearch={setSearchQuery}
                fullWidth
              />
            </div>

            {/* Items List */}
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : filteredItems.length === 0 ? (
                <EmptyState
                  icon={<Folder size={48} />}
                  title={searchQuery ? "No folders found" : "No folders yet"}
                  description={searchQuery ? "Try adjusting your search" : "Create your first folder to get started"}
                  action={
                    <Button 
                      variant="primary" 
                      icon={<Plus size={18} />}
                      onClick={handleNewFolder}
                    >
                      Create Folder
                    </Button>
                  }
                />
              ) : (
                filteredItems.map((item) => {
                const Icon = item.type === 'folder' ? Folder : FileText;
                const isSelected = selectedItem?.id === item.id;
                
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? DS.colors.background.elevated : DS.colors.background.card,
                      borderColor: isSelected ? DS.colors.primary.blue : DS.colors.border.default,
                    }}
                    onClick={() => item.type === 'folder' ? handleFolderClick(item) : setSelectedItem(item)}
                  >
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: item.type === 'folder' 
                          ? (item.color ? `${item.color}22` : `${DS.colors.primary.blue}22`)
                          : `${DS.colors.accent.cyan}22`,
                      }}
                    >
                      <Icon
                        size={20}
                        style={{
                          color: item.type === 'folder' 
                            ? (item.color || DS.colors.primary.blue)
                            : DS.colors.accent.cyan,
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className="font-medium truncate"
                          style={{ color: DS.colors.text.primary }}
                        >
                          {item.name}
                        </h3>
                        {item.starred && <Star size={14} fill={DS.colors.accent.warning} style={{ color: DS.colors.accent.warning }} />}
                        {item.visibility === 'private' ? (
                          <Lock size={14} style={{ color: DS.colors.text.tertiary }} />
                        ) : (
                          <Globe size={14} style={{ color: DS.colors.accent.success }} />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm" style={{ color: DS.colors.text.tertiary }}>
                        <span>{item.owner}</span>
                        {item.size && <span>{item.size}</span>}
                        <span>{item.modified}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {item.type === 'folder' && (
                        <>
                          {item.project_count !== undefined && item.project_count > 0 && (
                            <Badge variant="default" size="sm">
                              <FileText size={12} className="mr-1" />
                              {item.project_count}
                            </Badge>
                          )}
                          {item.collaborators !== undefined && item.collaborators > 0 && (
                            <Badge variant="default" size="sm">
                              <Users size={12} className="mr-1" />
                              {item.collaborators}
                            </Badge>
                          )}
                          {item.is_team_folder && (
                            <Badge variant="success" size="sm">
                              <Users size={12} className="mr-1" />
                              Team
                            </Badge>
                          )}
                        </>
                      )}
                      {item.type === 'file' && item.versions && (
                        <Badge variant="default" size="sm">
                          <GitBranch size={12} className="mr-1" />
                          v{item.versions}
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" icon={<MoreVertical size={16} />} />
                    </div>
                  </div>
                );
              }))}
            </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          {selectedItem ? (
            <>
              <PanelHeader title={selectedItem.type === 'folder' ? 'Folder Details' : 'File Details'} />
              <PanelContent>
                {/* Icon */}
                <div
                  className="w-full h-32 rounded-lg flex items-center justify-center mb-4"
                  style={{
                    backgroundColor: selectedItem.type === 'folder' ? `${DS.colors.primary.blue}22` : `${DS.colors.accent.cyan}22`,
                  }}
                >
                  {selectedItem.type === 'folder' ? (
                    <Folder size={64} style={{ color: DS.colors.primary.blue }} />
                  ) : (
                    <FileText size={64} style={{ color: DS.colors.accent.cyan }} />
                  )}
                </div>

                {/* Name */}
                <h3 className="text-lg font-bold mb-4" style={{ color: DS.colors.text.primary }}>
                  {selectedItem.name}
                </h3>

                {/* Metadata */}
                <div className="space-y-3 mb-6 text-sm" style={{ color: DS.colors.text.secondary }}>
                  <div className="flex items-center justify-between">
                    <span>Owner:</span>
                    <span className="font-medium" style={{ color: DS.colors.text.primary }}>
                      {selectedItem.owner}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Modified:</span>
                    <span className="font-medium" style={{ color: DS.colors.text.primary }}>
                      {selectedItem.modified}
                    </span>
                  </div>
                  {selectedItem.size && (
                    <div className="flex items-center justify-between">
                      <span>Size:</span>
                      <span className="font-medium" style={{ color: DS.colors.text.primary }}>
                        {selectedItem.size}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Visibility:</span>
                    <Badge variant={selectedItem.visibility === 'public' ? 'success' : 'default'} size="sm">
                      {selectedItem.visibility === 'public' ? <Globe size={12} className="mr-1" /> : <Lock size={12} className="mr-1" />}
                      {selectedItem.visibility}
                    </Badge>
                  </div>
                  {selectedItem.versions && (
                    <div className="flex items-center justify-between">
                      <span>Versions:</span>
                      <span className="font-medium" style={{ color: DS.colors.text.primary }}>
                        {selectedItem.versions}
                      </span>
                    </div>
                  )}
                  {selectedItem.collaborators && (
                    <div className="flex items-center justify-between">
                      <span>Collaborators:</span>
                      <span className="font-medium" style={{ color: DS.colors.text.primary }}>
                        {selectedItem.collaborators}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2 mb-6">
                  {selectedItem.type === 'file' && (
                    <Button variant="primary" fullWidth icon={<Download size={16} />} iconPosition="left">
                      Download
                    </Button>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="ghost" size="sm" icon={<Star size={16} />} />
                    <Button variant="ghost" size="sm" icon={<Share2 size={16} />} />
                    <Button variant="ghost" size="sm" icon={<MoreVertical size={16} />} />
                  </div>
                </div>

                {/* Version History (for files) */}
                {selectedItem.type === 'file' && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Version History
                    </h4>
                    <div className="space-y-3">
                      {versions.map((version, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg border"
                          style={{
                            backgroundColor: DS.colors.background.panel,
                            borderColor: DS.colors.border.subtle,
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="primary" size="sm">
                              {version.version}
                            </Badge>
                            <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                              {version.size}
                            </span>
                          </div>
                          <p className="text-sm mb-1" style={{ color: DS.colors.text.primary }}>
                            {version.message}
                          </p>
                          <div className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                            {version.author} • {version.date}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activity (for folders) */}
                {selectedItem.type === 'folder' && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Recent Activity
                    </h4>
                    <div className="space-y-3">
                      {recentActivity.map((activity, index) => (
                        <div key={index} className="text-sm">
                          <p style={{ color: DS.colors.text.primary }}>
                            <span className="font-medium">{activity.user}</span>{' '}
                            <span style={{ color: DS.colors.text.secondary }}>{activity.action}</span>{' '}
                            <span className="font-medium">{activity.file}</span>
                          </p>
                          <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                            {activity.time}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </PanelContent>
            </>
          ) : (
            <>
              <PanelHeader title="Quick Actions" />
              <PanelContent>
                <div className="space-y-2 mb-6">
                  <Button variant="primary" fullWidth icon={<Plus size={16} />} iconPosition="left">
                    New Folder
                  </Button>
                  <Button variant="secondary" fullWidth icon={<Plus size={16} />} iconPosition="left">
                    Upload File
                  </Button>
                </div>

                <div className="text-center py-8">
                  <EmptyState
                    icon={<Folder />}
                    title="No item selected"
                    description="Click on a file or folder to view details"
                  />
                </div>
              </PanelContent>
            </>
          )}
        </RightPanel>
      }
    />

      <CreateFolderModal 
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onSubmit={handleCreateFolder}
      />
    </>
  );
}